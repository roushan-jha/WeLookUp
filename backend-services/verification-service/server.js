import dotenv from 'dotenv';
import mongoose from 'mongoose';
import amqp from 'amqplib';
import { publishToQueue, initChannel } from './rabbitmq.js';

dotenv.config();

// ----------------------------------------------------
// Mongoose Model (MUST be exactly the same as in API Gateway)
// For simplicity, we define a minimal version here, but in production, 
// we would share a common package.
const ReviewSchema = new mongoose.Schema({
    verificationStatus: { type: String, enum: ['PENDING', 'VERIFIED', 'MANUAL_REVIEW', 'REJECTED'] },
    invoiceUrl: { type: String },
    // We only need the ID and the status for this service, but we use a full model
    // to interact with the existing collection.
});
const Review = mongoose.model('Review', ReviewSchema, 'reviews'); // Note the explicit collection name 'reviews'
// ----------------------------------------------------

const MONGODB_URI = process.env.MONGODB_URI;
const RABBITMQ_URL = process.env.RABBITMQ_URI;
const QUEUE_NAME = 'verification_queue';

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
    let connection;
    let channel;
    const maxRetries = 10;
    let retries = 0;

    // NEW: Connection Loop with Retries 
    while (!channel && retries < maxRetries) {
        try {
            console.log(`[MQ] Attempting to connect to RabbitMQ (Attempt ${retries + 1}/${maxRetries})...`);
            connection = await amqp.connect(RABBITMQ_URL);
            channel = await connection.createChannel();

            await initChannel(channel);
            
            break; // Success! Exit loop
        } catch (error) {
            retries++;
            if (retries >= maxRetries) {
                console.error("❌ RabbitMQ connection failed after maximum retries. Exiting service.");
                process.exit(1);
            }
            // Wait 3 seconds before the next retry
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }

    // --- Start consuming ONLY after a channel is established ---
    if (!channel) return; 

    try {
        await channel.assertQueue(QUEUE_NAME, { durable: true });
        console.log(`✅ Listening for messages in ${QUEUE_NAME}. To exit, press CTRL+C.`);

        channel.consume(QUEUE_NAME, async (msg) => {
            if (msg !== null) {
                const payload = JSON.parse(msg.content.toString());
                const { reviewId, invoiceUrl, clientProfileId } = payload;

                console.log(`[JOB] Processing Review ID: ${reviewId} (URL: ${invoiceUrl})`);

                // --- 1. SIMULATE Verification Logic ---
                await new Promise(resolve => setTimeout(resolve, 5000));

                const verificationResult = { status: 'VERIFIED', score: 98 }; 

                // --- 2. Update Database ---
                if (verificationResult.status === 'VERIFIED') {
                    await Review.findByIdAndUpdate(reviewId, {
                        verificationStatus: 'VERIFIED'
                    });
                    console.log(`[DONE] Review ${reviewId} successfully verified and status updated.`);

                    const scoringPayload = {
                        reviewId: reviewId,
                        clientProfileId: clientProfileId,
                        verificationStatus: 'VERIFIED',
                        // Note: For full scoring, the Scorer Service will fetch the entire Review record
                    };

                    await publishToQueue('scoring_queue', scoringPayload);
                }
                channel.ack(msg);
            }
        }, {
            noAck: false
        });

    } catch (error) {
        // This catch handles errors during consume/assert, not initial connection
        console.error("❌ RabbitMQ consumer failed:", error.message); 
    }
};

const runService = async () => {
    await connectDB();
    await startConsumer();
};

runService();