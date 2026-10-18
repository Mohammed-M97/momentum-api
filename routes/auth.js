const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { buildSampleData } = require("../demo/sampleData");
const Goal = require("../models/Goal");
const Task = require("../models/Task");

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not set in environment variables");
}

// Demo accounts live for DEMO_HOURS; at most DEMO_CAP can be active at once
const DEMO_HOURS = 2;
const DEMO_CAP = 200;

// Max 5 demo sessions per IP per hour (CF-Connecting-IP is the real client IP behind Cloudflare)
const demoLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  keyGenerator: (req) => req.get("CF-Connecting-IP") || req.ip,
  validate: { xForwardedForHeader: false, keyGeneratorIpFallback: false },
  message: { success: false, message: "Too many demo sessions, try later" },
});

// Creates a temporary demo user filled with sample goals/tasks and returns a token for it
router.post("/demo", demoLimiter, async (req, res) => {
  if (process.env.ALLOW_DEMO !== "true") {
    return res
      .status(403)
      .json({ success: false, message: "Demo is disabled" });
  }

  let demoUser = null;
  try {
    const active = await User.countDocuments({
      isDemo: true,
      expiresAt: { $gt: new Date() },
    });
    if (active >= DEMO_CAP) {
      return res
        .status(503)
        .json({ success: false, message: "Demo is busy, try later" });
    }

    const expiresAt = new Date(Date.now() + DEMO_HOURS * 60 * 60 * 1000);
    demoUser = await User.create({
      email: `demo-${crypto.randomUUID()}@demo.local`,
      password: crypto.randomBytes(32).toString("hex"),
      isDemo: true,
      expiresAt,
    });

    const { goals, tasks } = buildSampleData(req.body?.tz);

    // Goals are inserted first so tasks can be linked to their real ids via goalKey
    const insertedGoals = await Goal.insertMany(
      goals.map(({ key, ...g }) => ({ ...g, user: demoUser._id })),
    );
    const idByKey = {};
    goals.forEach((g, i) => (idByKey[g.key] = String(insertedGoals[i]._id)));

    await Task.insertMany(
      tasks.map(({ goalKey, ...t }) => ({
        ...t,
        goalId: goalKey ? idByKey[goalKey] : null,
        user: demoUser._id,
      })),
    );

    const token = jwt.sign({ id: demoUser._id }, process.env.JWT_SECRET, {
      expiresIn: `${DEMO_HOURS}h`,
    });

    res.status(201).json({
      success: true,
      data: { id: demoUser._id, email: demoUser.email, token, expiresAt },
    });
  } catch (error) {
    console.error("Demo error:", error);
    // Roll back whatever was created so no half-built demo user is left behind
    if (demoUser?._id) {
      await Task.deleteMany({ user: demoUser._id });
      await Goal.deleteMany({ user: demoUser._id });
      await User.deleteOne({ _id: demoUser._id, isDemo: true });
    }
    res.status(500).json({ success: false, message: "Could not start demo" });
  }
});

router.post("/register", async (req, res) => {
  try {
    if (process.env.ALLOW_REGISTER !== "true") {
      return res
        .status(403)
        .json({ success: false, message: "Registration is closed" });
    }
    const allowed = ["email", "password"];
    const fields = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) fields[key] = req.body[key];
    }

    const user = await User.create(fields);

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(201).json({
      success: true,
      data: { id: user._id, email: user.email, token },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ success: false, message: "Email already registered" });
    }
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // password has select: false on the model, so ask for it explicitly here
    const findUser = await User.findOne({ email }).select("+password");

    if (!findUser) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, findUser.password);

    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: findUser._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(200).json({
      success: true,
      data: { id: findUser._id, email: findUser.email, token },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
