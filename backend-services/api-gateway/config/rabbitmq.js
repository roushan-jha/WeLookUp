import amqp from "amqplib";

// Use the environment variable defined above
const RABBITMQ_URL = process.env.RABBITMQ_URI;

let connection;
let channel;

/**
 * Initializes the connection to RabbitMQ and creates the channel.
 */
const connectMQ = async (retries = 5) => {
  while (retries) {
    try {
      connection = await amqp.connect(RABBITMQ_URL);
      channel = await connection.createChannel();

      // Handle connection closure
      connection.on("error", (err) =>
        console.error("MQ Connection Error", err)
      );
      connection.on("close", () => {
        console.error("MQ Connection Closed. Reconnecting...");
        return connectMQ(); // Attempt to reconnect
      });

      console.log("✅ RabbitMQ connection successful.");
      await channel.assertQueue("verification_queue", { durable: true });
      return channel;
    } catch (error) {
      console.error(
        `❌ RabbitMQ connection failed. Retries left: ${retries - 1}`
      );
      retries -= 1;
      // Wait 5 seconds before next attempt
      await new Promise((res) => setTimeout(res, 5000));
    }
  }
  console.error("🛑 Could not connect to RabbitMQ after multiple attempts.");
};

/**
 * Publishes a message (task) to the specified queue.
 * @param {string} queueName
 * @param {object} message
 */
const publishToQueue = async (queueName, message) => {
  if (!channel) {
    console.error(
      `Cannot publish to ${queueName}: RabbitMQ channel not available.`
    );
    return;
  }

  // Ensure the message is serialized as a Buffer (JSON string)
  channel.sendToQueue(
    queueName,
    Buffer.from(JSON.stringify(message)),
    { persistent: true } // Message survives broker restart until processed
  );
  console.log(
    `[MQ] Message published to ${queueName} for Review ID: ${message.reviewId}`
  );
};

export { connectMQ, publishToQueue };
