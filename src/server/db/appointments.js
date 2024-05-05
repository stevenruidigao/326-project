import { createDB, withPagination, withSerializer } from "./index.js";

const db = createDB("appointments");

// TODO: typedef

export const getAppointment = async (apptId) => {
    return db.get(apptId);
}

export const getAllAppointmentsForUser = async (userId) => {
    const res = await db.find({
      selector: {
        $or: [
          { teacherId: userId },
          { learnerId: userId },
        ]
      },
    });
    return res.docs;
};




export const createAppointment = async (apptData, userId) => {

    const newAppointment = {
        ...apptData,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };

    await db.post(newAppointment);
    return newAppointment;
};

export const updateAppointment = async (apptId, newAppt, userId) => {
    const appointment = await db.get(apptId);

    // FIXME: is the error thrown correctly? I don't think I have access to APIError here
    if (!(appointment.fromId === userId || appointment.toId === userId)) {
        throw new APIError(403, "You can't update someone else's appointment");
    }

    const updatedAppointment = {
        ...appointment,
        ...newAppt,
        _id: id,
        _rev: doc._rev,
        updatedAt: Date.now(),
    };

    await db.put(updatedAppointment);

    // TODO: consider returning serialized?
    return updatedAppointment;
};

export const deleteAppointment = async (apptId, userId) => {
    const appointment = await db.get(apptId);
    
    // FIXME: is the error thrown correctly? I don't think I have access to APIError here
    if (!(appointment.fromId === userId || appointment.toId === userId)) {
        throw new APIError(403, "You can't delete someone else's appointment");
    }

    await db.remove(appointment);
    return appointment;
};


