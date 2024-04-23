if (typeof PouchDB === "undefined") {
  console.error("PouchDB not found");
}

export const users = new PouchDB("users");
export const appointments = new PouchDB("appointments");
export const session = new PouchDB("mock");
export const messages = new PouchDB("messages");

const initialize = async (db, key, cb) => {
  const info = await db.info();

  if (info.update_seq === 0) {
    const mock = await import("./initial.js");

    if (!(key in mock))
      throw new Error(`'${key}' is not a valid key for mocking DB ${db.name}`);

    await db.bulkDocs(mock[key]);

    if (cb)
      await cb(db);

    console.info(`[MOCK] Initialized ${db.name} mock data`);
  }
};

const createIndex =
    async (db, ...fields) => { await db.createIndex({index : {fields}}); };

// used to allow other files to know the status of mock api
// allows them to wait for mock api to initialize first
export default Promise.all([
  initialize(users, "MOCK_USERS"),
  initialize(appointments, "MOCK_APPOINTMENTS"),
  initialize(messages, "MOCK_MESSAGES",
             (db) => createIndex(db, "time" /*, "fromId", "toId"*/)),
]);
