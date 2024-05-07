import { Router } from "express";

import * as messages from "../db/messages.js";
import * as users from "../db/users.js";
import { APIError, requiresAuth } from "./helpers.js";
import asyncHandler from "express-async-handler";
import { withSerializer } from "../db/index.js";

const router = Router();

/**
 * @typedef {import("../db/messages.js").Message} Message
 */

// const MESSAGES_PAGE_SIZE = 10;
// const messagesPagination = withPagination(MESSAGES_PAGE_SIZE);

/**
 * Gets all conversations for the current user
 */
router.get(
  "/messages",
  requiresAuth,
  asyncHandler(async (req, res) => {
    const curId = req.user._id;

    const allMessages = await messages.getAllMessagesInvolvingUser(curId);

    const conversations = allMessages.reduce((acc, msg) => {
      const otherUserId = msg.fromId === curId ? msg.toId : msg.fromId;
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

    res.json(conversations);
  }),
);

/**
 * TODO: probably don't return the full message object? don't expose an ID BUT still need to return the sent message
 * Send a message to a user
 * @param {string} toId
 * @param {string} text
 * @returns {Promise<Message>} the created message (with no message ID)
 */
router.post(
  "/users/:id/message",
  requiresAuth,
  asyncHandler(async (req, res) => {
    const toId = req.params.id;
    const text = req.body.msg;

    if (!text) {
      throw new APIError("Message text is required", 400);
    }

    const toUser = await users.findUser(toId);
    if (!toUser) {
      throw new APIError("User not found", 404);
    } else if (toUser._id === req.user._id) {
      throw new APIError("Cannot message yourself", 400);
    }

    const newMsg = {
      fromId: req.user._id,
      toId: toUser._id,
      text,
      time: Date.now(),
    };

    // don't return the created message in case it has sensitive info
    await messages.createMessage(newMsg);

    res.json(newMsg);
  }),
);

// /**
//  * Get all messages in the database
//  * @returns {Promise<PaginatedArray<Message>>}
//  */
// const getAllMessages = () => mock.messages.allDocs({ include_docs: true });

// /**
//  * Create new message.
//  * NOTE: Should not include & not return ID!
//  * @param {Message} data
//  * @returns {Promise<Message>}
//  */
// const createMessage = (data) => {
//   const newMsg = {
//     ...data,
//     time: Date.now(),
//   };
//   mock.messages.post(newMsg);
//   return newMsg;
// };

export default router;
