const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    select: false, // never returned by queries unless asked for with .select("+password")
  },
  // Demo accounts (POST /auth/demo) are flagged and expire; scripts/cleanup-demo.js removes them
  isDemo: { type: Boolean, default: false },
  expiresAt: { type: Date, default: null },
});

// Speeds up counting active demo users and finding expired ones
userSchema.index({ isDemo: 1, expiresAt: 1 });

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("User", userSchema);