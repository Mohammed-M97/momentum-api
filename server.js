require("dotenv").config({ quiet: true });
const express = require("express");
const cors = require("cors");
const app = express();
const port = 3000;

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true, // only if you're sending cookies/auth headers that need it
}));
app.use(express.json());

app.use("/tasks", require("./routes/tasks"));
app.use("/goals", require("./routes/goals"));
app.use("/auth", require("./routes/auth"));

app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, message: "Invalid JSON body" });
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

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
