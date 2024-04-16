import * as mock from "./mock/index.js";
import * as local from "./local.js";

const MOCK_MS = 200;
const mockFunc =
  (cb) =>
  (...args) =>
    new Promise(async (resolve) => {
      const output = await cb(...args); // do not timeout actual execution to find errors faster
      setTimeout(() => resolve(output), MOCK_MS);
    });

const filterWithValue = (arr, args, value) =>
  arr.filter((item) => args.some((arg) => item[arg] === value));

/*
    NOTE: .find() doesn't return total_rows equivalent (since we're querying data)
    so we don't know when pagination ends until we reach a page with no rows.
    Those queries will have to likely implement a "show more" button/infinite scrolling on the frontend
*/
const withPagination = (pageSize) => async (page, cb) => {
  page = Math.max(1, page);

  const start = (page - 1) * pageSize;
  const res = await cb({ limit: pageSize, skip: start });

  if (res.warning) console.warn(`[PouchDB] ${res.warning}`);

  const data = { ...(res.rows || res.docs) };
  const totalPages = Math.ceil(res.total_rows / pageSize);

  // Not present for .find() results. See note above function
  if (totalPages) {
    data.pagination = {};

    if (page > 1) data.pagination.prev = Math.min(totalPages, page - 1);
    if (page < totalPages) data.pagination.next = page + 1;
    data.pagination.total = totalPages;
  }

  return data;
};

// ===== APPOINTMENTS =====

const APPOINTMENTS_PAGE_SIZE = 8;
const appointmentsPagination = withPagination(APPOINTMENTS_PAGE_SIZE);

const allAppointments = (page = 1) =>
  appointmentsPagination(page, (opts) =>
    mock.appointments.allDocs({
      include_docs: true,
      ...opts,
    }),
  );

const getAppointment = (id) => mock.appointments.get(id);

const withUserAppointments = (userId, page = 1) =>
  appointmentsPagination(page, (opts) =>
    mock.appointments.find({
      selector: { $or: [{ teacherId: userId }, { learnerId: userId }] },
      ...opts,
    }),
  );

const withTeacherAppointments = (userId, page = 1) =>
  appointmentsPagination(page, (opts) =>
    mock.appointments.find({
      selector: { teacherId: userId },
      ...opts,
    }),
  );

const withLearnerAppointments = (userId, page = 1) =>
  appointmentsPagination(page, (opts) =>
    mock.appointments.find({
      selector: { learnerId: userId },
      ...opts,
    }),
  );

// modify
// -> default attrs probably? but those would happen in backend anyways (validation & stuff)
const createAppointment = (data) =>
  mock.appointments.post({
    ...data,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

const updateAppointment = async (id, data) => {
  const doc = await mock.appointments.get(id);

  // keep unchanged data in doc
  // replace changed data
  // prevent replacing id & rev
  return await mock.appointments.put({
    ...doc,
    ...data,
    _id: id,
    _rev: doc._rev,
    updatedAt: Date.now(),
  });
};

export const appointments = {
  // fetch
  all: allAppointments,
  get: getAppointment,
  withUser: withUserAppointments,
  withTeacher: withTeacherAppointments,
  withLearner: withLearnerAppointments,

  // modify
  create: createAppointment,
  update: updateAppointment,
};

// ===== USERS =====

const USERS_PAGE_SIZE = 5;
const userPagination = withPagination(USERS_PAGE_SIZE);

// TODO  hadle password in backend

const registerUser = ({ name, username, email, password }) =>
  mock.users.post({ name, username, email });

const getUser = (id) => mock.users.get(id);

const allUsers = (page = 1) =>
  userPagination(page, (opts) =>
    mock.users.allDocs({
      include_docs: true,
      ...opts,
    }),
  );

// Get users that have ANY of the skills listed AND any of the skills wanted
const allUsersWithSkills = (page = 1, skillsHad = [], skillsWant = []) =>
  userPagination(page, (opts) =>
    mock.users.find({
      selector: {
        $and: [
          skillsHad.length && {
            $or: skillsHad.map((skill) => ({
              skills: { $elemMatch: { $eq: skill } },
            })),
          },
          skillsWant.length && {
            $or: skillsWant.map((skill) => ({
              skillsWanted: { $elemMatch: { $eq: skill } },
            })),
          },
        ].filter(Boolean),
      },
      ...opts,
    }),
  );

const updateUser = async (id, data) => {
  const doc = await mock.users.get(id);

  // keep unchanged data in doc
  // replace changed data
  // prevent replacing id & rev
  return await mock.users.put({
    ...doc,
    ...data,
    _id: id,
    _rev: doc._rev,
    updatedAt: Date.now(),
  });
};

export const users = {
  register: registerUser,
  get: getUser,
  all: allUsers,
  withSkills: allUsersWithSkills,
  update: updateUser,
};

// ===== SESSION =====

// session depends a bit on implementation
const getSession = async () => {
  try {
    return await local.session.get("data");
  } catch (err) {
    // session is expired/nonexistent -> user is guest!
    return null;
  }
};
const getSessionUser = async () => {
  const data = await getSession();

  if (!data?.userId) return null;

  // user id does not exist.
  // TODO handle error somehow?
  return await users.get(data.userId);
};

export const session = { get: getSession, getUser: getSessionUser };
