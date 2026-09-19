const mongoose = require("mongoose");

const goalSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    why: { type: String, default: "" },
    status: { type: String, enum: ["active", "paused", "done"], default: "active" },
    targetDate: { type: String, default: null },
    categoryId: { type: String, default: null },
    deletedAt: { type: Date, default: null },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

goalSchema.set("toJSON", {
  transform: (doc, ret) => {
    ret.id = ret._id
    delete ret._id;
    delete ret.__v;
    delete ret.user;
    return ret;
  },
});

module.exports = mongoose.model("Goal", goalSchema);
