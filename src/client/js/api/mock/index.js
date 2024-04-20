if (typeof PouchDB === "undefined") {
  console.error("PouchDB not found");
}

export const users = new PouchDB("users");
export const appointments = new PouchDB("appointments");

const initialize = async (db, key) => {
  const info = await db.info();

  if (info.update_seq === 0) {
    const mock = await import("./initial.js");

    if (!(key in mock))
      throw new Error(`'${key}' is not a valid key for mocking DB ${db.name}`);

    await db.bulkDocs(mock[key]);

    console.info(`[MOCK] Initialized ${db.name} mock data`);
  }
};

export default Promise.all([
  initialize(users, "MOCK_USERS"),
  initialize(appointments, "MOCK_APPOINTMENTS"),
]);
