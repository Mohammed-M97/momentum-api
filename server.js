require("dotenv").config({ quiet: true });
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;
const host = process.env.HOST || "127.0.0.1";

const corsOrigin = process.env.CORS_ORIGIN;
if (!corsOrigin) throw new Error("CORS_ORIGIN is not set");

// Optional: also allow the frontend's preview deployments, e.g.
// CORS_PREVIEW_SUFFIX=.momentum-app-dqn.pages.dev matches https://<anything>.momentum-app-dqn.pages.dev
const previewSuffix = process.env.CORS_PREVIEW_SUFFIX;
const isPreview = (origin) => {
  if (!previewSuffix || !origin) return false;
  try {
    const { protocol, hostname } = new URL(origin);
    return protocol === "https:" && hostname.endsWith(previewSuffix);
  } catch {
    return false;
  }
};

app.use(
  cors({
    origin: (origin, cb) => cb(null, origin === corsOrigin || isPreview(origin) ? origin : false),
    maxAge: 86400,
  }),
);
app.use(express.json());

app.use("/tasks", require("./routes/tasks"));
app.use("/goals", require("./routes/goals"));
app.use("/auth", require("./routes/auth"));

app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res
      .status(400)
      .json({ success: false, message: "Invalid JSON body" });
  }
  console.error(err);
  res.status(500).json({ success: false, message: "Server error" });
});

const mongoose = require("mongoose");

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ Mongo error:", err.message));

app.get("/", (req, res) => {
  res.send("Momentum API is alive");
});

app.listen(port, host, () => {
  console.log(`Server listening on ${host}:${port}`);
});
