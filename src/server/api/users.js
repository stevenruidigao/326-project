import { Router } from "express";

import * as users from "../db/users.js";
import { APIError, requiresAuth } from "./helpers.js";
import asyncHandler from "express-async-handler";
import { withSerializer } from "../db/index.js";

const router = Router();

const findUser = (identifier) => {
  const method = identifier.startsWith("@") ? "getByUsername" : "getById";
  const id = identifier.replace(/^@/, "");

  return users[method](id);
};

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
    const user = await findUser(id);

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

    known = known?.split(/,\s+?/).filter(Boolean) || [];
    interests = interests?.split(/,\s+?/).filter(Boolean) || [];

    const out = await users.allWithSkills(page, known, interests);

    res.json(users.serialize(out, req.user?._id));
  }),
);

router.put(
  "/users/:id",
  requiresAuth,
  asyncHandler(async (req, res, next) => {
    const id = req.params.id;
    const loggedInId = req.user._id;
    const user = await findUser(id);

    if (!user || user._id !== loggedInId)
      throw new APIError("Unauthorized", 401);

    // TODO perform validation?

    // only allow valid keys from req.body
    const validData = Object.entries(req.body).filter(([key]) =>
      users.VALID_KEYS.includes(key),
    );

    const data = {
      ...user,
      ...Object.fromEntries(validData),
    };

    // split potential string input into array
    for (const key of ["known", "interests"]) {
      const value = data[key];

      data[key] = Array.isArray(value)
        ? value
        : String(value)
            .split(/,\s*/g)
            .filter((str) => str !== "");
    }

    const updatedUser = await users.update(user._id, data);

    res.json(users.serialize(updatedUser, loggedInId));
  }),
);

export default router;
