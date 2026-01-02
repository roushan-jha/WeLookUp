import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import { connectMQ } from "./config/rabbitmq.js";

// ==========================================
// 1. MODEL REGISTRATION
// ==========================================
// Important: Register models before routes to prevent "Schema hasn't been registered" errors
import "./models/User.js";
import "./models/ClientProfile.js";
import "./models/Review.js";

// Import Routes
import authRoutes from "./routes/authRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";

const app = express();
const PORT = process.env.PORT || 8000;
const MONGO_URI = process.env.MONGO_URI;

// ==========================================
// 2. CORE MIDDLEWARE
// ==========================================
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// 3. SENIOR LOGGING MIDDLEWARE (FIXED)
// ==========================================
app.use((req, res, next) => {
  const requestStart = Date.now();

  console.log(`\n🚀 [${new Date().toISOString()}] ${req.method} ${req.url}`);

  // ADD OPTIONAL CHAINING OR CHECK IF req.body EXISTS
  if (req.method !== "GET" && req.body && Object.keys(req.body).length > 0) {
    console.log("📦 Payload:", JSON.stringify(req.body, null, 2));
  }

  res.on("finish", () => {
    const duration = Date.now() - requestStart;
    console.log(
      `✅ [RESPONSE] Status: ${res.statusCode} | Duration: ${duration}ms`
    );
  });

  next();
});

// ==========================================
// 4. DATABASE CONNECTION
// ==========================================
const connectDB = async () => {
  try {
    // Optimization: Standardize indexes for GSTIN and Domain lookups
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connection successful.");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }
};

// ==========================================
// 5. API ROUTES
// ==========================================
app.get("/health", (req, res) => {
  res.send({ status: "OK", service: "API Gateway", timestamp: new Date() });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/profiles", profileRoutes);
app.use("/api/v1/reviews", reviewRoutes);

// ==========================================
// 6. GLOBAL ERROR HANDLING
// ==========================================
app.use((err, req, res, next) => {
  console.error("⚠️ Server Error:", err.stack);
  res.status(err.status || 500).json({
    error: err.name || "Internal Server Error",
    message: err.message,
    // Hide stack trace in production
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// ==========================================
// 7. SERVER INITIALIZATION
// ==========================================
const startServer = async () => {
  try {
    await connectDB();
    await connectMQ(); // Initialize RabbitMQ connection for Verification & Scoring

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`\n📡 API Gateway running on http://localhost:${PORT}`);
      console.log(
        `🔧 Logic: Corporate Domain Locking & Verification Status Enabled`
      );
    });
  } catch (err) {
    console.error("❌ Fatal error during startup:", err);
    process.exit(1);
  }
};

startServer();
