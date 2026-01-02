import express from "express";
import mongoose from "mongoose";
import auth from "../middleware/auth.js";
import Review from "../models/Review.js";
import ClientProfile from "../models/ClientProfile.js";
import { cloudinary, upload } from "../config/cloudinaryConfig.js";
import { publishToQueue } from "../config/rabbitmq.js";

const router = express.Router();

// @route   POST api/v1/reviews
// @desc    Submit a new review with Anti-Fraud & Domain checks
// @access  Private (Corporate Users Only)
router.post("/", auth, upload.single("invoice"), async (req, res) => {
  const {
    clientProfileId,
    paymentDelayDays,
    reviewText,
    invoiceNumber,
    qualityOfService,
    customerSupport,
    onTimeDelivery,
    valueForMoney,
    communicationResponsiveness,
    technicalExpertise,
  } = req.body;

  const file = req.file;

  // Injected by your auth middleware (ensure your auth middleware decodes these from JWT)
  const userDomain = req.user.domain || req.user.email.split("@")[1];
  const userId = req.user.id || req.user._id;

  // 1. Validation: Ensure file exists
  if (!file) {
    return res
      .status(400)
      .json({ message: "Please upload an invoice as proof of transaction." });
  }

  // 2. Senior Guard: Check for corporate email (block public domains)
  const PUBLIC_DOMAINS = [
    "gmail.com",
    "yahoo.com",
    "outlook.com",
    "hotmail.com",
  ];
  if (PUBLIC_DOMAINS.includes(userDomain)) {
    return res.status(403).json({
      message:
        "Please use your official work email to submit business reviews.",
    });
  }

  try {
    // 3. Fetch target profile
    const targetProfile = await ClientProfile.findById(clientProfileId);
    if (!targetProfile) {
      return res.status(404).json({ message: "Client profile not found." });
    }

    // 4. ANTI-FRAUD: Conflict of Interest Check
    // Cannot review the company you work for
    if (userDomain === targetProfile.companyDomain) {
      return res.status(403).json({
        message:
          "Internal reviews are prohibited to maintain platform integrity.",
      });
    }

    // 5. Upload Invoice to Cloudinary using Stream (Handles Multer MemoryStorage)
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "welookup-invoices",
          resource_type: "auto",
          public_id: `inv_${invoiceNumber}_${Date.now()}`,
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      uploadStream.end(file.buffer);
    });

    // 6. Create Review Record (Initial state: PENDING)
    const newReview = new Review({
      submittedBy: userId,
      reviewerDomain: userDomain,
      clientProfile: clientProfileId,
      invoiceNumber,
      paymentDelayDays: parseInt(paymentDelayDays) || 0,
      reviewText: reviewText,
      qualityOfService: parseFloat(qualityOfService),
      customerSupport: parseFloat(customerSupport),
      onTimeDelivery: parseFloat(onTimeDelivery),
      valueForMoney: parseFloat(valueForMoney),
      communicationResponsiveness: parseFloat(communicationResponsiveness),
      technicalExpertise: parseFloat(technicalExpertise),
      invoiceUrl: result.secure_url,
      verificationStatus: "PENDING",
    });

    await newReview.save();

    // 7. PUBLISH TO VERIFICATION SERVICE (RabbitMQ)
    const verificationPayload = {
      reviewId: newReview._id.toString(),
      clientProfileId: clientProfileId,
      invoiceUrl: newReview.invoiceUrl,
      invoiceNumber: newReview.invoiceNumber,
      reviewerDomain: userDomain,
      targetDomain: targetProfile.companyDomain,
      gstin: targetProfile.gstin,
    };

    await publishToQueue("verification_queue", verificationPayload);

    // 8. RESPONSE
    res.status(201).json({
      success: true,
      message:
        "Review submitted. It will be public once verified by our system.",
      review: newReview.toObject({ virtuals: true }), // Include overallRating virtual
    });
  } catch (err) {
    console.error("❌ Review submission error:", err);
    res.status(500).json({ error: "Server error during review submission." });
  }
});

// @route   GET api/v1/reviews/profile/:profileId
// @desc    Get verified reviews for a profile
// @access  Private
router.get("/profile/:profileId", auth, async (req, res) => {
  try {
    const { profileId } = req.params;
    let targetObjectId;

    // 1. Resolve profileId to a MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(profileId)) {
      targetObjectId = profileId;
    } else {
      // Look up by clientId if it's not a hex ID
      const profile = await ClientProfile.findOne({ clientId: profileId });
      if (!profile) {
        return res.status(404).json({ message: "Client profile not found." });
      }
      targetObjectId = profile._id;
    }

    // 2. Fetch all verified reviews for that specific profile
    const reviews = await Review.find({
      clientProfile: targetObjectId,
      verificationStatus: "VERIFIED",
    })
      .populate("submittedBy", "name domain")
      .sort({ createdAt: -1 });

    res.json({
      count: reviews.length,
      reviews: reviews,
    });
  } catch (err) {
    console.error("❌ Error fetching reviews for profile:", err.message);
    res.status(500).send("Server Error fetching reviews");
  }
});

// @route   GET api/v1/reviews/mine
// @desc    Get all reviews submitted by the current authenticated user
// @access  Private
router.get("/mine", auth, async (req, res) => {
  try {
    // 1. req.user.id is provided by your 'auth' middleware
    const userId = req.user.id;

    // 2. Fetch all reviews by this user, including the name of the company they reviewed
    const myReviews = await Review.find({ submittedBy: userId })
      .populate("clientProfile", "companyName companyDomain") // Show who they reviewed
      .sort({ createdAt: -1 }); // Newest first

    res.json({
      success: true,
      count: myReviews.length,
      data: myReviews,
    });
  } catch (err) {
    console.error("❌ My Reviews Error:", err.message);
    res.status(500).json({ error: "Server Error fetching your reviews" });
  }
});

export default router;
