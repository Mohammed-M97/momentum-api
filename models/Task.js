const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    date: { type: String, default: null },
    done: { type: Boolean, default: false },
    effort: { type: String, enum: ["low", "mid", "high"], default: "low" },
    goalId: { type: String, default: null },
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

taskSchema.set("toJSON", {
  transform: (doc, ret) => {
    ret.id = ret._id
    delete ret._id;
    delete ret.__v;
    delete ret.user;
    return ret;
  },
});

module.exports = mongoose.model("Task", taskSchema);
