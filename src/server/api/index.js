import express from "express";

const router = express.Router();

class APIError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// API  404 handler
router.use((req, res) => res.status(404).json({ message: "Not Found" }));

// API error handler
router.use((err, req, res) => {
  err.status ||= 500;

  res.status(err.status).json({ message: err.message });
});

export default router;
