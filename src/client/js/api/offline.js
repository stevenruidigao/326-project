import "/js/libs/pouchdb.min.js";

import { showOfflineStatus } from "../layout.js";

export const records = {
  users: new PouchDB("offline-users"),
  appointments: new PouchDB("offline-appointments"),
  messages: new PouchDB("offline-messages"),
  other: new PouchDB("offline-other"),
};

window.records = records; // TODO testing

export const isOffline = () => !navigator.onLine || !!window.TEST_OFFLINE;

// Chrome: TypeError: Failed to fetch
// Firefox: TypeError: NetworkError when attempting to fetch resource.
export const isNetworkError = (err) => {
  const is =
    err.message === "Failed to fetch" ||
    err.message === "NetworkError when attempting to fetch resource.";

  if (is) showOfflineStatus(true);

  return is;
};

/**
 * @template {T}
 * @param {T} func
 * @param {T} fallback
 * @returns {T}
 */
export const withFallback = (func, fallback) => {
  return async (...args) => {
    if (isOffline()) {
      const data = await fallback(...args);

      console.debug(
        "[offline] withFallback",
        ...args,
        "- returning fallback",
        data,
      );

      return data;
    }

    try {
      const res = await func(...args);
      showOfflineStatus(false);
      return res;
    } catch (err) {
      if (isNetworkError(err)) return fallback(...args);

      throw err;
    }
  };
};

/**
 * @template T
 * @param {T} func
 * @returns {T}
 */
export const withoutFallback = (func) => {
  return async (...args) => {
    const error = new Error("You cannot perform this action while offline.");

    if (isOffline()) throw error;

    try {
      const res = await func(...args);
      showOfflineStatus(false);
      return res;
    } catch (err) {
      if (isNetworkError(err)) throw error;

      throw err;
    }
  };
};

// TODO use pouchdb doofus!!!!

/**
 * @template {User|Message|Appointment} T
 * @param {"users"|"messages"|"appointments"} type
 * @param {T} el
 * @returns {T}
 */
export const addResource = async (type, el) => {
  if (!el?._id) return;

  const db = records[type];
  const doc = await db.get(el._id).catch(() => {});

  if ("skills" in el) console.trace("addResource", type, el, doc);

  await db.put({ ...el, _rev: doc?._rev }, { force: true });

  return el;
};

export const addResources = async (type, data) => {
  return Promise.all(data.map((el) => addResource(type, el)));
};

export const removeResource = async (type, el) => {
  const db = records[type];

  const doc = await db.get(el._id).catch(() => {});

  if (doc) {
    await db.remove(doc);
  }
};

export const getResource = async (type, id) => {
  const db = records[type];

  return db.get(id);
};

export const findResource = async (type, func) => {
  const db = records[type];

  const arr = await db.allDocs({ include_docs: true });

  return arr.rows.map((row) => row.doc).find(func);
};

export const findResources = async (type, func) => {
  const db = records[type];

  func ||= () => true;

  const arr = await db.allDocs({ include_docs: true });

  return arr.rows.map((row) => row.doc).filter(func);
};

export const setLoggedInUser = async (user) => {
  const existing = await records["other"].get("loggedInUser").catch(() => {});

  if (!user) {
    if (existing) {
      await records["other"].remove(existing);
    }

    return;
  }

  if (existing?.value === user?._id) return;

  const data = { ...existing, _id: "loggedInUser", value: user?._id };

  await records["other"].put(data, { force: true });

  addResource("users", user);
};

export const getLoggedInUserId = async () => {
  const data = await records["other"].get("loggedInUser").catch(() => {});
  return data?.value;
};
