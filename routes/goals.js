const express = require("express");
const router = express.Router();
const Goal = require("../models/Goal");
const Task = require("../models/Task")
const verifyToken = require("../middleware/verifyToken");
router.use(verifyToken);

router.get("/", async (req, res) => {
  try {
    const allGoal = await Goal.find({ user: req.userId, deletedAt: null }).sort(
      {
        createdAt: -1,
      },
    );

    res.status(200).json({
      success: true,
      data: allGoal,
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
    const allowed = ["title", "why", "status", "targetDate", "categoryId"];
    const fields = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) fields[key] = req.body[key];
    }

    const goal = await Goal.create({ ...fields, user: req.userId });

    res.status(201).json({
      success: true,
      data: goal,
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
    const goalId = req.params.id;

    const goal = await Goal.findOne({
      _id: goalId,
      user: req.userId,
      deletedAt: null,
    });

    if (!goal) {
      return res
        .status(404)
        .json({ success: false, message: "Goal not found" });
    }

    res.status(200).json({ success: true, data: goal });
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
    const goalId = req.params.id;

    const data = await Goal.findOneAndUpdate(
      { _id: goalId, user: req.userId, deletedAt: null },
      { deletedAt: new Date() },
      { returnDocument: "after" },
    );

    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: "Goal not found" });
    }

    res.status(200).json({
      success: true,
      message: "Goal successfully deleted",
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
    const goalId = req.params.id;
    const allowed = ["title", "why", "status", "targetDate", "categoryId"];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (Object.keys(updates).length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No valid fields to update" });
    }
    const data = await Goal.findOneAndUpdate(
      { _id: goalId, user: req.userId, deletedAt: null },
      updates,
      { returnDocument: "after", runValidators: true },
    );

    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: "Goal not found" });
    }

    res.status(200).json({
      success: true,
      message: "Goal successfully updated",
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
