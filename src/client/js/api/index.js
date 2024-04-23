import * as local from "./local.js";
import * as mock from "./mock/index.js";

/*
    NOTE: .find() doesn't return total_rows equivalent (since we're querying
   data) so we don't know when pagination ends until we reach a page with no
   rows. Those queries will have to likely implement a "show more"
   button/infinite scrolling on the frontend
*/
const withPagination = (pageSize) => async (page, cb) => {
  page = Math.max(1, page);

  const start = (page - 1) * pageSize;
  const res = await cb({ limit: pageSize, skip: start });

  if (res.warning) console.warn(`[PouchDB] ${res.warning}`);

  const rows = res.rows?.map((r) => r.doc || r);

  const data = [...(rows || res.docs)];
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
// -> default attrs probably? but those would happen in backend anyways
// (validation & stuff)
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
  return mock.appointments.put({
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

// ===== MESSAGES =====

const MESSAGES_PAGE_SIZE = 10;
const messagesPagination = withPagination(MESSAGES_PAGE_SIZE);

const getAllMessages = () => mock.messages.allDocs({ include_docs: true });

const getAllMessagesInvolvingUser = (userId) =>
  mock.messages.find({
    selector: {
      $or: [{ fromId: { $eq: userId } }, { toId: { $eq: userId } }],
    },
    // sort: ["time"],
  });

// FIXME: pagination does not correctly give newest messages first
const getMessagesInvolvingUser = (userId, page = 1) => {
  console.warn("pagination does not correctly give newest messages first");
  messagesPagination(page, (opts) =>
    mock.messages.find({
      selector: {
        $or: [{ fromId: { $eq: userId } }, { toId: { $eq: userId } }],
      },
      // use_index: ['time', 'fromId', 'toId'],
      // sort: ['time'],
      ...opts,
    }),
  );
};

const createMessage = (data) =>
  mock.messages.post({
    ...data,
    time: Date.now(),
  });

// TODO: should I add functions to get all messages?
export const messages = {
  // fetch
  all: getAllMessages,
  allWithUser: getAllMessagesInvolvingUser,
  getWithUser: getMessagesInvolvingUser, // paginated

  // modify
  create: createMessage,
};

// ===== USERS =====

const USERS_PAGE_SIZE = 5;
const userPagination = withPagination(USERS_PAGE_SIZE);

// TODO  handle password in backend

const registerUser = async ({ name, username, email, password }) => {
  const [emailOut, usernameOut] = await Promise.all([
    mock.users.find({
      selector: {
        email: { $eq: email },
      },
      limit: 1,
    }),

    mock.users.find({
      selector: {
        username: { $eq: username },
      },
      limit: 1,
    }),
  ]);

  if (emailOut.docs.length) throw new Error("User already exists with email");
  else if (usernameOut.docs.length)
    throw new Error("User already exists with username");

  return mock.users.post({ name, username, email });
};

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
  return mock.users.put({
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

// session user data to prevent multiple fetches
let currentUser = undefined;

export const setSessionCurrent = (u) => (currentUser = u);
export const getSessionCurrent = async () => {
  if (currentUser !== undefined) return currentUser;
  return setSessionCurrent(await getSessionUser());
};

export const createSession = async (userId) => {
  const doc = await mock.session.post({ userId });

  console.log("createSession", doc);

  await local.set("token", doc.id);

  setSessionCurrent();
};

export const getSession = async () => {
  const id = await local.get("token");

  if (id) {
    try {
      return await mock.session.get(id);
    } catch (err) {}
  }

  return null;
};

const getSessionUser = async () => {
  const session = await getSession();

  if (!session?.userId) return null;

  // TODO handle error better somehow if user id does not exist?
  return users.get(session.userId).catch(() => null);
};

export const deleteSession = async () => {
  const session = await getSession();

  if (session) await mock.session.remove(session);

  await local.set("token", null);

  setSessionCurrent(null);
};

export const session = {
  create: createSession,
  get: getSession,
  getUser: getSessionUser,
  delete: deleteSession,

  current: getSessionCurrent,
};
