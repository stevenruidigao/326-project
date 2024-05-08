import { createDB } from "../server/db/index.js";

(async () => {
  // USERS
  const users = createDB("users");

  await users.createIndex({
    index: { fields: ["username"] },
  });

  await users.createIndex({
    index: { fields: ["email"] },
  });

  // MESSAGES
  const messages = createDB("messages");

  await messages.createIndex({
    index: { fields: ["fromId"] },
  });

  await messages.createIndex({
    index: { fields: ["toId"] },
  });

  // APPOINTMENTS
  const appointments = createDB("appointments");

  await appointments.createIndex({
    index: { fields: ["learnerId"] },
  });

  await appointments.createIndex({
    index: { fields: ["teacherId"] },
  });
})();
