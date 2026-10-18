// Deletes expired demo users and all their goals and tasks.
// Run with: npm run cleanup:demo (e.g. from an hourly cron job)
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });

const mongoose = require("mongoose");
const User = require("../models/User");
const Goal = require("../models/Goal");
const Task = require("../models/Task");

async function main() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not set");
  await mongoose.connect(process.env.MONGO_URI);

  const expired = await User.find({ isDemo: true, expiresAt: { $lt: new Date() } })
    .select("_id")
    .lean();
  const ids = expired.map((u) => u._id);

  if (ids.length === 0) {
    console.log("No expired demo users");
    return;
  }

  const tasks = await Task.deleteMany({ user: { $in: ids } });
  const goals = await Goal.deleteMany({ user: { $in: ids } });
  const users = await User.deleteMany({ _id: { $in: ids }, isDemo: true });

  console.log(
    `Removed ${users.deletedCount} demo users, ${goals.deletedCount} goals, ${tasks.deletedCount} tasks`,
  );
}

main()
  .then(() => mongoose.disconnect())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error("Cleanup failed:", err);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });