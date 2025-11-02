let channel;

/**
 * Initializes the channel from the connection established in server.js.
 * This prevents repeated, failing connection attempts.
 * @param {object} establishedChannel - The channel created during service startup.
 */
const initChannel = async (establishedChannel) => {
    channel = establishedChannel;
    // Assert the scoring queue only once during initialization
    await channel.assertQueue('scoring_queue', { durable: true });
};

/**
 * Publishes a task to the specified queue.
 */
const publishToQueue = async (queueName, message) => {
    if (!channel) {
        // If somehow channel is missing, log error (should be handled by initChannel)
        console.error("❌ RabbitMQ Channel not initialized for publishing.");
        return; 
    }
    
    channel.sendToQueue(
        queueName, 
        Buffer.from(JSON.stringify(message)), 
        { persistent: true }
    );
    console.log(`[MQ] Task published to ${queueName} for Review ID: ${message.reviewId}`);
};

// Export both the publisher and the initializer
export { publishToQueue, initChannel };