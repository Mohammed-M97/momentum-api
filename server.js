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

const todosRouter = require("./routes/tasks");
app.use("/tasks", todosRouter);
app.use("/auth", require("./routes/auth"));
const mongoose = require("mongoose");

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ Mongo error:", err.message));



app.get("/", (req, res) => {
  res.send("Todo API is alive");
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
