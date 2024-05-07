import * as offline from "./offline.js";

/**
 * @typedef {T[] & { pagination?: { prev?: number, next?: number, total?: number
 * }}} PaginatedArray<T>
 * @template {any} T
 */

// ===== APPOINTMENTS =====

/**
 *
 * @param {number} page
 * @returns {Promise<Appointment[]>}
 */
const allAppointments = offline.withFallback(
    () => sendAPIReq("GET", "/api/appointments")
              .then(
                  (appts) => offline.addResources("appointments", appts),
                  ),
    async () => {
      const appts = await offline.findResources("appointments");
      const curId = (await session.current())?._id;

      return appts.filter(
          (appt) => appt.teacherId === curId || appt.learnerId === curId,
      );
    },
);

/**
 * uses `allAppointments` but filters for a specific other user
 */
const myAppointmentsWithUser = (userId) => allAppointments().then(
    (appts) => appts.filter(
        (appt) => appt.teacherId === userId || appt.learnerId === userId,
        ),
);

const withUserAppointments = offline.withFallback(
    (userId) =>
        sendAPIReq("GET", `/api/users/${userId}/appointments`).then((data) => {
          offline.addResources("appointments", data.appointments);
          offline.addResources("users", Object.values(data.idToUserMap));

          return data;
        }),
    async (userId) => {
      const appts = await offline.findResources("appointments");
      const curId = (await session.current())?._id;

      const filteredAppts = appts.filter(
          (appt) => (appt.teacherId === curId || appt.learnerId === curId) &&
                    (appt.teacherId === userId || appt.learnerId === userId),
      );

      return {appointments : filteredAppts, idToUserMap : {}};
    },
);

/**
 * Obtain a specific appointment by ID
 * @param {string} id
 * @returns {Promise<Appointment>}
 */
const getAppointment = offline.withFallback(
    (id) => sendAPIReq("GET", `/api/appointments/${id}`)
                .then(
                    (appt) => offline.addResource("appointments", appt),
                    ),
    (id) => offline.getResource("appointments", id),
);

/**
 * Create a new appointment
 * @param {string} targetUserId
 * @param {Appointment} data
 * @returns {Promise<{ appointments: Appointment[], idToUserMap: Record<String,
 *     User> }>}
 */
const createAppointment = offline.withoutFallback(
    (targetUserId, data) =>
        sendAPIReq("POST", `/api/users/${targetUserId}/appointments`, data),
);

/**
 * Update an appointment's data
 * @param {string} id
 * @param {Appointment} data
 * @returns {Promise<Appointment>}
 */
const updateAppointment = offline.withoutFallback(
    async (id, data) =>
        sendAPIReq("PUT", `/api/appointments/${id}`, data)
            .then(
                (appt) => offline.addResource("appointments", appt),
                ),
);

/**
 * Delete an appointment
 * @param {string} id
 * @returns {Promise<void>}
 * @throws {Error} if appointment does not exist
 */
const deleteAppointment = offline.withoutFallback(
    async (id) => sendAPIReq("DELETE", `/api/appointments/${id}`)
                      .then(
                          () => offline.removeResource("appointments", id),
                          ),
);

export const appointments = {
  // fetch
  allMyAppointments : allAppointments,
  get : getAppointment,
  withUser : withUserAppointments,
  myAppointmentsWithUser : myAppointmentsWithUser,

  // modify
  create : createAppointment,
  update : updateAppointment,
  delete : deleteAppointment,
};

// ===== MESSAGES =====

/**
 * @typedef {import("../../../server/db/messages.js").Message} Message
 */

/**
 * @returns {Promise<Record<string, Message[]>>} maps user IDs to their
 *     conversation with the current user
 */
const getAllConvosWithSelf = offline.withFallback(
    () => sendAPIReq("GET", "/api/messages").then(async (data) => {
      await offline.addResources("messages", Object.values(data).flat());

      return data;
    }),
    () => offline.findResources("messages").then(async (msgs) => {
      const curId = (await session.current())?._id;

      return msgs.reduce((acc, msg) => {
        const otherId = msg.fromId === curId ? msg.toId : msg.fromId;

        acc[otherId] ||= [];
        acc[otherId].push(msg);

        return acc;
      }, {});
    }),
);

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
const sendMessage = offline.withoutFallback(
    (toId, msg) => sendAPIReq("POST", `/api/users/${toId}/message`, {msg}),
);

// TODO: should I add functions to get all messages?
export const messages = {
  allMyConvos : getAllConvosWithSelf, // returns conversations

  send : sendMessage,
};

// ===== USERS =====

/**
 * @typedef {import("../../../server/db/users.js").User} User
 */

// TODO  handle password in backend

const sendAPIReq = async (method, path, body, opts = {}) => {
  if (body && !(body instanceof FormData))
    body = JSON.stringify(body);

  const res = await fetch(path, {
    method,
    headers : {
      "Content-Type" : "application/json",
    },
    body : body || null,
    ...opts,
  });

  if (!res.ok && !opts.noThrow) {
    const {message} = await res.json();

    throw new Error(message);
  }

  return res.json();
};

/**
 * Obtain user given credentials. Throws error if no user found.
 * @param {{ username: string, password: string }} args
 * @returns {Promise<User>}
 */
const loginUser = offline.withoutFallback(
    ({username, password}) =>
        sendAPIReq("POST", "/login", {username, password}),
);

/**
 * Register user given credentials. Throws error if user already exists with
 * email or username.
 * @param {{ name: string, username: string, email: string, password: string }}
 *     param0
 * @returns {Promise<PouchDBResponse>}
 */
const registerUser = offline.withoutFallback(
    ({name, username, email, password}) =>
        sendAPIReq("POST", "/signup", {name, username, email, password}),
);

/**
 * Logout user
 * @returns {Promise<void>}
 */
const logoutUser = offline.withFallback(
    () => sendAPIReq("POST", "/logout").then(() => offline.setLogOut(false)),
    async () => {
      await offline.clear();
      await offline.setLogOut(true);
    },
);

/**
 * Obtain user by ID
 * @param {string} id
 * @returns {Promise<User>}
 */
const getUser = offline.withFallback(
    (id) => sendAPIReq("GET", `/api/users/${id}`)
                .then(
                    (user) => offline.addResource("users", user),
                    ),
    (id) => id.startsWith("@")
                ? offline.findResource("users",
                                       (user) => user.username === id.slice(1))
                : offline.getResource("users", id),
);

/**
 * Get users that have ANY of the skills listed AND any of the skills wanted.
 * NOTE: uses pagination, but behind the scenes it fetches ALL users and filters
 * each time, since this query does not allow for an index to be used.
 * @param {number} page
 * @param {string[]} known
 * @param {string[]} interests
 * @returns
 */
const allUsersWithSkills = offline.withFallback(
    async (page = 1, known = [], interests = []) => {
      const search = new URLSearchParams({
        page,
        known : known.join(","),
        interests : interests.join(","),
      });

      const res = await sendAPIReq("GET", `/api/users?${search}`);

      offline.addResources("users", res.data);

      return res;
    },
    async (_, known = [], interests = []) => {
      const users = await offline.findResources("users");

      const filtered = users.filter(
          (user) =>
              (!known.length ||
               known.some((skill) => user.known?.includes(skill))) &&
              (!interests.length ||
               interests.some((skill) => user.interests?.includes(skill))),
      );

      return {data : filtered, pagination : {}};
    },
);

/**
 * @param {string} id
 * @param {object} data Data to update
 * @returns {User}
 */
const updateUser = offline.withoutFallback(
    (id, data) => sendAPIReq("PUT", `/api/users/${id}`, data),
);

const updateUserAvatar = offline.withoutFallback((id, avatar) => {
  const formData = new FormData();
  formData.append("avatar", avatar);

  return sendAPIReq("PUT", `/api/users/${id}/avatar`, formData, {
    headers : {}, // remove 'Content-Type' header
  });
});

export const users = {
  login : loginUser,
  register : registerUser,
  logout : logoutUser,

  get : getUser,
  withSkills : allUsersWithSkills,

  update : updateUser,
  updateAvatar : updateUserAvatar,
};

// ===== SESSION =====

// session user data to prevent multiple fetches
let currentUser = undefined;
let isLoadingCurrentUser = false;

/**
 * Store the current session user
 * @param {User} u
 * @returns {User}
 */
const setSessionCurrent = (u) => {
  offline.setLoggedInUser(u);
  return (currentUser = u);
};

/**
 * Obtain the current session user. Fetches if not already stored.
 * @returns {Promise<User?>}
 */
const getSessionCurrent = async () => {
  if (currentUser !== undefined || isLoadingCurrentUser)
    return currentUser;

  // avoid fetching while already fetching
  isLoadingCurrentUser = true;

  try {
    setSessionCurrent(await getSessionUser());

    isLoadingCurrentUser = false;

    return currentUser;
  } catch (err) {
    setSessionCurrent(undefined);
    isLoadingCurrentUser = false;

    throw err;
  }
};

/**
 * Get current logged-in user from session data
 * @returns {Promise<User?>}
 */
const getSessionUser = offline.withFallback(
    async () => {
      const res = await sendAPIReq("GET", "/api/me", undefined, {
        noThrow : true,
      });

      if (res.status === 401)
        return null;
      else if (res.status)
        throw new Error(res.message);

      await offline.setLoggedInUser(res);

      return res;
    },
    async () => {
      const id = await offline.getLoggedInUserId();

      return offline.getResource("users", id);
    },
);

export const session = {
  getUser : getSessionUser,

  current : getSessionCurrent,
  setCurrent : setSessionCurrent,
};
