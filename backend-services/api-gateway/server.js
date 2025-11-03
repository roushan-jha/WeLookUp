import 'dotenv/config'; // Use /config for automatic loading in ES Modules
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { connectMQ } from './config/rabbitmq.js';

import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';

// Import Mongoose Models (needed to ensure Mongoose knows about them)
// We import them here, even if they aren't used directly, to ensure Mongoose registers the schemas.
import './models/User.js'; 
import './models/ClientProfile.js';
import './models/Review.js';


const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

// Enhanced request logger for debugging
app.use((req, res, next) => {
    const requestStart = Date.now();
    
    // Log request details
    try {
        const shortHeaders = {
            host: req.headers.host,
            origin: req.headers.origin,
            ua: req.headers['user-agent'],
            auth: !!req.headers['x-auth-token'],
            contentType: req.headers['content-type'],
            accept: req.headers.accept,
        };
        console.log('\n[REQUEST]', {
            timestamp: new Date().toISOString(),
            method: req.method,
            url: req.originalUrl || req.url,
            headers: shortHeaders,
            body: req.method !== 'GET' ? req.body : undefined,
            ip: req.ip,
            protocol: req.protocol,
        });
    } catch (e) {
        console.warn('Failed to log request details:', e);
    }

    // Log response details
    res.on('finish', () => {
        try {
            const duration = Date.now() - requestStart;
            console.log('[RESPONSE]', {
                timestamp: new Date().toISOString(),
                method: req.method,
                url: req.originalUrl || req.url,
                status: res.statusCode,
                duration: duration + 'ms',
            });
        } catch (e) {
            console.warn('Failed to log response details:', e);
        }
    });

    next();
});

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

// Prefix all review routes with /api/v1/reviews
app.use('/api/v1/reviews', reviewRoutes);


// --- 5. Error Handling ---

// Error middleware
app.use((err, req, res, next) => {
    console.error('⚠️ Error in middleware:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    if (!err.message.includes('EADDRINUSE')) {
        process.exit(1);
    }
});

process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err);
    process.exit(1);
});

// --- 6. Initialize Database and Start Server ---

const startServer = async () => {
    try {
        console.log('\nStarting API Gateway...');
        console.log('Environment:', {
            NODE_ENV: process.env.NODE_ENV,
            PORT: process.env.PORT,
            MONGO_URI: process.env.MONGO_URI?.replace(/(mongodb:\/\/[^:]+:)[^@]+@/, '$1****@'),
            RABBITMQ_URI: process.env.RABBITMQ_URI?.replace(/(amqp:\/\/[^:]+:)[^@]+@/, '$1****@'),
        });
        
        // 1. Connect to the database first
        try {
            await connectDB();
            console.log('✅ Database connection maintained');
        } catch (err) {
            console.error('❌ MongoDB connection failed:', err);
            throw err;
        }
        
        try {
            await connectMQ(); // Initialize RabbitMQ connection
            console.log('✅ RabbitMQ connection maintained');
        } catch (err) {
            console.error('❌ RabbitMQ connection failed:', err);
            throw err;
        }

        // 2. Check if port is available
        const net = await import('net');
        console.log(`\nChecking port ${PORT} availability...`);
        
        await new Promise((resolve, reject) => {
            const tester = net.createServer()
                .once('error', err => {
                    if (err.code === 'EADDRINUSE') {
                        console.error(`❌ Port ${PORT} is already in use`);
                        reject(err);
                    } else {
                        console.error(`❌ Port check failed:`, err);
                        reject(err);
                    }
                })
                .once('listening', () => {
                    console.log(`✅ Port ${PORT} is available`);
                    tester.once('close', () => resolve())
                        .close();
                })
                .listen(PORT, '0.0.0.0');
            
            // Add timeout
            setTimeout(() => {
                tester.close();
                reject(new Error('Port check timed out'));
            }, 5000);
        });

        // 3. Start the Express server after successful checks
        console.log('\nStarting HTTP server...');
        
        const server = app.listen(PORT, '0.0.0.0');

        await new Promise((resolve, reject) => {
            server.once('error', (err) => {
                console.error('❌ Server startup error:', err);
                reject(err);
            });

            server.once('listening', () => {
                const addr = server.address();
                console.log(`\n📡 API Gateway running on http://${addr.address}:${addr.port}`);
                console.log('\nRoutes enabled:');
                console.log('- GET  /', '(health check)');
                console.log('- POST /api/v1/auth/login');
                console.log('- POST /api/v1/auth/register');
                console.log('- POST /api/v1/auth/logout');
                console.log('- GET  /api/v1/profiles');
                
                // Log successful startup
                console.log('\nServer startup complete with:');
                console.log('- MongoDB connected');
                console.log('- RabbitMQ connected');
                console.log('- HTTP server listening');
                
                // Show test commands
                console.log('\nTest commands:');
                console.log('curl -v http://127.0.0.1:3000/');
                console.log('curl -v -X POST http://127.0.0.1:3000/api/v1/auth/login -H "Content-Type: application/json" -d \'{"email":"test@example.com","password":"password"}\'\n');
                
                resolve();
            });

            // Add timeout
            setTimeout(() => {
                reject(new Error('Server startup timed out'));
            }, 10000);
        });

        // Monitor server errors
        server.on('error', (err) => {
            console.error('❌ Server error:', err);
            if (err.code === 'EADDRINUSE') {
                console.error('Port is already in use. Retrying in 1 second...');
                setTimeout(() => {
                    server.close();
                    server.listen(PORT, '127.0.0.1');
                }, 1000);
            } else {
                process.exit(1);
            }
        });

        // Add a test request every 30 seconds to verify server is responsive
        setInterval(async () => {
            try {
                console.log('\nHealth check...');
                const response = await fetch('http://localhost:' + PORT + '/');
                const data = await response.json();
                console.log('✅ Health check passed:', data);
            } catch (err) {
                console.error('❌ Health check failed:', err);
            }
        }, 30000);

    } catch (err) {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
    }
};

// Execute the initialization function
startServer().catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
});