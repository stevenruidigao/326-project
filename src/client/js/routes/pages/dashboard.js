import * as api from "../../api/index.js";
import {formatRelative, formatTimeVerbose} from "../../dayjs.js";
import {app, setTitle} from "../helper.js";
import * as routes from "../index.js";

const NUM_MSG_PREVIEWS = 3;
const APPT_PAGE_SIZE = 8;

// TODO: consider using the `onunload` when websockets are implemented to close
// the connection here

/**
 * Shows the dashboard page for the current logged-in user (at /dashboard)
 * @param {any} args - unused (no args expected)
 * @param {DocumentFragment} doc - the document fragment containing useful
 *     elements
 */
export default async (args, doc) => {
  app.innerHTML = "";

  setTitle("Dashboard");

  console.log("** dashboard loaded with args", args);

  // get user id if logged in, otherwise redirect to home
  const user = await api.session.current();

  // FIXME: redirect to login page instead of home
  if (!user) {
    console.log("[dashboard] user not logged in! returning to home");
    return routes.goToRoute("login", null, null, true);
  }

  // show latest messages
  // NOTE: if unread messages are implemented, show those here instead

  // get all conversations
  const conversations = await api.messages.allMyConvos();
  // const allUserMessages = (await api.messages.allWithUser(user._id)).docs;

  // map conversations to their most recent message
  const mostRecentMessages = Object.keys(conversations)
                                 .map((userId) => {
                                   const convo = conversations[userId];
                                   return convo[0];
                                 })
                                 .sort((a, b) => b.time - a.time)
                                 .slice(0, NUM_MSG_PREVIEWS);

  // initializes the message container
  const messageContainerEl =
      doc.querySelector("#message-container").cloneNode(true);
  const messageListEl = messageContainerEl.querySelector("#message-list");

  // creates and appends message preview elements
  messageListEl.append(
      ...(await Promise.all(
          mostRecentMessages.map(async (msg) => {
            const otherUserId = msg.fromId === user._id ? msg.toId : msg.fromId;
            const otherUser = await api.users.get(otherUserId);

            if (!otherUser) {
              console.error(
                  `[dashboard] could not find user with id ${otherUserId}`,
              );
              return;
            }

            const msgPreviewEl =
                doc.querySelector(".message-preview").cloneNode(true);

            // routes link to the right convo
            const linkEl = msgPreviewEl.querySelector("a");
            linkEl.setAttribute(":id", otherUser._id);

            linkEl.querySelector(".name").innerText = otherUser.name;
            linkEl.querySelector(".msg-timestamp").innerText = formatRelative(
                msg.time,
            );

            linkEl.querySelector(".msg-text").innerText = msg.text;

            linkEl.querySelector("img").src = otherUser.avatarUrl;

            return msgPreviewEl;
          }),
          )),
  );

  // Add default message if user has no conversations
  if (mostRecentMessages.length === 0) {
    const defaultMsg = document.createElement("div");
    defaultMsg.className = "box m-1";
    defaultMsg.textContent = "You have no recent messages.";
    messageListEl.append(defaultMsg);
  }

  app.append(messageContainerEl);

  // ################# show all upcoming appointments? #################

  /**
   * Creates and returns a new appointment element with the given appointment
   * data
   *
   * @param {Appointment} appt - The appointment data to render.
   * @returns {Promise<Element>} - A promise that resolves to the new
   *     appointment element.
   */
  const createNewAppointmentEl = async (appt) => {
    const apptEl = doc.querySelector(".appointment").cloneNode(true);

    const apptRole = appt.teacherId === user._id ? "Teaching" : "Learning";
    const time =
        `${formatTimeVerbose(appt.time)} - ${formatRelative(appt.time)}`;

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

  // get all future appointments
  const curTime = Date.now();
  const futureAppts = (await api.appointments.allMyAppointments())
                          .filter(
                              (appt) => { return curTime < appt.time; },
                          );

  // sort appointments by time in place
  // futureAppts.sort((a, b) => a.time - b.time);

  const apptContainerEl =
      doc.querySelector("#appointment-container").cloneNode(true);

  apptContainerEl.querySelector("#appointment-list")
      .append(
          ...(await Promise.all(
              futureAppts.map(
                  async (appt) => { return createNewAppointmentEl(appt); }),
              )),
      );

  // Empty appointment message
  if (futureAppts.length === 0) {
    const emptyMsg = document.createElement("div");
    emptyMsg.className = "box";
    emptyMsg.textContent = "You have no upcoming appointments.";
    apptContainerEl.querySelector("#appointment-list").append(emptyMsg);
  }
  app.append(apptContainerEl);
};
