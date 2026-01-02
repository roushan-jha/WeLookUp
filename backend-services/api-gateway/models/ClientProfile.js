import mongoose from "mongoose";

const ClientProfileSchema = new mongoose.Schema(
  {
    clientId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    companyDomain: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    gstin: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    category: {
      type: String,
      default: "Other",
      index: true,
    },
    riskScore: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    verificationStatus: {
      type: String,
      enum: ["Pending", "Verified", "Rejected"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

// Index for high-performance searching
ClientProfileSchema.index({ companyName: "text", gstin: 1 });

const ClientProfile = mongoose.model("ClientProfile", ClientProfileSchema);

export default ClientProfile;
