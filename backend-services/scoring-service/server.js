import dotenv from "dotenv";
import mongoose from "mongoose";
import amqp from "amqplib";

dotenv.config();

// ----------------------------------------------------
// 1. Mongoose Models (Optimized for Scoring)
// ----------------------------------------------------

const ReviewSchema = new mongoose.Schema(
  {
    clientProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClientProfile",
    },
    paymentDelayDays: { type: Number, default: 0 },
    qualityOfService: Number,
    customerSupport: Number,
    onTimeDelivery: Number,
    valueForMoney: Number,
    communicationResponsiveness: Number,
    technicalExpertise: Number,
  },
  { timestamps: true }
);

const Review = mongoose.model("Review", ReviewSchema, "reviews");

const ClientProfileSchema = new mongoose.Schema({
  totalReviews: { type: Number, default: 0 },
  riskScore: { type: Number, default: 50 },
  lastUpdated: { type: Date, default: Date.now },
});

const ClientProfile = mongoose.model(
  "ClientProfile",
  ClientProfileSchema,
  "clientprofiles"
);

// ----------------------------------------------------
// 2. Core Scoring Logic (Weighted Moving Average)
// ----------------------------------------------------

const calculateRiskScore = (review, currentProfile) => {
  // Quality Score (70% weight)
  const qualityMetrics = [
    review.qualityOfService,
    review.customerSupport,
    review.onTimeDelivery,
    review.valueForMoney,
    review.communicationResponsiveness,
    review.technicalExpertise,
  ];
  const averageQuality =
    qualityMetrics.reduce((a, b) => a + b, 0) / qualityMetrics.length;

  // Payment Score (30% weight): Penalty for delays
  // 0 days = 5/5, 30+ days = 0/5
  const delayPenalty = Math.min(review.paymentDelayDays / 30, 1);
  const paymentScore = 5 * (1 - delayPenalty);

  // New Review Value (1-5 scale)
  const newReviewContribution = 0.7 * averageQuality + 0.3 * paymentScore;

  // Blending Logic: (Old Average * Old Count + New Value) / (New Count)
  const oldWeight = currentProfile.totalReviews;
  const oldScore5pt = currentProfile.riskScore / 20;

  const blendedScore5pt =
    (oldScore5pt * oldWeight + newReviewContribution) / (oldWeight + 1);

  // Convert to 100-point scale
  return Math.round(blendedScore5pt * 20);
};

// ----------------------------------------------------
// 3. Message Consumer
// ----------------------------------------------------

const startConsumer = async () => {
  const connection = await amqp.connect(process.env.RABBITMQ_URI);
  const channel = await connection.createChannel();
  const QUEUE_NAME = "scoring_queue";

  await channel.assertQueue(QUEUE_NAME, { durable: true });
  console.log(`✅ Scoring Service: Watching [${QUEUE_NAME}]`);

  channel.consume(QUEUE_NAME, async (msg) => {
    if (!msg) return;

    try {
      const rawData = msg.content.toString();
      const { reviewId, clientProfileId, status } = JSON.parse(rawData);

      console.log(
        `📥 Processing: Review[${reviewId}] for Profile[${clientProfileId}]`
      );

      if (status !== "VERIFIED") {
        console.log(`⚠️ Skipping: Status is ${status}`);
        return channel.ack(msg);
      }

      // 1. Safety Cast to ObjectId
      // This ensures that even if RabbitMQ sends a string, Mongoose queries correctly
      const rId = new mongoose.Types.ObjectId(reviewId);
      const pId = new mongoose.Types.ObjectId(clientProfileId);

      // 2. Fetch data
      const review = await Review.findById(rId);
      const profile = await ClientProfile.findById(pId);

      if (!review || !profile) {
        console.error("❌ Data Missing in Database:");
        console.error(
          `  - Review (${reviewId}): ${review ? "FOUND" : "NOT FOUND"}`
        );
        console.error(
          `  - Profile (${clientProfileId}): ${profile ? "FOUND" : "NOT FOUND"}`
        );
        return channel.ack(msg); // Ack anyway to clear the queue, or nack if you want to retry
      }

      // 3. Calculate new score
      const updatedScore = calculateRiskScore(review, profile);

      // 4. Atomic Update
      // Using { new: true } lets us see the change in the logs
      const updatedProfile = await ClientProfile.findByIdAndUpdate(
        pId,
        {
          $set: { riskScore: updatedScore, lastUpdated: new Date() },
          $inc: { totalReviews: 1 },
        },
        { new: true }
      );

      console.log(
        `✅ SUCCESS: ${updatedProfile.totalReviews} total reviews | New Risk Score: ${updatedProfile.riskScore}`
      );
      channel.ack(msg);
    } catch (err) {
      console.error(`❌ Scoring Service Error:`, err.message);
      // If it's a parsing error, ack it. If it's a DB error, nack it.
      channel.nack(msg, false, false);
    }
  });
};

// ----------------------------------------------------
// 4. Initialization
// ----------------------------------------------------
const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ DB Connected");
    await startConsumer();
  } catch (err) {
    console.error("Startup Failed:", err);
  }
};

run();
