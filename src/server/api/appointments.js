import { Router } from "express";

import * as appointments from "../db/appointments.js";
import * as users from "../db/users.js";
import { APIError, requiresAuth } from "./helpers.js";
import asyncHandler from "express-async-handler";
import { withSerializer } from "../db/index.js";

const router = Router();

// TODO: add typedef

const futureToPast = (a, b) => a.time - b.time;

/**
 * Gets a specific appointment by ID
 */
router.get(
  "/appointments/:id",
  requiresAuth,
  asyncHandler(async (req, res) => {
    const docs = await appointments.getAppointment(req.params.id);
    res.json(docs);
  }),
);

/**
 * Gets all appointments for the current user
 */
router.get(
  "/appointments",
  requiresAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const docs = await appointments.getAllAppointmentsForUser(userId);
    res.json(docs.sort(futureToPast));
  }),
);

/**
 * Gets all appointments for a specific user
 * TODO: consider removing sensitive information from here?
 */
router.get(
  "/users/:id/appointments",
  // requiresAuth,
  asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const docs = await appointments.getAllAppointmentsForUser(userId);
    docs.sort(futureToPast);

    const userIds = new Set(
      docs
        .map((appt) => appt.teacherId)
        .concat(docs.map((appt) => appt.learnerId)),
    );
    const userArray = await Promise.all(
      [...userIds].map((id) => users.get(id)),
    );

    const idToUserMap = Object.fromEntries(
      userArray.map((u) => [u._id, serialize(u)]),
    );

    res.json({
      appointments: docs,
      idToUserMap: idToUserMap,
    });
  }),
);

// ===== CREATE / UPDATE / DELETE =====

router.post(
  "/users/:id/appointments",
  requiresAuth,
  asyncHandler(async (req, res) => {
    const otherUser = await users.findUser(req.params.id);

    if (!otherUser) {
      throw new APIError("User not found", 404);
    } else if (otherUser._id === req.user._id) {
      throw new APIError("Cannot create appointment with yourself", 400);
    }

    const { role, ...apptData } = req.body;
    apptData.teacherId = role === "teaching" ? req.user._id : otherUser._id;
    apptData.learnerId = role === "learning" ? req.user._id : otherUser._id;

    // TODO also filter out bad fields from the request body

    const appointment = await appointments.createAppointment(apptData);
    res.json(appointment);
  }),
);

router.put(
  "/appointments/:id",
  requiresAuth,
  asyncHandler(async (req, res) => {
    const appt = await appointments.getAppointment(req.params.id);

    const { role, ...apptData } = req.body;
    const userId = req.user._id;

    if (!["teaching", "learning"].includes(role)) {
      throw new APIError("Invalid role in appointment", 400);
    }

    const oldRole = appt.learnerId === userId ? "learning" : "teaching";

    // swap role only if needed
    [apptData.learnerId, apptData.teacherId] =
      role === oldRole
        ? [appt.learnerId, appt.teacherId]
        : [appt.teacherId, appt.learnerId];

    delete apptData.role;

    // TODO also filter out bad fields from the request body

    const appointment = await appointments.updateAppointment(
      appt._id,
      apptData,
      userId,
    );
    res.json(appointment);
  }),
);

/**
 * checks to make sure the deleted event is the user's event
 */
router.delete(
  "/appointments/:id",
  requiresAuth,
  asyncHandler(async (req, res) => {
    const appointment = await appointments.deleteAppointment(
      req.params.id,
      req.user._id,
    );
    res.json(appointment);
  }),
);

export default router;
