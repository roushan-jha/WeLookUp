import express from "express";
import mongoose from "mongoose";
import auth from "../middleware/auth.js";
import ClientProfile from "../models/ClientProfile.js";
import Review from "../models/Review.js";

const router = express.Router();

// List of public email providers to block for company registration
const PUBLIC_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
];

// @route   POST api/v1/profiles
// @desc    Create or update a client profile with domain locking
// @access  Private (Requires x-auth-token)
router.post("/", auth, async (req, res) => {
  const { clientId, companyName, gstin, category } = req.body;

  try {
    // 1. Senior Guard: Check for Corporate Email Requirement
    const userDomain = req.user.domain; // Extracted by auth middleware from User model
    if (!userDomain || PUBLIC_DOMAINS.includes(userDomain.toLowerCase())) {
      return res.status(403).json({
        message:
          "Action Denied: You must use a verified corporate email to list or manage a company profile.",
      });
    }

    // 2. Data Preparation
    const profileFields = {
      clientId,
      companyName: companyName?.trim(),
      category: category || "Other",
      gstin: gstin?.trim().toUpperCase(),
      companyDomain: userDomain, // Lock the profile to the user's organization domain
      createdBy: req.user.id,
    };

    if (!clientId || !companyName || !gstin) {
      return res
        .status(400)
        .json({ message: "clientId, companyName, and gstin are required" });
    }

    // 3. Logic: Check if profile exists (by clientId OR gstin)
    // We check both because GSTIN is the unique legal id
    let profile = await ClientProfile.findOne({
      $or: [{ clientId }, { gstin: gstin.trim().toUpperCase() }],
    });

    if (profile) {
      // 4. Ownership Verification
      // Only users from the SAME DOMAIN can update, and specifically the creator (or an admin)
      if (profile.companyDomain !== userDomain) {
        return res.status(403).json({
          message:
            "Conflict: This company is already managed by another organization.",
        });
      }

      if (
        profile.createdBy.toString() !== req.user.id &&
        req.user.role !== "Admin"
      ) {
        return res.status(403).json({
          message:
            "Unauthorized: Only the profile creator or an admin can modify these details.",
        });
      }

      // Update existing profile
      profile = await ClientProfile.findOneAndUpdate(
        { _id: profile._id },
        { $set: profileFields },
        { new: true },
      );
      return res.json({ message: "Profile updated successfully", profile });
    }

    // 5. Create new profile
    profile = new ClientProfile(profileFields);
    await profile.save();

    // NOTE: In a full microservices setup, you'd trigger a RabbitMQ event
    // here for the 'Verification Service' to validate the GSTIN.

    res
      .status(201)
      .json({ message: "Profile created and pending verification", profile });
  } catch (err) {
    console.error("❌ Profile Route Error:", err.message);
    if (err.code === 11000) {
      return res.status(400).json({
        message:
          "Duplicate Error: A profile with this ID or GSTIN already exists.",
      });
    }
    res.status(500).json({ error: "Server Error", details: err.message });
  }
});

// @route   GET api/v1/profiles
// @desc    Get all client profiles (Scrubbed for public view if needed)
// @access  Private (but could be Public depending on your frontend needs)
router.get("/", auth, async (req, res) => {
  try {
    const profiles = await ClientProfile.find()
      .populate("createdBy", "name email domain") // Include domain to show org association
      .sort({ createdAt: -1 });

    res.json(profiles);
  } catch (err) {
    console.error("Error fetching profiles:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

// @route   GET api/v1/profiles/:id
// @desc    Get a specific profile by ID, Company Code, or Domain
// @access  Public (or Private with 'auth' middleware)
router.get("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    let profile;

    // 1. Check if the id is a valid MongoDB ObjectId
    const isObjectId = mongoose.Types.ObjectId.isValid(id);

    if (isObjectId) {
      profile = await ClientProfile.findById(id);
    } else {
      // 2. If not an ID, search by clientId (e.g., CLI-APPLE-001) or companyDomain
      profile = await ClientProfile.findOne({
        $or: [{ clientId: id }, { companyDomain: id.toLowerCase() }],
      });
    }

    if (!profile) {
      return res.status(404).json({ message: "Client profile not found." });
    }

    res.json(profile);
  } catch (err) {
    console.error("❌ Error fetching profile:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

// @route   GET api/v1/profiles/:id/stats
// @desc    Get detailed rating breakdown and payment performance
router.get("/:id/stats", async (req, res) => {
  try {
    const { id } = req.params;
    let profileId;

    // 1. Resolve id to a MongoDB _id
    if (mongoose.Types.ObjectId.isValid(id)) {
      profileId = new mongoose.Types.ObjectId(id);
    } else {
      const profile = await ClientProfile.findOne({ clientId: id });
      if (!profile)
        return res.status(404).json({ message: "Profile not found" });
      profileId = profile._id;
    }

    // 2. Now run aggregation using the resolved profileId
    const stats = await Review.aggregate([
      { $match: { clientProfile: profileId, verificationStatus: "VERIFIED" } },
      {
        $group: {
          _id: "$clientProfile",
          avgQuality: { $avg: "$qualityOfService" },
          avgSupport: { $avg: "$customerSupport" },
          avgDelivery: { $avg: "$onTimeDelivery" },
          avgValue: { $avg: "$valueForMoney" },
          avgResponsiveness: { $avg: "$communicationResponsiveness" },
          avgTechnical: { $avg: "$technicalExpertise" },
          avgPaymentDelay: { $avg: "$paymentDelayDays" },
          totalVerifiedReviews: { $sum: 1 },
        },
      },
    ]);

    if (!stats || stats.length === 0) {
      return res.status(404).json({ message: "No verified reviews found." });
    }

    const result = stats[0];
    res.json({
      performanceMetrics: {
        qualityOfService: Number(result.avgQuality.toFixed(1)),
        customerSupport: Number(result.avgSupport.toFixed(1)),
        onTimeDelivery: Number(result.avgDelivery.toFixed(1)),
        valueForMoney: Number(result.avgValue.toFixed(1)),
        communicationResponsiveness: Number(
          result.avgResponsiveness.toFixed(1),
        ),
        technicalExpertise: Number(result.avgTechnical.toFixed(1)),
      },
      paymentAnalytics: {
        averageDelayDays: Math.round(result.avgPaymentDelay),
        reliabilityRating: result.avgPaymentDelay <= 5 ? "High" : "Medium",
      },
      sampleSize: result.totalVerifiedReviews,
    });
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

// @route   GET api/v1/profiles/:id/sentiment
// @desc    On-demand sentiment summary (ratings + simple text analysis)
router.get("/:id/sentiment", async (req, res) => {
  try {
    const { id } = req.params;
    let profileId;

    if (mongoose.Types.ObjectId.isValid(id)) {
      profileId = id;
    } else {
      const profile = await ClientProfile.findOne({ clientId: id });
      if (!profile)
        return res.status(404).json({ message: "Profile not found" });
      profileId = profile._id;
    }

    // Fetch verified reviews
    const reviews = await Review.find({
      clientProfile: profileId,
      verificationStatus: "VERIFIED",
    })
      .select(
        "reviewText qualityOfService customerSupport onTimeDelivery valueForMoney communicationResponsiveness technicalExpertise paymentDelayDays",
      )
      .lean();

    if (!reviews || reviews.length === 0) {
      return res.json({
        summary: "No data to summarize",
        ratingLabel: "No ratings",
        textLabel: "No text reviews",
      });
    }

    // Compute average rating across defined numeric fields
    const ratingFields = [
      "qualityOfService",
      "customerSupport",
      "onTimeDelivery",
      "valueForMoney",
      "communicationResponsiveness",
      "technicalExpertise",
    ];

    let total = 0;
    let count = 0;
    for (const r of reviews) {
      let sum = 0;
      let n = 0;
      for (const f of ratingFields) {
        const v = Number(r[f] ?? NaN);
        if (!Number.isNaN(v) && v > 0) {
          sum += v;
          n += 1;
        }
      }
      if (n > 0) {
        total += sum / n;
        count += 1;
      }
    }
    const avg = count > 0 ? total / count : 0;

    let ratingLabel = "No ratings";
    if (!Number.isNaN(avg) && count > 0) {
      if (avg >= 4.5) ratingLabel = "Overwhelmingly Positive";
      else if (avg >= 4) ratingLabel = "Mostly Positive";
      else if (avg >= 3) ratingLabel = "Mixed";
      else if (avg >= 2) ratingLabel = "Mostly Negative";
      else ratingLabel = "Overwhelmingly Negative";
    }

    // Basic text sentiment lexicon
    const pos = new Set([
      "good",
      "great",
      "excellent",
      "positive",
      "reliable",
      "recommend",
      "fast",
      "professional",
      "trust",
    ]);
    const neg = new Set([
      "bad",
      "poor",
      "late",
      "delay",
      "unreliable",
      "fraud",
      "scam",
      "slow",
    ]);
    let textScore = 0;
    let texts = 0;
    for (const r of reviews) {
      if (!r.reviewText) continue;
      texts++;
      const toks = String(r.reviewText)
        .toLowerCase()
        .split(/[^a-z]+/)
        .filter(Boolean);
      let s = 0;
      for (const t of toks) {
        if (pos.has(t)) s += 1;
        if (neg.has(t)) s -= 1;
      }
      textScore += Math.sign(s);
    }
    const textLabel =
      texts === 0
        ? "No text reviews"
        : textScore / Math.max(1, texts) >= 0.5
          ? "Positive"
          : textScore / Math.max(1, texts) >= 0
            ? "Mixed"
            : "Negative";

    // Combine
    let combined = ratingLabel;
    if (ratingLabel === "No ratings" && textLabel === "No text reviews")
      combined = "No data to summarize";
    else if (ratingLabel.includes("Overwhelmingly") && textLabel === "Positive")
      combined = "Overwhelmingly Positive";
    else if (
      ratingLabel.includes("Mostly Positive") &&
      (textLabel === "Positive" || textLabel === "Mixed")
    )
      combined = "Mostly Positive";
    else if (ratingLabel === "Mixed" || textLabel === "Mixed")
      combined = "Mixed";
    else if (ratingLabel.includes("Negative") || textLabel === "Negative")
      combined = "Mostly Negative";

    return res.json({ summary: combined, ratingLabel, textLabel });
  } catch (err) {
    console.error("❌ Sentiment error:", err?.message || err);
    res.status(500).json({ error: "Server Error computing sentiment" });
  }
});

// @route   GET api/v1/profiles/:id/reviews
// @desc    Get all verified reviews for a specific company
router.get("/:id/reviews", async (req, res) => {
  try {
    const { id } = req.params;
    let profileId;

    // 1. Resolve id
    if (mongoose.Types.ObjectId.isValid(id)) {
      profileId = id;
    } else {
      const profile = await ClientProfile.findOne({ clientId: id });
      if (!profile)
        return res.status(404).json({ message: "Profile not found" });
      profileId = profile._id;
    }

    // 2. Fetch reviews
    const reviews = await Review.find({
      clientProfile: profileId,
      verificationStatus: "VERIFIED",
    })
      .populate("submittedBy", "name domain")
      .sort({ createdAt: -1 });

    res.json({ count: reviews.length, reviews });
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

export default router;
