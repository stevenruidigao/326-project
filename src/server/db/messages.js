import {createDB, withPagination, withSerializer} from "./index.js";

export const db = createDB("messages");

/**
 * @typedef {{
 *      fromId: string,
 *      toId: string,
 *      time: number,
 *      text: string
 *  }} Message
 *
 * TODO: typedef conversations
 * @typedef {
 *
 * } Conversations
 *
 * TODO
 */

// /**
//  * Get all messages in the database
//  * @returns {Promise<Message[]>}
//  */
// export const getAllMessages = async () => {
// //   const res = await db.allDocs({ include_docs: true });
//   return (await db.allDocs({ include_docs: true })).docs;
// //   return res.rows.map((r) => r.doc);
// };

/**
 * TODO: errors?
 * Get all messages involving a specific user
 * @param {string} userId
 * @returns {Promise<Message[]>}
 */
export const getAllMessagesInvolvingUser = async (userId) => {
  const [from, to] = await Promise.all([
    db.find({selector : {fromId : {$eq : userId}}}),
    db.find({selector : {toId : {$eq : userId}}}),
  ]);

  const messages = [...from.docs, ...to.docs ];

  // filter out duplicates just in case :)
  return messages.filter(
      (msg, index) => messages.findIndex((v) => v._id === msg._id) === index,
  );
};

/**
 * TODO: errors?
 * FIXME: what should I return here?
 * Create a new message
 * @param {Message} message
 * @returns {Promise<Message>}
 */
export const createMessage = async (message) => {
  await db.post(message);
  return message;
};
