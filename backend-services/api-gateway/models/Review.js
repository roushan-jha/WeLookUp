import { Schema, model } from "mongoose";

const ReviewSchema = new Schema(
  {
    clientProfile: {
      type: Schema.Types.ObjectId,
      ref: "ClientProfile",
      required: true,
    },
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reviewerDomain: {
      type: String,
      required: true,
    },
    reviewText: {
      type: String,
      required: true,
      trim: true,
    },
    // Detailed Rating Metrics
    qualityOfService: { type: Number, min: 1, max: 5, required: true },
    customerSupport: { type: Number, min: 1, max: 5, required: true },
    onTimeDelivery: { type: Number, min: 1, max: 5, required: true },
    valueForMoney: { type: Number, min: 1, max: 5, required: true },
    communicationResponsiveness: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    technicalExpertise: { type: Number, min: 1, max: 5, required: true },

    paymentDelayDays: {
      type: Number,
      default: 0,
    },
    // Proof of Transaction
    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
    },
    invoiceUrl: {
      type: String,
      required: true,
    },
    verificationStatus: {
      type: String,
      enum: ["PENDING", "VERIFIED", "MANUAL_REVIEW", "REJECTED"],
      default: "PENDING",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true }, // Ensures virtuals show up in JSON responses
    toObject: { virtuals: true },
  }
);

// Logic: Calculate Overall Rating
ReviewSchema.virtual("overallRating").get(function () {
  const fields = [
    this.qualityOfService,
    this.customerSupport,
    this.onTimeDelivery,
    this.valueForMoney,
    this.communicationResponsiveness,
    this.technicalExpertise,
  ];

  // Check if all fields are numeric
  if (fields.every((val) => typeof val === "number")) {
    const sum = fields.reduce((acc, curr) => acc + curr, 0);
    return parseFloat((sum / fields.length).toFixed(2));
  }
  return null;
});

export default model("Review", ReviewSchema);
