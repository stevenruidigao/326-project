import { APIError } from "../api/helpers.js";
import { createDB, withPagination, withSerializer } from "./index.js";

export const db = createDB("appointments");

/**
 * @typedef {{
 *   _id: string,
 *   teacherId: string,
 *   learnerId: string,
 *   time: number,
 *   topic: string,
 *   type: "online" | "in-person",
 *   url?: string,
 *
 *   createdAt: number,
 *   updatedAt: number,
 * }} SerializedAppointment
 *
 * @typedef {SerializedAppointment & Pick<PouchDB.Core.GetMeta, "_rev">} Appointment
 */

/**
 * Get an appointment by its ID
 *
 * @param {string} apptId
 * @returns {Promise<Appointment>}
 * @throws if the appointment is not found
 */
export const getAppointment = async (apptId) => {
  return db.get(apptId);
};

/**
 * Get all appointments where a user is involved
 *
 * @param {string} userId
 * @returns {Promise<Appointment[]>}
 */
export const getAllAppointmentsForUser = async (userId) => {
  const [teacher, learner] = await Promise.all([
    db.find({ selector: { teacherId: userId } }),
    db.find({ selector: { learnerId: userId } }),
  ]);

  return [...teacher.docs, ...learner.docs];
};

/**
 * Create an appointment in the database
 *
 * @param {Omit<SerializedAppointment, "createdAt" | "updatedAt">} apptData
 * @returns {Promise<Appointment>}
 */
export const createAppointment = async (apptData) => {
  const newAppointment = {
    ...apptData,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const { _rev } = await db.post(newAppointment);

  return { ...newAppointment, _rev };
};

/**
 * Update an appointment
 *
 * @param {string} apptId
 * @param {Omit<SerializedAppointment, "createdAt" | "updatedAt">} newAppt
 * @param {string} userId
 * @returns {Promise<Appointment>}
 */
export const updateAppointment = async (apptId, newAppt, userId) => {
  const doc = await db.get(apptId);

  // do not allow changing user ids (except exchanging them -- role!)
  const allowedUserIds = [doc.learnerId, doc.teacherId];
  if (
    !allowedUserIds.includes(newAppt.learnerId) ||
    !allowedUserIds.includes(newAppt.teacherId)
  ) {
    throw new APIError(
      "Changing the users involved in an appointment is not permitted - create a new one instead",
      403,
    );
  }

  // this should probably not throw APIError here, but works for now
  if (!(doc.learnerId === userId || doc.teacherId === userId)) {
    throw new APIError("You can't update someone else's appointment", 403);
  }

  const updatedAppointment = {
    ...doc,
    ...newAppt,
    _id: doc._id,
    _rev: doc._rev,
    updatedAt: Date.now(),
  };

  const { _rev } = await db.put(updatedAppointment);

  return { ...updatedAppointment, _rev };
};

/**
 * Delete an appointment the user is involved in.
 *
 * @param {string} apptId
 * @param {string} userId
 * @returns {Promise<PouchDB.Core.Response>}
 */
export const deleteAppointment = async (apptId, userId) => {
  const appointment = await db.get(apptId);

  // FIXME: is the error thrown correctly? I don't think I have access to APIError here
  if (!(appointment.learnerId === userId || appointment.teacherId === userId)) {
    throw new APIError("You can't delete someone else's appointment", 403);
  }

  return db.remove(appointment);
};
