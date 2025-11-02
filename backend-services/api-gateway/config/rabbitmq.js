import amqp from 'amqplib';

// Use the environment variable defined above
const RABBITMQ_URL = process.env.RABBITMQ_URI;

let connection;
let channel;

/**
 * Initializes the connection to RabbitMQ and creates the channel.
 */
const connectMQ = async () => {
    try {
        connection = await amqp.connect(RABBITMQ_URL);
        channel = await connection.createChannel();
        console.log("✅ RabbitMQ connection successful.");

        // Assert the queue name for invoice verification. Durable ensures it survives a broker restart.
        await channel.assertQueue('verification_queue', { durable: true });

        return channel;
    } catch (error) {
        console.error("❌ RabbitMQ connection failed:", error.message);
        // Do NOT block server startup if MQ is down, but log the severe issue
    }
};

/**
 * Publishes a message (task) to the specified queue.
 * @param {string} queueName 
 * @param {object} message 
 */
const publishToQueue = async (queueName, message) => {
    if (!channel) {
        console.error(`Cannot publish to ${queueName}: RabbitMQ channel not available.`);
        return;
    }
    
    // Ensure the message is serialized as a Buffer (JSON string)
    channel.sendToQueue(
        queueName, 
        Buffer.from(JSON.stringify(message)), 
        { persistent: true } // Message survives broker restart until processed
    );
    console.log(`[MQ] Message published to ${queueName} for Review ID: ${message.reviewId}`);
};

export { connectMQ, publishToQueue };