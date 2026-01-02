import amqp from "amqplib";

let channel = null;

/**
 * Connects to RabbitMQ.
 */
export const connectMQ = async () => {
  try {
    const connection = await amqp.connect(
      process.env.RABBITMQ_URI || "amqp://rabbitmq:5672"
    );
    channel = await connection.createChannel();
    console.log("✅ RabbitMQ Connection Established");
    return channel;
  } catch (error) {
    console.error("❌ RabbitMQ Connection Error:", error);
    throw error;
  }
};

/**
 * Initializes the channel (This is what the error was complaining about)
 */
export const initChannel = async (establishedChannel) => {
  channel = establishedChannel;
  // Ensure both queues exist
  await channel.assertQueue("verification_queue", { durable: true });
  await channel.assertQueue("scoring_queue", { durable: true });
};

/**
 * Publishes data to a specific queue
 */
export const publishToQueue = async (queueName, message) => {
  if (!channel) {
    console.error("❌ MQ Channel not initialized.");
    return;
  }
  channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), {
    persistent: true,
  });
};
