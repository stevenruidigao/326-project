import * as local from "./local.js";
import * as mock from "./mock/index.js";

/**
 * @typedef {T[] & { pagination?: { prev?: number, next?: number, total?: number }}} PaginatedArray<T>
 * @template {any} T
 */

/**
 * @typedef {{ id: string, rev: string, ok: boolean }} PouchDBResponse
 * @typedef {{ limit: number, skip: number, attachments: boolean, binary: boolean }} PouchDBOptions
 */

/**
 * Pagination helper function for PouchDB queries. The callback function
 * should utilize the `opts` object to pass to the query function.
 *
 * NOTE: .find() doesn't return total_rows equivalent (since we're querying
 * data) so we don't know when pagination ends until we reach a page with no
 * rows. Those queries will have to likely implement a "show more"
 * button/infinite scrolling on the frontend
 * @param {number} pageSize
 * @returns {(page: number, cb: (opts: { limit: number, skip: number }) => Promise<any>) =>
 *  Promise<PaginatedArray>}
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

/**
 *
 * @param {number} page
 * @returns {Promise<PaginatedArray<Appointment>>}
 */
const allAppointments = (page = 1) =>
  appointmentsPagination(page, (opts) =>
    mock.appointments.allDocs({
      include_docs: true,
      ...opts,
    }),
  );

/**
 * Obtain a specific appointment by ID
 * @param {string} id
 * @returns {Promise<Appointment>}
 */
const getAppointment = (id) => mock.appointments.get(id);

/**
 * Obtain all appointments involving a specific user.
 * NOTE: Paginated, not sorted!
 * @param {string} userId
 * @param {number} page
 * @returns {Promise<PaginatedArray<Appointment>>}
 */
const withUserAppointments = (userId, page = 1) =>
  appointmentsPagination(page, (opts) =>
    mock.appointments.find({
      selector: { $or: [{ teacherId: userId }, { learnerId: userId }] },
      ...opts,
    }),
  );

/**
 * Obtain all appointments with a specific user as teacher.
 * NOTE: Paginated, not sorted!
 * @param {string} userId
 * @param {number} page
 * @returns {Promise<PaginatedArray<Appointment>>}
 */
const withTeacherAppointments = (userId, page = 1) =>
  appointmentsPagination(page, (opts) =>
    mock.appointments.find({
      selector: { teacherId: userId },
      ...opts,
    }),
  );

/**
 * Obtain all appointments with a specific user as learner.
 * NOTE: Paginated, not sorted!
 * @param {string} userId
 * @param {number} page
 * @returns {Promise<PaginatedArray<Appointment>>}
 */
const withLearnerAppointments = (userId, page = 1) =>
  appointmentsPagination(page, (opts) =>
    mock.appointments.find({
      selector: { learnerId: userId },
      ...opts,
    }),
  );

/**
 * Returns an id-to-user map of all users involved in the appointments.
 * Scuffed way to obtain relationship values...
 * @param {Appointment[]} appts Only requires `teacherId` and `learnerId`
 *     properties for each item
 * @returns {Promise<Object.<string, User>>}
 */
const getAppointmentUsersInvolved = async (appts) => {
  const userIds = new Set(
    appts
      .map((appt) => appt.teacherId)
      .concat(appts.map((appt) => appt.learnerId)),
  );
  const userArray = await Promise.all([...userIds].map((id) => users.get(id)));

  return Object.fromEntries(userArray.map((u) => [u._id, u]));
};

// modify
// -> default attrs probably? but those would happen in backend anyways
// (validation & stuff)

/**
 * Create a new appointment
 * @param {Appointment} data
 * @returns {Promise<PouchDBResponse>}
 */
const createAppointment = (data) =>
  mock.appointments.post({
    ...data,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

/**
 * Update an appointment's data
 * @param {string} id
 * @param {Appointment} data
 * @returns {Promise<PouchDBResponse>}
 */
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

/**
 * Delete an appointment
 * @param {string} id
 * @returns {Promise<PouchDBResponse>}
 * @throws {Error} if appointment does not exist
 */
const deleteAppointment = async (id) => {
  const doc = await mock.appointments.get(id);

  return mock.appointments.remove(doc);
};

export const appointments = {
  // fetch
  all: allAppointments,
  get: getAppointment,
  withUser: withUserAppointments,
  withTeacher: withTeacherAppointments,
  withLearner: withLearnerAppointments,
  getUsersInvolved: getAppointmentUsersInvolved,

  // modify
  create: createAppointment,
  update: updateAppointment,
  delete: deleteAppointment,
};

// ===== MESSAGES =====

const MESSAGES_PAGE_SIZE = 10;
const messagesPagination = withPagination(MESSAGES_PAGE_SIZE);

/**
 * Get all messages in the database
 * @returns {Promise<PaginatedArray<Message>>}
 */
const getAllMessages = () => mock.messages.allDocs({ include_docs: true });

/**
 * Get all messages involving a specific user
 * @param {string} userId
 * @returns {Promise<{ docs: Message[] }>}
 */
const getAllMessagesInvolvingUser = (userId) =>
  mock.messages.find({
    selector: {
      $or: [{ fromId: { $eq: userId } }, { toId: { $eq: userId } }],
    },
    // sort: ["time"],
  });

/**
 * Get messages involving a specific user, paginated.
 * FIXME: pagination does not correctly give newest messages first
 * @param {string} userId
 * @param {number} page
 * @returns {Promise<PaginatedArray<Message>>}
 */
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

/**
 * Create new message.
 * NOTE: Should not include & not return ID!
 * @param {Message} data
 * @returns {Promise<Message>}
 */
const createMessage = (data) => {
  const newMsg = {
    ...data,
    time: Date.now(),
  };
  mock.messages.post(newMsg);
  return newMsg;
};

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

const sendAPIReq = async (method, path, body, opts = {}) => {
  const res = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : null,
    ...opts,
  });

  if (!res.ok && !opts.noThrow) {
    const { message } = await res.json();

    throw new Error(message);
  }

  return await res.json();
};

/**
 * Obtain user given credentials. Throws error if no user found.
 * @param {{ username: string, password: string }} args
 * @returns {Promise<User>}
 */
const loginUser = ({ username, password }) =>
  sendAPIReq("POST", "/login", { username, password });

/**
 * Register user given credentials. Throws error if user already exists with email or username.
 * @param {{ name: string, username: string, email: string, password: string }} param0
 * @returns {Promise<PouchDBResponse>}
 */
const registerUser = ({ name, username, email, password }) =>
  sendAPIReq("POST", "/signup", { name, username, email, password });

/**
 * Logout user
 * @returns {Promise<void>}
 */
const logoutUser = () => sendAPIReq("POST", "/logout");

/**
 * Obtain user by ID
 * @param {string} id
 * @param {PouchDBOptions} opts
 * @returns {Promise<User>}
 */
const getUser = (id, opts = {}) => mock.users.get(id, opts);

/**
 * Obtain user by username
 * @param {string} username
 * @param {PouchDBOptions} opts
 * @returns
 */
const getUserByUsername = (username, opts) =>
  mock.users
    .find({
      selector: { username: { $eq: username } },
      limit: 1,
      ...opts,
    })
    .then((out) => out.docs[0]);

/**
 * Obtain user's avatar image
 * @param {User} user
 * @returns {Promise<Blob>}
 */
const getUserAvatar = async (user) => {
  const avatar = user._attachments?.avatar;

  if (!avatar) return null;
  else if (avatar.data) return avatar.data;

  const attachment = await mock.users.getAttachment(user._id, "avatar");

  avatar.data = attachment;

  return attachment;
};

/**
 * Paginate through all users
 * @param {number} page
 * @returns {Promise<PaginatedArray<User>>}
 */
const allUsers = (page = 1) =>
  userPagination(page, (opts) =>
    mock.users.allDocs({
      include_docs: true,
      ...opts,
    }),
  );

/**
 * Get users that have ANY of the skills listed AND any of the skills wanted.
 * NOTE: uses pagination, but behind the scenes it fetches ALL users and filters each time,
 * since this query does not allow for an index to be used.
 * @param {number} page
 * @param {string[]} skillsHad
 * @param {string[]} skillsWant
 * @returns
 */
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

/**
 * NOTICE: 'data' replaces ALL data the user holds aside from `_id`, `_rev`, and
 * `updatedAt`! Pass the final modified document.
 * @param {string} id
 * @param {object} data
 * @returns
 */
const updateUser = async (id, data) => {
  const doc = await mock.users.get(id);

  // keep unchanged data in doc
  // replace changed data
  // prevent replacing id & rev
  return mock.users.put({
    ...data,
    _id: id,
    _rev: doc._rev,
    updatedAt: Date.now(),
  });
};

export const users = {
  login: loginUser,
  register: registerUser,
  logout: logoutUser,

  get: getUser,
  getByUsername: getUserByUsername,
  getAvatar: getUserAvatar,
  all: allUsers,
  withSkills: allUsersWithSkills,
  update: updateUser,
};

// ===== SESSION =====

// session user data to prevent multiple fetches
let currentUser = undefined;

/**
 * Store the current session user
 * @param {User} u
 * @returns {User}
 */
const setSessionCurrent = (u) => (currentUser = u);

/**
 * Obtain the current session user. Fetches if not already stored.
 * @returns {Promise<User?>}
 */
const getSessionCurrent = async () => {
  if (currentUser !== undefined) return currentUser;

  // avoid fetching while already fetching
  setSessionCurrent(null);

  try {
    return setSessionCurrent(await getSessionUser());
  } catch (err) {
    setSessionCurrent(undefined);
    throw err;
  }
};

/**
 * Get current logged-in user from session data
 * @returns {Promise<User?>}
 */
const getSessionUser = async () => {
  const res = await sendAPIReq("GET", "/api/me", undefined, { noThrow: true });

  if (res.status === 401) return null;
  else if (res.status) throw new Error(res.message);

  return res;
};

export const session = {
  getUser: getSessionUser,

  current: getSessionCurrent,
  setCurrent: setSessionCurrent,
};
