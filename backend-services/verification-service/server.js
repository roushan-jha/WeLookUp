import dotenv from "dotenv";
import mongoose from "mongoose";
import amqp from "amqplib";
import { publishToQueue, initChannel } from "./config/rabbitmq.js";

dotenv.config();

// ----------------------------------------------------
// Mongoose Model (Refined for Cross-Org Check)
// ----------------------------------------------------
const ReviewSchema = new mongoose.Schema({
  verificationStatus: {
    type: String,
    enum: ["PENDING", "VERIFIED", "MANUAL_REVIEW", "REJECTED"],
  },
  invoiceUrl: { type: String },
  invoiceNumber: { type: String },
});
const Review = mongoose.model("Review", ReviewSchema, "reviews");
// ----------------------------------------------------

const MONGODB_URI = process.env.MONGODB_URI;
const RABBITMQ_URL = process.env.RABBITMQ_URI;
const QUEUE_NAME = "verification_queue";

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Verification Service connected to MongoDB.");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1);
  }
};

const startConsumer = async () => {
  let channel;
  const maxRetries = 10;
  let retries = 0;

  while (!channel && retries < maxRetries) {
    try {
      console.log(
        `[MQ] Attempting to connect... (${retries + 1}/${maxRetries})`
      );

      // Use our new logic
      const connection = await amqp.connect(process.env.RABBITMQ_URI);
      channel = await connection.createChannel();

      // CALL THE EXPORTED FUNCTION
      await initChannel(channel);

      console.log("✅ Verification Worker Ready.");
      break;
    } catch (error) {
      retries++;
      await new Promise((res) => setTimeout(res, 3000));
    }
  }

  if (!channel) return;

  try {
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    console.log(`✅ Listening for messages in ${QUEUE_NAME}.`);

    channel.consume(QUEUE_NAME, async (msg) => {
      if (msg !== null) {
        const payload = JSON.parse(msg.content.toString());

        // 1. Destructure with default values or validation
        const {
          reviewId,
          invoiceNumber,
          reviewerDomain,
          targetDomain,
          clientProfileId, // Ensure this matches what Gateway sends
        } = payload;

        console.log(`[JOB] Auditing Review: ${reviewId}`);

        try {
          // 2. Fetch the actual Review to ensure data integrity
          const reviewDoc = await Review.findById(reviewId);

          if (!reviewDoc) {
            console.error(`❌ Review ${reviewId} not found in DB.`);
            return channel.ack(msg);
          }

          // 3. Logic: Anti-Fraud & Invoice Check (Your existing logic is good)
          if (reviewerDomain === targetDomain) {
            reviewDoc.verificationStatus = "REJECTED";
            await reviewDoc.save();
            console.log(`🚫 REJECTED: Internal review.`);
            return channel.ack(msg);
          }

          // SIMULATE OCR/GST CHECK
          await new Promise((resolve) => setTimeout(resolve, 2000));
          const isInvoiceLegit =
            invoiceNumber && !invoiceNumber.startsWith("FAKE");

          if (isInvoiceLegit) {
            // --- UPDATE DATABASE ---
            reviewDoc.verificationStatus = "VERIFIED";
            await reviewDoc.save();

            console.log(`✅ VERIFIED: Review ${reviewId}`);

            // --- SIGNAL SCORING SERVICE ---
            // USE STRINGS: This prevents ObjectID serialization issues in RabbitMQ
            const scoringPayload = {
              reviewId: reviewId.toString(),
              clientProfileId: clientProfileId.toString(),
              status: "VERIFIED",
            };

            await publishToQueue("scoring_queue", scoringPayload);
          } else {
            reviewDoc.verificationStatus = "MANUAL_REVIEW";
            await reviewDoc.save();
          }

          channel.ack(msg);
        } catch (dbError) {
          console.error("❌ DB/Logic Error:", dbError.message);
          channel.nack(msg, false, true);
        }
      }
    });
  } catch (error) {
    console.error("❌ RabbitMQ consumer failed:", error.message);
  }
};

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  await startConsumer();
};
run();
