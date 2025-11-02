import dotenv from 'dotenv';
import mongoose from 'mongoose';
import amqp from 'amqplib';

dotenv.config();

// ----------------------------------------------------
// Mongoose Models (Minimal Definitions for Scoring Service)
// ----------------------------------------------------

// 1. Review Model (Need full ratings for calculation)
const ReviewSchema = new mongoose.Schema({
    clientProfile: { type: mongoose.Schema.Types.ObjectId, ref: 'ClientProfile' },
    paymentDelayDays: { type: Number },
    qualityOfService: { type: Number },
    customerSupport: { type: Number },
    onTimeDelivery: { type: Number },
    valueForMoney: { type: Number },
    communicationResponsiveness: { type: Number },
    technicalExpertise: { type: Number },
});
const Review = mongoose.model('Review', ReviewSchema, 'reviews'); 

// 2. ClientProfile Model (Need existing score/counts for updates)
const ClientProfileSchema = new mongoose.Schema({
    totalReviews: { type: Number, default: 0 },
    riskScore: { type: Number, default: 100 }, // Score out of 100 (100 is excellent)
    totalDelayDays: { type: Number, default: 0 }, // Used for average calculation
});
const ClientProfile = mongoose.model('ClientProfile', ClientProfileSchema, 'clientprofiles'); 
// ----------------------------------------------------

const MONGODB_URI = process.env.MONGODB_URI;
const RABBITMQ_URL = process.env.RABBITMQ_URI;
const QUEUE_NAME = 'scoring_queue';

const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("✅ Scoring Service connected to MongoDB.");
    } catch (error) {
        console.error("❌ MongoDB connection error:", error.message);
        process.exit(1);
    }
};

// Simplified retry logic, assuming the previous service established stability
const connectToMQ = async () => {
    let connection;
    let channel;
    try {
        connection = await amqp.connect(RABBITMQ_URL);
        channel = await connection.createChannel();
        await channel.assertQueue(QUEUE_NAME, { durable: true });
        console.log(`✅ Listening for messages in ${QUEUE_NAME}.`);
        return channel;
    } catch (error) {
        console.error("❌ RabbitMQ connection failed:", error.message);
        process.exit(1);
    }
};

// --- CORE SCORING LOGIC ---
const calculateRiskScore = (review, currentProfile) => {
    // Risk Score Logic: 
    // 1. Service Quality: Average of all 6 ratings (weights 70%)
    // 2. Payment Delay: DelayDays vs. TotalDays (weights 30%)
    
    // Step 1: Quality Score (70% weight)
    const totalQualityRatings = review.qualityOfService + review.customerSupport + review.onTimeDelivery + review.valueForMoney + review.communicationResponsiveness + review.technicalExpertise;
    const averageQuality = totalQualityRatings / 6; // Max 5

    // Step 2: Payment Delay Factor (30% weight)
    // We penalize based on payment delay. Assume max tolerable delay is 30 days.
    const maxPenaltyDays = 30; 
    let delayPenalty = Math.min(review.paymentDelayDays / maxPenaltyDays, 1); // 0 to 1
    // Invert the penalty: 1 is good, 0 is max penalty
    let paymentScore = 5 * (1 - delayPenalty); // Score 0 to 5

    // Calculate New Overall Score based on the new review's contribution
    // We use a blend of the average quality and the payment score (5-point scale)
    const newScoreContribution = (0.7 * averageQuality) + (0.3 * paymentScore); // Max 5

    // To prevent the score from fluctuating wildly, we use a weighted average 
    // blending the old score and the new score.
    const oldWeight = currentProfile.totalReviews; // Number of existing reviews
    const newWeight = 1;

    // Convert old RiskScore (out of 100) to 5-point scale for blending
    const oldScore5pt = currentProfile.riskScore / 20; 

    // Blended Score (still on 5-point scale)
    const blendedScore5pt = ((oldScore5pt * oldWeight) + (newScoreContribution * newWeight)) / (oldWeight + newWeight);

    // Convert back to 100-point scale
    const newRiskScore = Math.round(blendedScore5pt * 20);

    return Math.max(0, Math.min(100, newRiskScore)); // Keep score between 0 and 100
};

const startConsumer = async (channel) => {
    channel.consume(QUEUE_NAME, async (msg) => {
        if (msg !== null) {
            const payload = JSON.parse(msg.content.toString());
            const { reviewId, clientProfileId, verificationStatus } = payload;
            
            console.log(`[JOB] Consuming scoring task for Review ID: ${reviewId}`);
            
            try {
                // 1. Fetch Review Data
                const review = await Review.findById(reviewId);
                if (!review) throw new Error("Review not found for scoring.");

                // 2. Fetch Client Profile (Needed for existing score and review count)
                const currentProfile = await ClientProfile.findById(clientProfileId);
                if (!currentProfile) throw new Error("Client Profile not found for scoring.");

                // Check verification status (should be VERIFIED from previous service)
                if (verificationStatus !== 'VERIFIED') {
                    console.log(`[SKIP] Review ${reviewId} not verified. Skipping score update.`);
                    channel.ack(msg);
                    return;
                }

                // 3. Calculate New Risk Score
                const newRiskScore = calculateRiskScore(review, currentProfile);
                
                // 4. Update Client Profile
                await ClientProfile.findByIdAndUpdate(clientProfileId, {
                    riskScore: newRiskScore,
                    // Note: totalReviews was already incremented by the API Gateway
                    // $inc: { totalDelayDays: review.paymentDelayDays } // Future update: track total delay days
                });

                console.log(`[DONE] Client ${clientProfileId}: Score updated to ${newRiskScore}.`);
                channel.ack(msg);
                
            } catch (err) {
                console.error(`[ERROR] Scoring failed for Review ${reviewId}:`, err.message);
                // Nack the message to requeue or send to a Dead Letter Queue (DLQ)
                channel.nack(msg, false, true); 
            }
        }
    }, {
        noAck: false // Manual acknowledgment
    });
};

const runService = async () => {
    await connectDB();
    const channel = await connectToMQ();
    await startConsumer(channel);
};

runService();