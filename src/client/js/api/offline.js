import { showOfflineStatus } from "../layout.js";

export const records = {
  /**
   * @type Map<string, User>
   */
  users: new Map(),

  /**
   * @type Map<string, Appointment>
   */
  appointments: new Map(),

  /**
   * @type Map<string, Message>
   */
  messages: new Map(),

  loggedInUser: null,
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

  const map = records[type];

  map.set(el._id, el);

  return el;
};

export const addResources = async (type, data) => {
  return Promise.all(data.map((el) => addResource(type, el)));
};

export const removeResource = async (type, el) => {
  const map = records[type];

  map.remove(el._id);
};

export const getResource = async (type, id) => {
  const map = records[type];

  return map.get(id);
};

export const findResource = async (type, func) => {
  const map = records[type];

  return Array.from(map.values()).find(func);
};

export const findResources = async (type, func) => {
  const map = records[type];

  func ||= () => true;

  return Array.from(map.values()).filter(func);
};

export const setLoggedInUser = async (user) => {
  records.loggedInUser = user?._id;
  addResource("users", user);
};

export const getLoggedInUserId = async () => records.loggedInUser;
