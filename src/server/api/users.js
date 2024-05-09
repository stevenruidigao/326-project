import { Router } from "express";
import asyncHandler from "express-async-handler";
import formidable from "formidable";
import { readFile } from "fs/promises";

import * as users from "../db/users.js";

import { APIError, requiresAuth } from "./helpers.js";

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
    const user = await users.findUser(id);

    if (!user) {
      throw new APIError("User not found", 404);
    }

    res.json(users.serialize(user, req.user?._id));
  }),
);

/**
 * Get a user's avatar by their username/ID.
 * This endpoint returns the avatar as an image if it exists.
 */
router.get(
  "/users/:id/avatar",
  asyncHandler(async (req, res, next) => {
    const id = req.params.id;
    const user = await users.findUser(id);

    users
      .getAvatar(user)
      .then((avatar) => {
        if (!avatar) {
          throw new APIError("Avatar not found", 404);
        }

        res.type("image/png").send(avatar);
      })
      .catch(next);
  }),
);

/**
 * Get all users with optional filters.
 * Optional filters: `page` (number), `known` (comma-separated string),
 * `interests` (comma-separated string). Returns the users (+ pagination data)
 * that match any of the known AND any of the interests (if both provided, must
 * have one of each).
 */
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

/**
 * Verify that the user is editing their own profile.
 * Throws 401 error if the user is editing another or a non-existent user.
 */
const canOnlyEditSameUser = asyncHandler(async (req, res, next) => {
  const id = req.params.id;
  const loggedInId = req.user._id;
  const user = await users.findUser(id);

  if (!user || user._id !== loggedInId) throw new APIError("Unauthorized", 401);

  next();
});

/**
 * Allows a user to update their own profile (excluding password).
 * @see {users.VALID_KEYS} for valid keys that can be updated
 */
router.put(
  "/users/:id",
  requiresAuth,
  canOnlyEditSameUser,
  asyncHandler(async (req, res, next) => {
    const id = req.params.id;
    const loggedInId = req.user._id;
    const user = await users.findUser(id);

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

/**
 * Allows a user to update their own avatar.
 */
router.put(
  "/users/:id/avatar",
  requiresAuth,
  canOnlyEditSameUser,
  (req, res, next) => {
    const form = formidable({
      maxFiles: 1,
    });

    form.parse(req, (err, fields, files) => {
      if (err) {
        console.error(`PUT ${req.path} error:`, err);
        throw new APIError("Invalid form data", 400);
      }

      /**
       * @type {import("formidable/PersistentFile.js") | undefined}
       */
      const file = files.avatar?.[0];

      return (file ? readFile(file.filepath) : Promise.resolve())
        .then((buffer) => users.updateAvatar(req.user, file?.mimetype, buffer))
        .then((updatedUser) => {
          return res.json(users.serialize(updatedUser, req.user._id));
        })
        .catch(next);
    });
  },
);

export default router;
