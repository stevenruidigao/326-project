import { Router } from "express";

import * as messages from "../db/messages.js";
import * as users from "../db/users.js";
import { APIError, requiresAuth } from "./helpers.js";
import asyncHandler from "express-async-handler";
import { withSerializer } from "../db/index.js";

const router = Router();

// ===== MESSAGES =====

const MESSAGES_PAGE_SIZE = 10;
const messagesPagination = withPagination(MESSAGES_PAGE_SIZE);

router.get(
  "/messages",
  requiresAuth,
  asyncHandler(async (req, res) => {
    const curId = req.user._id;

    const allMessages = await messages.getAllMessagesInvolvingUser(
      req.params.id,
    );

    const conversations = allMessages.reduce((acc, msg) => {
      const otherUserId = msg.fromId === curId._id ? msg.toId : msg.fromId;
      if (!acc[otherUserId]) {
        acc[otherUserId] = [];
      }
      acc[otherUserId].push(msg);
      return acc;
    }, {});

    // in-place sort conversations by most recent message
    for (const convoKey in conversations) {
      conversations[convoKey].sort((a, b) => b.time - a.time);
    }

    return conversations;
  }),
);

/**
 * Get all messages in the database
 * @returns {Promise<PaginatedArray<Message>>}
 */
const getAllMessages = () => mock.messages.allDocs({ include_docs: true });

/**
 * Get all messages involving a specific user
 * @param {string} userId
 * @returns {Promise<{ docs: Message[] }>}
 */
const getAllMessagesInvolvingUser = (userId) =>
  mock.messages.find({
    selector: {
      $or: [{ fromId: { $eq: userId } }, { toId: { $eq: userId } }],
    },
    // sort: ["time"],
  });

/**
 * Get messages involving a specific user, paginated.
 * FIXME: pagination does not correctly give newest messages first
 * @param {string} userId
 * @param {number} page
 * @returns {Promise<PaginatedArray<Message>>}
 */
const getMessagesInvolvingUser = (userId, page = 1) => {
  console.warn("pagination does not correctly give newest messages first");
  messagesPagination(page, (opts) =>
    mock.messages.find({
      selector: {
        $or: [{ fromId: { $eq: userId } }, { toId: { $eq: userId } }],
      },
      // use_index: ['time', 'fromId', 'toId'],
      // sort: ['time'],
      ...opts,
    }),
  );
};

/**
 * Create new message.
 * NOTE: Should not include & not return ID!
 * @param {Message} data
 * @returns {Promise<Message>}
 */
const createMessage = (data) => {
  const newMsg = {
    ...data,
    time: Date.now(),
  };
  mock.messages.post(newMsg);
  return newMsg;
};

export default router;
