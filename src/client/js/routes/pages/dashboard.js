import { app } from "../helper.js";
import * as api from "../../api/index.js";
import * as routes from "../index.js";
import { formatRelative, formatTimeVerbose } from "../../dayjs.js";

const NUM_MSG_PREVIEWS = 3;
const APPT_PAGE_SIZE = 8;

// TODO: consider using the `onunload` when websockets are implemented to close the connection here

/**
 * Shows the dashboard page for the current logged-in user (at /dashboard)
 * @param {any} args - unused (no args expected)
 * @param {DocumentFragment} doc - the document fragment containing useful elements
 */
export default async (args, doc) => {
  app.innerHTML = "";

  console.log("** dashboard loaded with args", args);

  // get user id if logged in, otherwise redirect to home
  const user = await api.session.current();

  // FIXME: redirect to login page instead of home
  if (!user) {
    console.log(`[dashboard] user not logged in! returning to home`);
    return routes.goToRoute("home");
  }

  // show latest messages
  // NOTE: if unread messages are implemented, show those here instead

  // get all conversations
  const conversations = await api.messages.allMyConvos();
  console.log("funny");
  // const allUserMessages = (await api.messages.allWithUser(user._id)).docs;

  // group messages by user
  // const conversations = allUserMessages.reduce((acc, msg) => {
  //   const otherUserId = msg.fromId === user._id ? msg.toId : msg.fromId;
  //   if (!acc[otherUserId]) {
  //     acc[otherUserId] = [];
  //   }
  //   acc[otherUserId].push(msg);
  //   return acc;
  // }, {});

  // in-place sort conversations by most recent message, then set it to the most recent message
  // for (const convoKey in conversations) {
  //   conversations[convoKey].sort((a, b) => b.time - a.time);
  // }

  // map conversations to their most recent message
  const mostRecentMessages = Object.keys(conversations)
    .map((userId) => {
      const convo = conversations[userId];
      return convo[0];
    })
    .sort((a, b) => b.time - a.time)
    .slice(0, NUM_MSG_PREVIEWS);

  // initializes the message container
  const messageContainerEl = doc
    .querySelector("#message-container")
    .cloneNode(true);
  const messageListEl = messageContainerEl.querySelector("#message-list");

  // creates and appends message preview elements
  messageListEl.append(
    ...(await Promise.all(
      mostRecentMessages.map(async (msg) => {
        const otherUser = await api.users.get(
          msg.fromId === user._id ? msg.toId : msg.fromId,
        );

        const msgPreviewEl = doc
          .querySelector(".message-preview")
          .cloneNode(true);

        // routes link to the right convo
        const linkEl = msgPreviewEl.querySelector("a");
        linkEl.setAttribute(":id", otherUser._id);

        linkEl.querySelector(".name").innerText = otherUser.name;
        linkEl.querySelector(".msg-timestamp").innerText = formatRelative(
          msg.time,
        );

        linkEl.querySelector(".msg-text").innerText = msg.text;

        const avatar = await api.users.getAvatar(otherUser);

        linkEl.querySelector("img").src = avatar
          ? URL.createObjectURL(avatar)
          : "/images/logo.png";

        return msgPreviewEl;
      }),
    )),
  );

  app.append(messageContainerEl);

  // ################# show all upcoming appointments? #################

  /**
   * Creates and returns a new appointment element with the given appointment data
   *
   * @param {Appointment} appt - The appointment data to render.
   * @returns {Promise<Element>} - A promise that resolves to the new appointment element.
   */
  const createNewAppointmentEl = async (appt) => {
    const apptEl = doc.querySelector(".appointment").cloneNode(true);

    const apptRole = appt.teacherId === user._id ? "Teaching" : "Learning";
    const time = `${formatTimeVerbose(appt.time)} - ${formatRelative(appt.time)}`;

    const otherUser = await api.users.get(
      appt.teacherId === user._id ? appt.learnerId : appt.teacherId,
    );

    apptEl.querySelector(".name").innerText = otherUser.name;
    apptEl.querySelector(".time").innerText = time;
    apptEl.querySelector("span.role").innerText = apptRole;
    apptEl.querySelector("span.topic").innerText = appt.topic;
    apptEl.querySelector("span.type").innerText = appt.type;
    if (!appt.url) {
      apptEl.querySelector(".url-container").remove();
    } else {
      apptEl.querySelector("a.url").innerText = appt.url;
      apptEl.querySelector("a.url").setAttribute("href", appt.url);
    }

    apptEl.querySelector("a").setAttribute(":id", otherUser._id);

    return apptEl;
  };

  /**
   * Fetches all appointments with the current user
   * Bypasses the pagination in the API since the API doesn't correctly sort appointments yet
   *
   * @returns {Promise<Appointment[]>} - A promise that resolves to the new appointment element.
   */
  const getAllApptsWithUser = async () => {
    const allAppts = [];
    for (let curPage = 1; ; curPage++) {
      const response = await api.appointments.withUser(user._id, curPage);
      if (response.length === 0) break;

      allAppts.push(...Array.from(response));
    }
    return allAppts;
  };

  // get all future appointments
  const curTime = Date.now();
  const futureAppts = (await getAllApptsWithUser()).filter((appt) => {
    return curTime < appt.time;
  });

  // sort appointments by time in place
  futureAppts.sort((a, b) => a.time - b.time);

  const apptContainerEl = doc
    .querySelector("#appointment-container")
    .cloneNode(true);

  apptContainerEl.querySelector("#appointment-list").append(
    ...(await Promise.all(
      futureAppts.map(async (appt) => {
        return createNewAppointmentEl(appt);
      }),
    )),
  );

  app.append(apptContainerEl);
};
