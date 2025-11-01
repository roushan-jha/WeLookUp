import 'dotenv/config'; // Use /config for automatic loading in ES Modules
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';

// Import Mongoose Models (needed to ensure Mongoose knows about them)
// We import them here, even if they aren't used directly, to ensure Mongoose registers the schemas.
import './models/User.js'; 
import './models/ClientProfile.js';
import './models/Review.js';


const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

// --- 1. MongoDB Connection Function ---
const connectDB = async () => {
    if (!MONGO_URI) {
        console.error("❌ ERROR: MONGO_URI is not defined in the .env file.");
        process.exit(1);
    }
    
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ MongoDB connection successful (via Docker network).');

        // Optional: Check connection status
        const state = mongoose.connection.readyState;
        console.log(`Database state: ${state} (1 = Connected)`);

    } catch (err) {
        console.error('❌ MongoDB connection failed. Please check Docker containers and .env file.');
        console.error(`Error details: ${err.message}`);
        // Exit process on connection failure
        process.exit(1); 
    }
};


// --- 2. Express Server Setup ---

// Middleware: Body Parser (to read JSON data from requests)
app.use(express.json());

// Middleware: CORS (Allows frontend running on a different port to talk to the API)
// In a real microservice environment, you'd restrict 'origin' further.
app.use(cors({
    origin: '*', // Allow all origins for development
}));


// --- 3. Test Route (Verification) ---

app.get('/', (req, res) => {
    res.send({ message: 'API Gateway is running successfully.' });
});

// --- 4. API Routes ---
// Prefix all auth routes with /api/v1/auth
app.use('/api/v1/auth', authRoutes);

// Prefix all profile routes with /api/v1/profiles
app.use('/api/v1/profiles', profileRoutes);


// --- 5. Initialize Database and Start Server ---

const startServer = async () => {
    // 1. Connect to the database first
    await connectDB();

    // 2. Start the Express server after a successful DB connection
    app.listen(PORT, () => {
        console.log(`📡 API Gateway running on Local URL: http://localhost:${PORT}`);
    });
};

// Execute the initialization function
startServer();