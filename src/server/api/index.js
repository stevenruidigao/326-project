import express from "express";
import * as users from "../db/users.js";

const router = express.Router();

class APIError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// API routes

const requiresAuth = (req, res, next) => {
  if (!req.user) {
    throw new APIError("Unauthorized", 401);
  }

  next();
};

router.get("/me", requiresAuth, (req, res) => {
  res.json(users.serialize(req.user, req.user._id));
});

// API  404 handler
router.use((req, res) => res.status(404).json({ message: "Not Found" }));

// API error handler
router.use((err, req, res, next) => {
  err.status ||= 500;

  res.status(err.status).json({ status: err.status, message: err.message });
});

export default router;
