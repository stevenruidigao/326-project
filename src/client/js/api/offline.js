import "/js/libs/pouchdb.min.js";

/**
 * @typedef {import("../../../server/db/users.js").User} User
 * @typedef {import("../../../server/db/messages.js").Message} Message
 * @typedef {import("../../../server/db/appointments.js").Appointment}
 * Appointment
 *
 * @typedef {{ users: User, messages: Message, appointments: Appointment }}
 * RecordTypes
 */

export const records = {
  users : new PouchDB("offline-users"),
  appointments : new PouchDB("offline-appointments"),
  messages : new PouchDB("offline-messages"),
  other : new PouchDB("offline-other"),
};

/**
 * Whether the last request failed due to a network error.
 */
let lastRequestFailed = false;

/**
 * Return whether the user is online.
 * @returns {boolean}
 */
export const isOnline = () => navigator.onLine && !window.TEST_OFFLINE;

/**
 * Return whether the user is offline.
 * Takes into account whether the last request failed due to a network error
 * @returns {boolean}
 */
export const isOffline = () => !isOnline() || lastRequestFailed;

/**
 * Parse whether an error is a network error.
 * Primarily concerned with offline status vs other network issues.
 * If it is, show the offline status in navbar.
 * - Chrome: TypeError: Failed to fetch
 * - Firefox: TypeError: NetworkError when attempting to fetch resource.
 * @param {Error} err
 * @returns {boolean}
 */
export const isNetworkError = (err) => {
  const is = err.message === "Failed to fetch" ||
             err.message === "NetworkError when attempting to fetch resource.";

  if (is)
    lastRequestFailed = true;

  return is;
};

/**
 * Wrap API call with an offline fallback to use when offline.
 * The fallback will be called if the user is offline or if the API call fails
 * due to a network error. When a network error occurs, the offline status will
 * be shown in the navbar, which may be hidden quickly after, depending on the
 * value of `navigator.onLine`.
 * @template {T}
 * @param {T} func
 * @param {T} fallback
 * @returns {T}
 */
export const withFallback = (func, fallback) => {
  return async (...args) => {
    if (!isOnline()) {
      return fallback(...args);
    }

    try {
      const res = await func(...args);
      lastRequestFailed = false;
      return res;
    } catch (err) {
      if (isNetworkError(err))
        return fallback(...args);

      throw err;
    }
  };
};

/**
 * Wrap API call with no support for offline usage (eg. POST requests).
 * @see withFallback
 * @template T
 * @param {T} func
 * @returns {T}
 */
export const withoutFallback = (func) => {
  return async (...args) => {
    const error = new Error("You cannot perform this action while offline.");

    if (!isOnline())
      throw error;

    try {
      const res = await func(...args);
      lastRequestFailed = false;
      return res;
    } catch (err) {
      if (isNetworkError(err))
        throw error;

      throw err;
    }
  };
};

/**
 * Add a resource to the offline database. If it already exists, update it.
 * @template {keyof RecordTypes} T
 * @param {T} type
 * @param {RecordTypes[T]} el
 * @returns {Promise<RecordTypes[T]>}
 */
export const addResource = async (type, el) => {
  if (!el?._id)
    return;

  const db = records[type];
  const doc = await db.get(el._id).catch(() => {});

  await db.put({...el, _rev : doc?._rev}, {force : true});

  return el;
};

/**
 * Add multiple resources to the offline database.
 * @template {keyof RecordTypes} T
 * @param {T} type
 * @param {RecordTypes[T][]} el
 * @returns {Promise<RecordTypes[T][]>}
 */
export const addResources = async (
    type,
    data) => { return Promise.all(data.map((el) => addResource(type, el)));};

/**
 * Delete a resource (if it exists) from the offline database.
 * @template {keyof RecordTypes} T
 * @param {T} type
 * @param {RecordTypes[T]} el
 * @returns {Promise<void>}
 */
export const removeResource = async (type, el) => {
  const db = records[type];

  const doc = await db.get(el._id).catch(() => {});

  if (doc) {
    await db.remove(doc);
  }
};

/**
 * Get a resource by its ID from the offline database.
 * @template {keyof RecordTypes} T
 * @param {T} type
 * @param {string} id
 * @returns {Promise<RecordTypes[T]>}
 */
export const getResource = async (type, id) => {
  const db = records[type];

  return db.get(id);
};

/**
 * Find the first matching resource in the offline database.
 * @template {keyof RecordTypes} T
 * @param {T} type
 * @param {(item: RecordTypes[T]) => boolean} func
 * @returns {Promise<RecordTypes[T]?>}
 */
export const findResource = async (type, func) => {
  const db = records[type];

  const arr = await db.allDocs({include_docs : true});

  return arr.rows.map((row) => row.doc).find(func);
};

/**
 * Find all the matching resources in the offline database.
 * @template {keyof RecordTypes} T
 * @param {T} type
 * @param {(item: RecordTypes[T]) => boolean} func
 * @returns {Promise<RecordTypes[T][]>}
 */
export const findResources = async (type, func) => {
  const db = records[type];

  func ||= () => true;

  const arr = await db.allDocs({include_docs : true});

  return arr.rows.map((row) => row.doc).filter(func);
};

/**
 * Clear all offline databases except 'other'
 */
export const clear = () => Promise.all(
    Object.entries(records)
        .filter(([ _, db ]) => db.name !== "other")
        .map(async ([ name, db ]) => {
          await db.destroy({force : true});
          records[name] = new PouchDB(`offline-${name}`);
        }),
);

/**
 * Set the logged in user in the offline database.
 * @param {User} user
 * @returns {Promise<void>}
 */
export const setLoggedInUser = async (user) => {
  const existing = await records["other"].get("loggedInUser").catch(() => null);

  if (!user) {
    if (existing) {
      await records["other"].remove(existing);
    }

    return;
  }

  if (existing?.value === user?._id)
    return;

  const data = {...existing, _id : "loggedInUser", value : user?._id};

  await records["other"].put(data, {force : true});

  addResource("users", user);
};

/**
 * Get the ID of the logged in user from the offline database.
 * @returns {Promise<string?>}
 */
export const getLoggedInUserId = async () => {
  const data = await records["other"].get("loggedInUser").catch(() => {});
  return data?.value;
};

/**
 * Set whether the user should be logged out.
 */
export const setLogOut = (value) => localStorage.setItem("logOut", value);

/**
 * Get whether to log out the user and clear the offline database.
 *
 * @returns {boolean}
 */
export const shouldLogOut = () => localStorage.getItem("logOut") === "true";
