import * as local from "./local.js";
import * as mock from "./mock/index.js";

/**
 * @typedef {T[] & { pagination?: { prev?: number, next?: number, total?: number
 * }}} PaginatedArray<T>
 * @template {any} T
 */

/**
 * @typedef {{ id: string, rev: string, ok: boolean }} PouchDBResponse
 * @typedef {{ limit: number, skip: number, attachments: boolean, binary:
 * boolean }} PouchDBOptions
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
 * @returns {(page: number, cb: (opts: { limit: number, skip: number }) =>
 *     Promise<any>) =>
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

/**
 *
 * @param {number} page
 * @returns {Promise<PaginatedArray<Appointment>>}
 */
const allAppointments = () => sendAPIReq("GET", "/api/appointments");

/**
 * uses `allAppointments` but filters for a specific other user
 */
const myAppointmentsWithUser = (userId) =>
  allAppointments().then((appts) =>
    appts.filter(
      (appt) => appt.teacherId === userId || appt.learnerId === userId,
    ),
  );

const withUserAppointments = (userId) =>
  sendAPIReq("GET", `/api/users/${userId}/appointments`);

/**
 * Obtain a specific appointment by ID
 * @param {string} id
 * @returns {Promise<Appointment>}
 */
const getAppointment = (id) => sendAPIReq("GET", `/api/appointments/${id}`);

// /**
//  * Obtain all appointments with a specific user as teacher.
//  * NOTE: Paginated, not sorted!
//  * @param {string} userId
//  * @param {number} page
//  * @returns {Promise<PaginatedArray<Appointment>>}
//  */
// const withTeacherAppointments = (userId, page = 1) =>
//   appointmentsPagination(page, (opts) =>
//     mock.appointments.find({
//       selector: { teacherId: userId },
//       ...opts,
//     }),
//   );

// /**
//  * Obtain all appointments with a specific user as learner.
//  * NOTE: Paginated, not sorted!
//  * @param {string} userId
//  * @param {number} page
//  * @returns {Promise<PaginatedArray<Appointment>>}
//  */
// const withLearnerAppointments = (userId, page = 1) =>
//   appointmentsPagination(page, (opts) =>
//     mock.appointments.find({
//       selector: { learnerId: userId },
//       ...opts,
//     }),
//   );

// // FIXME: turn into api call? or honestly if this doesnt ping db then its
// fine (it kinda does but might be ok, may want to do this all in the backend
// tho cuz users.get(id) is a separate API call each time)
// /**
//  * Returns an id-to-user map of all users involved in the appointments.
//  * Scuffed way to obtain relationship values...
//  * @param {Appointment[]} appts Only requires `teacherId` and `learnerId`
//  *     properties for each item
//  * @returns {Promise<Object.<string, User>>}
//  */
// const getAppointmentUsersInvolved = async (appts) => {
// };

// modify
// -> default attrs probably? but those would happen in backend anyways
// (validation & stuff)

/**
 * Create a new appointment
 * @param {string} targetUserId
 * @param {Appointment} data
 * @returns {Promise<PouchDBResponse>}
 */
const createAppointment = (targetUserId, data) =>
  sendAPIReq("POST", `/api/users/${targetUserId}/appointments`, data);

/**
 * Update an appointment's data
 * @param {string} id
 * @param {Appointment} data
 * @returns {Promise<PouchDBResponse>}
 */
const updateAppointment = async (id, data) =>
  sendAPIReq("PUT", `/api/appointments/${id}`, data);

/**
 * Delete an appointment
 * @param {string} id
 * @returns {Promise<PouchDBResponse>}
 * @throws {Error} if appointment does not exist
 */
const deleteAppointment = async (id) =>
  sendAPIReq("DELETE", `/api/appointments/${id}`);

export const appointments = {
  // fetch
  allMyAppointments: allAppointments,
  get: getAppointment,
  withUser: withUserAppointments,
  myAppointmentsWithUser: myAppointmentsWithUser,
  // getUsersInvolved: getAppointmentUsersInvolved,

  // modify
  create: createAppointment,
  update: updateAppointment,
  delete: deleteAppointment,
};

// ===== MESSAGES =====

/**
 * @typedef {import("../../../server/db/messages.js").Message} Message
 */

// const MESSAGES_PAGE_SIZE = 10;
// const messagesPagination = withPagination(MESSAGES_PAGE_SIZE);

/**
 * TODO: fix the return type
 * @returns
 */
const getAllConvosWithSelf = () => sendAPIReq("GET", "/api/messages");

// /**
//  * Get all messages in the database
//  * @returns {Promise<PaginatedArray<Message>>}
//  */
// const getAllMessages = () => mock.messages.allDocs({ include_docs: true });

// /**
//  * Get all messages involving a specific user
//  * @param {string} userId
//  * @returns {Promise<{ docs: Message[] }>}
//  */
// const getAllMessagesInvolvingUser = (userId) =>
//   mock.messages.find({
//     selector: {
//       $or: [{ fromId: { $eq: userId } }, { toId: { $eq: userId } }],
//     },
//     // sort: ["time"],
//   });

// /**
//  * Get messages involving a specific user, paginated.
//  * FIXME: pagination does not correctly give newest messages first
//  * @param {string} userId
//  * @param {number} page
//  * @returns {Promise<PaginatedArray<Message>>}
//  */
// const getMessagesInvolvingUser = (userId, page = 1) => {
//   console.warn("pagination does not correctly give newest messages first");
//   messagesPagination(page, (opts) =>
//     mock.messages.find({
//       selector: {
//         $or: [{ fromId: { $eq: userId } }, { toId: { $eq: userId } }],
//       },
//       // use_index: ['time', 'fromId', 'toId'],
//       // sort: ['time'],
//       ...opts,
//     }),
//   );
// };

/**
 * TODO: should `createMessage` return anything? just the status of the
 * operation?
 * TODO: should this be turned into "send message" instead? where you're only
 * allowed to "create" messages that are "to" someone else "from" the current
 * user?
 *
 * Create new message.
 * NOTE: Should not include & not return ID!
 * @param {Message} data
 * @returns {Promise<Message>}
 */
const sendMessage = (toId, msg) =>
  sendAPIReq("POST", `/api/users/${toId}/message`, { msg });

// /**
//  * TODO: should `createMessage` return anything? just the status of the
//  operation?
//  * TODO: should this be turned into "send message" instead? where you're only
//  allowed to "create" messages that are "to" someone else "from" the current
//  user?
//  *
//  * Create new message.
//  * NOTE: Should not include & not return ID!
//  * @param {Message} data
//  * @returns {Promise<Message>}
//  */
// const createMessage = () =>
// sendAPIReq("POST", `/api/messages`);

// const createMessage = (data) => {
//   const newMsg = {
//     ...data,
//     time: Date.now(),
//   };
//   mock.messages.post(newMsg);
//   return newMsg;
// };

// TODO: should I add functions to get all messages?
export const messages = {
  // fetch
  // all: getAllMessages,
  allMyConvos: getAllConvosWithSelf, // returns conversations
  // allWithUser: getAllMessagesInvolvingUser,
  // getWithUser: getMessagesInvolvingUser, // paginated

  // modify
  // create: createMessage,
  send: sendMessage,
};

// ===== USERS =====

/**
 * @typedef {import("../../../server/db/users.js").User} User
 */

const USERS_PAGE_SIZE = 5;
const userPagination = withPagination(USERS_PAGE_SIZE);

// TODO  handle password in backend

const sendAPIReq = async (method, path, body, opts = {}) => {
  if (body && !(body instanceof FormData)) body = JSON.stringify(body);

  const res = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body || null,
    ...opts,
  });

  if (!res.ok && !opts.noThrow) {
    const { message } = await res.json();

    throw new Error(message);
  }

  return res.json();
};

/**
 * Obtain user given credentials. Throws error if no user found.
 * @param {{ username: string, password: string }} args
 * @returns {Promise<User>}
 */
const loginUser = ({ username, password }) =>
  sendAPIReq("POST", "/login", { username, password });

/**
 * Register user given credentials. Throws error if user already exists with
 * email or username.
 * @param {{ name: string, username: string, email: string, password: string }}
 *     param0
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
 * @returns {Promise<User>}
 */
const getUser = (id) => sendAPIReq("GET", `/api/users/${id}`);

/**
 * Obtain user by username
 * @param {string} username
 * @returns {Promise<User>}
 */
const getUserByUsername = (username) =>
  sendAPIReq("GET", `/api/users/@${username}`);

/**
 * Get users that have ANY of the skills listed AND any of the skills wanted.
 * NOTE: uses pagination, but behind the scenes it fetches ALL users and filters
 * each time, since this query does not allow for an index to be used.
 * @param {number} page
 * @param {string[]} known
 * @param {string[]} interests
 * @returns
 */
const allUsersWithSkills = (page = 1, known = [], interests = []) => {
  const search = new URLSearchParams({
    page,
    known: known.join(","),
    interests: interests.join(","),
  });

  return sendAPIReq("GET", `/api/users?${search}`);
};

/**
 * @param {string} id
 * @param {object} data Data to update
 * @returns {User}
 */
const updateUser = (id, data) => sendAPIReq("PUT", `/api/users/${id}`, data);

const updateUserAvatar = (id, avatar) => {
  const formData = new FormData();
  formData.append("avatar", avatar);

  return sendAPIReq("PUT", `/api/users/${id}/avatar`, formData, {
    headers: {}, // remove 'Content-Type' header
  });
};

export const users = {
  login: loginUser,
  register: registerUser,
  logout: logoutUser,

  get: getUser,
  getByUsername: getUserByUsername,
  withSkills: allUsersWithSkills,

  update: updateUser,
  updateAvatar: updateUserAvatar,
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
