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
    const appointment = await appointments.getAppointment(req.params.id);
    res.json(appointment);
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
    const appointments = await appointments.getAllAppointmentsForUser(userId);
    res.json(appointments.sort(futureToPast));
  }),
);

/**
 * Gets all appointments for a specific user
 * TODO: consider removing sensitive information from here?
 */
router.get(
  "/users/:id/appointments",
  requiresAuth,
  asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const appointments = await appointments.getAllAppointmentsForUser(userId);
    res.json(appointments.sort(futureToPast));
  }),
);



// ===== CREATE / UPDATE / DELETE =====

router.post(
  "/appointments/create",
  requiresAuth,
  asyncHandler(async (req, res) => {
    const apptData = req.body;
    const userId = req.user._id;

    // TODO also filter out bad fields from the request body


    // check if the user is a part of the event
    if (!(apptData.fromId === userId || apptData.toId === userId)) {
      throw new APIError(403, "You can't create someone else's appointment");
    }


    const appointment = await appointments.createAppointment(apptData, userId);
    res.json(appointment);
  }),
);

router.put(
  "/appointments/:id",
  requiresAuth,
  asyncHandler(async (req, res) => {
    const apptId = req.params.id;
    const apptData = req.body;
    const userId = req.user._id;

    // TODO also filter out bad fields from the request body

    const appointment = await appointments.updateAppointment(apptId, apptData, userId);
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
    const appointment = await appointments.deleteAppointment(req.params.id, req.user._id);
    res.json(appointment);
  }),
);


export default router;
