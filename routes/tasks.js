const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const verifyToken = require("../middleware/verifyToken");
router.use(verifyToken);

router.get("/", async (req, res) => {
  try {
    const allTask = await Task.find({ user: req.userId, deletedAt: null }).sort(
      {
        date: 1,
        createdAt: -1,
      },
    );

    res.status(200).json({
      success: true,
      data: allTask,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const allowed = ["title", "date", "done", "effort", "goalId"];
    const fields = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) fields[key] = req.body[key];
    }

    const task = await Task.create({ ...fields, user: req.userId });

    res.status(201).json({
      success: true,
      data: task,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const taskId = req.params.id;

    const task = await Task.findOne({
      _id: taskId,
      user: req.userId,
      deletedAt: null,
    });

    if (!task) {
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    }

    res.status(200).json({ success: true, data: task });
  } catch (error) {
    if (error.name === "CastError") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid ID format" });
    }
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const taskId = req.params.id;

    const data = await Task.findOneAndUpdate(
      { _id: taskId, user: req.userId, deletedAt: null },
      { deletedAt: new Date() },
      { returnDocument: "after" },
    );

    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    }

    res.status(200).json({
      success: true,
      message: "Task successfully deleted",
      data: data,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid ID format" });
    }
    console.error(error);
    res.status(500).json({ success: false, message: "Deletion failed" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const taskId = req.params.id;
    const allowed = ["title", "date", "done", "effort", "goalId"];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (Object.keys(updates).length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No valid fields to update" });
    }
    const data = await Task.findOneAndUpdate(
      { _id: taskId, user: req.userId, deletedAt: null },
      updates,
      { returnDocument: "after", runValidators: true },
    );

    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    }

    res.status(200).json({
      success: true,
      message: "Task successfully updated",
      data: data,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid ID format" });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error(error);
    res.status(500).json({ success: false, message: "Update failed" });
  }
});

module.exports = router;
