import express from "express";
import * as users from "../db/users.js";

import userRouter from "./users.js";

const router = express.Router();

// API routes

router.use(userRouter);

// API  404 handler
router.use((req, res) => res.status(404).json({ message: "Not Found" }));

// API error handler
router.use((err, req, res, next) => {
  err.status ||= 500;

  if (err.status === 500) {
    console.error(err);
  }

  res.status(err.status).json({ status: err.status, message: err.message });
});

export default router;
