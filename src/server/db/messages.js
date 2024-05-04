import { createDB, withPagination, withSerializer } from "./index.js";

const db = createDB("messages");

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
 * Get all messages involving a specific user
 * @param {string} userId
 * @returns {Promise<Message[]>}
 */
export const getAllMessagesInvolvingUser = async (userId) => {
  const res = await db.find({
    selector: {
      $or: [{ fromId: { $eq: userId } }, { toId: { $eq: userId } }],
    },
    // sort: ["time"],
  });
  return res.docs;
};
