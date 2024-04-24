if (typeof PouchDB === "undefined") {
  console.error("PouchDB not found");
}

/**
 * Database for explicitly local data
 */
export const store = new PouchDB("local");

// keep all data in one row
export const LOCAL_ID = "data";

/**
 * Initialize the local storage with data
 * @param {Object} data
 * @returns {Promise<import(".").PouchDBResponse}
 */
export const init = (data) =>
  store.put({
    ...data,
    _id: LOCAL_ID,
  });

/**
 * Get all data from local storage
 * @returns {Promise<any[]?>}
 */
export const all = async () => {
  try {
    return await store.get(LOCAL_ID);
  } catch (err) {
    return null;
  }
};

/**
 * Obtain a value from local storage
 * @param {string} key
 * @returns {Promise<any>}
 */
export const get = async (key) => {
  const data = await all();
  return data?.[key];
};

/**
 * Set a key-value pair in local storage
 * @param {string} key
 * @param {any} value
 * @returns {Promise<import(".").PouchDBResponse>}
 */
export const set = async (key, value) => {
  let data = await all();

  if (!data) {
    await init();
    data = await all();
  }

  if (value) data[key] = value;
  else delete data[key];

  return store.put(data);
};
