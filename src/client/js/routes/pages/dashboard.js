import { app } from "../helper.js";
import * as api from "../../api/index.js";
import * as routes from "../index.js";

const NUM_MSG_PREVIEWS = 3;

export const onunload = async (prev, next) => {
  // TODO: when websockets are implemented, close the connection here
  
  console.log(`[dashboard] unloading ${prev.file} for ${next.file}!`);
};

export default async (args, doc) => {
  app.innerHTML = "";

  console.log("** dashboard loaded with args", args);

  // get user id if logged in, otherwise redirect to home
  const user = await api.session.getUser();

  if (!user) {
    console.log(`[dashboard] user not logged in! returning to home`);
    return routes.goToRoute("home");
  }

  // TODO: show latest messages? don't have unread messages so can't show unreads

  // get all conversations
  const allUserMessages = (await api.messages.allWithUser(user._id)).docs;

  // group messages by user
  const conversations = allUserMessages.reduce((acc, msg) => {
    const otherUserId = msg.fromId === user._id ? msg.toId : msg.fromId;
    if (!acc[otherUserId]) {
      acc[otherUserId] = [];
    }
    acc[otherUserId].push(msg);
    return acc;
  }, {});

  // const mostRecentMessages = {};
  // in-place sort conversations by most recent message, then set it to the most recent message
  for (const convoKey in conversations) {
    conversations[convoKey].sort((a, b) => b.time - a.time);
    // mostRecentMessages[convoKey] = conversations[convoKey][0];
  }

  console.log("[dashboard] fetched most recent conversations", conversations);
  // console.log("[dashboard] fetched most recent messages", mostRecentMessages);

  // map conversations to their most recent message
  const mostRecentMessages = Object.keys(conversations).map((userId) => {
    const convo = conversations[userId];
    return convo[0];
  })
  .sort((a, b) => b.time - a.time)
  .slice(0, NUM_MSG_PREVIEWS);

  console.log("[dashboard] mapped most recent messages", mostRecentMessages);

  const messageContainerEl = doc.querySelector("#message-container").cloneNode(true);
  const messageListEl = messageContainerEl.querySelector("#message-list");

  messageListEl.append(...
    await Promise.all(mostRecentMessages.map(async (msg) => {
      const otherUser = await api.users.get(msg.fromId === user._id ? msg.toId : msg.fromId);
      
      const msgPreviewEl = doc.querySelector(".message-preview").cloneNode(true);


      // routes link to the right convo
      const linkEl = msgPreviewEl.querySelector("a");
      linkEl.setAttribute(":id", otherUser._id);

      // linkEl.querySelector(".username").innerText = otherUser.username;
      linkEl.querySelector(".name").innerText = otherUser.name;

      const msgDate = new Date(msg.time);
      const nowDate = new Date();
      const diff = nowDate - msgDate;

      if (diff < 1000 * 60 * 60 * 24) {
        linkEl.querySelector(".msg-timestamp").innerText = msgDate.toLocaleTimeString(undefined, {hour: 'numeric', minute: '2-digit'});
      }
      else {
        linkEl.querySelector(".msg-timestamp").innerText = msgDate.toLocaleDateString();
      }

      // linkEl.querySelector(".msg-timestamp").innerText = .toLocaleDateString();

      linkEl.querySelector(".msg-text").innerText = msg.text;

      const avatar = await api.users.getAvatar(otherUser);

      linkEl.querySelector("img").src = avatar
        ? URL.createObjectURL(avatar)
        : "/images/logo.png";

      return msgPreviewEl;
    }
  )));

  app.append(messageContainerEl);


  // TODO: show all upcoming appointments?


  // unpaginated get all appointments by calling until no more next
  const getAllApptsWithUser = async () => {
    const allAppts = [];
    for (let curPage = 1; ; curPage++) {
      const response = await api.appointments.withUser(user._id, curPage);
      if (response.length === 0) break;

      allAppts.push(...Array.from(response));
    }
    return allAppts;
  };

  const curTime = Date.now();
  // get all future appointments
  const futureAppts = (await getAllApptsWithUser()).filter((appt) => {
    return curTime < appt.time;
  });

  // sort appointments by time in place
  futureAppts.sort((a, b) => b.time - a.time);

  console.log("[dashboard] relevant appts", futureAppts);


};
