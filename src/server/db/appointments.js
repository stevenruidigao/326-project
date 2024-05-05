import { APIError } from "../api/helpers.js";

import { createDB, withPagination, withSerializer } from "./index.js";

const db = createDB("appointments");

// TODO: typedef

export const getAppointment = async (apptId) => {
  return db.get(apptId);
};

export const getAllAppointmentsForUser = async (userId) => {
  const res = await db.find({
    selector: {
      $or: [{ teacherId: userId }, { learnerId: userId }],
    },
  });
  return res.docs;
};

export const createAppointment = async (apptData) => {
  const newAppointment = {
    ...apptData,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await db.post(newAppointment);
  return newAppointment;
};

export const updateAppointment = async (apptId, newAppt, userId) => {
  const doc = await db.get(apptId);

  console.log("updating appointment", doc, newAppt, userId);

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

  // FIXME: is the error thrown correctly? I don't think I have access to
  // APIError here
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

  await db.put(updatedAppointment);

  // TODO: consider returning serialized?
  return updatedAppointment;
};

export const deleteAppointment = async (apptId, userId) => {
  const appointment = await db.get(apptId);

  // FIXME: is the error thrown correctly? I don't think I have access to
  // APIError here
  if (!(appointment.learnerId === userId || appointment.teacherId === userId)) {
    throw new APIError("You can't delete someone else's appointment", 403);
  }

  await db.remove(appointment);
  return appointment;
};
