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
 * TODO: probably don't return the full message object? exposes an ID? maybe just return a status/nothing?
 * Send a message to a user
 * @param {string} toId
 * @param {string} text
 * @returns TODO
 */
router.post(
  "/messages",
  requiresAuth,
  asyncHandler(async (req, res) => {
    const toId = req.body.toId;
    const text = req.body.msg;

    if (!text) {
      throw new APIError("Message text is required", 400);
    }

    const toUser = await users.findUser(toId);
    if (!toUser) {
      throw new APIError("User not found", 404);
    }

    const message = await messages.createMessage({
      fromId: req.user._id,
      toId: toUser._id,
      text,
      time: Date.now(),
    });

    return message;
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
