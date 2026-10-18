const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    date: {
      type: String,
      default: null,
      match: [/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"],
    },
    done: { type: Boolean, default: false },
    effort: { type: String, enum: ["low", "mid", "high"], default: "low" },
    goalId: { type: String, default: null },
    deletedAt: { type: Date, default: null },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

// Matches the main query: a user's tasks sorted by date
taskSchema.index({ user: 1, date: 1 });

taskSchema.set("toJSON", {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.user;
    return ret;
  },
});

module.exports = mongoose.model("Task", taskSchema);