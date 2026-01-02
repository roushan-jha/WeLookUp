import { Schema, model } from "mongoose";

const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    // Extracted automatically
    domain: {
      type: String,
    },
    // Stores previous employers to allow "Ex-Employee" reviews
    pastDomains: [
      {
        type: String,
      },
    ],
    role: {
      type: String,
      enum: ["User", "Admin"],
      default: "User",
    },
  },
  { timestamps: true }
);

// Middleware to extract domain and track history
UserSchema.pre("save", function (next) {
  if (this.isModified("email")) {
    const newDomain = this.email.split("@")[1];

    if (this.domain && this.domain !== newDomain) {
      if (!this.pastDomains.includes(this.domain)) {
        this.pastDomains.push(this.domain);
      }
    }
    this.domain = newDomain;
  }
  next();
});

export default model("User", UserSchema);
