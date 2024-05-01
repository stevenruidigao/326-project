import { Router } from "express";

import * as users from "../db/users.js";
import { APIError, requiresAuth } from "./helpers.js";
import asyncHandler from "express-async-handler";

const router = Router();

router.get("/me", requiresAuth, (req, res) => {
  res.json(users.serialize(req.user, req.user._id));
});

/**
 * Get a user by their username or ID: `/api/users/@username` or `/api/users/id`
 * Parameters returned depend on whether the user is logged in.
 */
router.get(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const method = id.startsWith("@") ? "getByUsername" : "getById";
    const identifier = id.replace(/^@/, "");

    const user = await users[method](identifier);

    if (!user) {
      throw new APIError("User not found", 404);
    }

    res.json(users.serialize(user, req.user?._id));
  }),
);

router.get(
  "/users",
  asyncHandler(async (req, res) => {
    let { page, known, interests } = req.query;

    page = parseInt(page);
    if (isNaN(page) || page < 1) page = 1;

    known = known?.split(/,\s+?/) || [];
    interests = interests?.split(/,\s+?/) || [];

    const out = await users.allWithSkills(page, known, interests);

    out.data = out.data.map((user) => users.serialize(user, req.user?._id));

    res.json(out);
  }),
);

export default router;
