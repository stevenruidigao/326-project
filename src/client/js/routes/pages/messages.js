import * as api from "../../api/index.js";
import dayjs, { formatTimeVerbose } from "../../dayjs.js";
import { app, setTitle } from "../helper.js";
import * as routes from "../index.js";

/**
 * Runs when page is unloaded. Currently does nothing.
 *
 * @param {import("../index.js").RoutePage} prev
 * @param {import("../index.js").RoutePage} next
 */
export const onunload = async (prev, next) => {
  // TODO: when implementing websockets, do not close connection if going from
  // messages --> messages

  if (prev.file === "messages" && next.file === "messages") {
    console.log(`[messages] not unloading, loading new conversation!`);
  } else {
    console.log(`[messages] unloading ${prev.file} for ${next.file}!`);
  }
};

/**
 * Sends a message from one user to another.
 *
 * @param {Message} msg - The message to send.
 * @param {string} fromId - The ID of the user sending the message.
 * @param {string} toId - The ID of the user receiving the message.
 * @returns {Promise<Message>}
 */
const sendMessage = async (msg, fromId, toId) => {
  return api.messages.create({
    text: msg,
    fromId,
    toId,
  });
};

/**
 * Setup Bulma modals for the messages page.
 * Due to the scuffed logic in this page, we need to make sure to not
 * add event listeners multiple times.
 *
 * NOTE: code adapted from bulma.io documentation
 */
const setupBulmaModals = () => {
  const SETUP_KEY = "modal_setup";

  const openModal = async (el, e) => {
    console.log("opening modal with event", e);
    if (e.target?.dataset?.apptid) {
      const loggedInUser = await api.session.current();
      const apptId = e.target.dataset.apptid;
      const userId = loggedInUser._id;
      const currentAppt = await api.appointments.get(apptId);

      console.log("[messages] opening edit appt modal", currentAppt);

      el.querySelector("input[name='topic']").value = currentAppt.topic;
      el.querySelector("input[name='url']").value = currentAppt.url;

      // needed due to timezones
      const date = dayjs(currentAppt.time);
      el.querySelector("input[name='time']").value =
        date.format("YYYY-MM-DDTHH:mm");

      el.querySelector(
        `input[name='role'][value='${
          currentAppt.teacherId === userId ? "teaching" : "learning"
        }']`,
      ).checked = true;
      el.querySelector(
        `input[name='type'][value='${currentAppt.type}']`,
      ).checked = true;

      const form = el.querySelector("form");
      form.dataset.apptid = apptId;
    }

    el.classList.add("is-active");
  };
  const closeModal = (el) => {
    const $form = el.querySelector("form");

    $form?.reset();
    el.classList.remove("is-active");
  };
  const closeAllModals = () => {
    (document.querySelectorAll(".modal") || []).forEach((modalEl) => {
      closeModal(modalEl);
    });
  };

  // make sure all modals are closed on any render
  closeAllModals();

  // Add a click event on buttons to open a specific modal
  (document.querySelectorAll(".js-modal-trigger") || []).forEach(
    (triggerEl) => {
      const modal = triggerEl.dataset.target;
      const targetEl = document.getElementById(modal);

      if (!triggerEl.dataset[SETUP_KEY]) {
        triggerEl.dataset[SETUP_KEY] = true;

        triggerEl.addEventListener("click", (e) => {
          console.log("clicked");
          openModal(targetEl, e);
        });
      }
    },
  );

  // Add a click event on various child elements to close the parent modal
  (
    document.querySelectorAll(
      ".modal-background, .modal-close, .modal-card-head .delete, .modal-card-foot .button[type=reset]",
    ) || []
  ).forEach((closeEl) => {
    const $target = closeEl.closest(".modal");

    if (!closeEl.dataset[SETUP_KEY]) {
      closeEl.dataset[SETUP_KEY] = true;

      closeEl.addEventListener("click", () => {
        closeModal($target);
      });
    }
  });

  if (!document.body.dataset[SETUP_KEY]) {
    document.body.dataset[SETUP_KEY] = true;

    // Add a keyboard event to close all modals
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeAllModals();
      }
    });
  }
};

/**
 * The other user in the conversation
 * @type {User?}
 */
let conversationOtherUser = null;

/**
 * @param {{ id?: string }} args user ID to load messages with
 * @param {DocumentFragment} doc
 */
export default async (args, doc) => {
  const isFullRender = routes.getPrevious()?.file !== "messages";

  if (isFullRender) {
    app.innerHTML = "";
  }

  console.log("** messages loaded with args", args);

  // get user id if logged in, otherwise redirect to home
  const user = await api.session.getUser();

  // FIXME: redirect to login page instead of home
  if (!user) {
    console.log("[messages] user not logged in! returning to home");
    return routes.goToRoute("home");
  }

  // const fetchSortedMessages = async () => {
  //   const allUserMessages = (await api.messages.allWithUser(user._id)).docs;

  //   // group messages by user
  //   const conversations = allUserMessages.reduce((acc, msg) => {
  //     const otherUserId = msg.fromId === user._id ? msg.toId : msg.fromId;
  //     if (!acc[otherUserId]) {
  //       acc[otherUserId] = [];
  //     }
  //     acc[otherUserId].push(msg);
  //     return acc;
  //   }, {});

  //   // in-place sort conversations by most recent message
  //   for (const convoKey in conversations) {
  //     conversations[convoKey].sort((a, b) => b.time - a.time);
  //   }

  //   console.log("[messages] fetched conversations", conversations);

  //   return conversations;
  // };

  // let conversations = await fetchSortedMessages();

  let conversations = await api.messages.allMyConvos();
  console.log("[messages] fetched conversations", conversations);

  // const reFetchMessages = async () => {
  //   console.debug("[messages] refetching messages");
  //   conversations = await fetchSortedMessages();
  // };

  const reFetchMessages = async () => {
    console.debug("[messages] refetching messages");
    conversations = await api.messages.allMyConvos()
  };

  // render the sidebar with all the user's conversations + msg previews
  // set all previews to not highlighted
  // all previews are links to the conversation with the other user
  if (isFullRender) {
    const columnContainer = document.createElement("div");
    columnContainer.className = "columns is-gapless mb-0";
    columnContainer.id = "messages-container";
    columnContainer.style.width = "100%";

    columnContainer.appendChild(
      doc.getElementById("message-sidebar").cloneNode(true),
    );
    app.appendChild(columnContainer);
  }

  const columnContainer = app.querySelector("#messages-container");
  const previewContainer = app.querySelector("#message-list");

  /**
   * Render the sidebar only (list of conversations with users & preview of last message)
   * @param {boolean} refetch
   */
  const renderSidebar = async (refetch = false) => {
    console.log("[messages] rendering sidebar");

    if (refetch) await reFetchMessages();

    // sort the keys of conversations by most recent message to display most
    // recent conversations at top
    const orderOfConversations = Object.keys(conversations).sort((a, b) => {
      const lastMsgA = conversations[a][0];
      const lastMsgB = conversations[b][0];
      return lastMsgB.time - lastMsgA.time;
    });

    const previews = [];

    for (const convoKey of orderOfConversations) {
      const otherUserId = convoKey;
      const otherUser = await api.users.get(otherUserId);
      const lastMsg = conversations[convoKey][0];

      const previewEl = doc
        .querySelector(".msg-sidebar-preview")
        .cloneNode(true);

      // routes link to the right convo
      const linkEl = previewEl.querySelector("a");
      linkEl.setAttribute(":id", otherUserId);

      linkEl.querySelector(".sidebar-name").innerText = otherUser.name;
      linkEl.querySelector(".msg-timestamp").innerText = dayjs(
        lastMsg.time,
      ).fromNow();

      linkEl.querySelector(".msg-preview").innerText = lastMsg.text;

      const avatar = await api.users.getAvatar(otherUser);

      linkEl.querySelector("img").src = avatar
        ? URL.createObjectURL(avatar)
        : "/images/logo.png";

      previews.push(previewEl);

      // previewContainer.appendChild(previewEl);
    }

    previewContainer.innerHTML = "";
    previewContainer.append(...previews);
  };

  // only needs to rerender if new message is sent/received
  if (isFullRender) renderSidebar();

  // only render the convo wrapper on a full render
  if (isFullRender) {
    const convoWrapperEl = document.createElement("div");
    convoWrapperEl.setAttribute("id", "conversation-wrapper");
    convoWrapperEl.className = "column";
    columnContainer.appendChild(convoWrapperEl);
  }
  const convoWrapperEl = document.getElementById("conversation-wrapper");
  // always clear the conversation wrapper -- rerendering this is not jarring to
  // the user
  convoWrapperEl.innerHTML = "";

  // only render all modals html on full render
  if (isFullRender) {
    // render all non-template modals
    app.append(
      ...[...doc.querySelectorAll(".modal")]
        .filter((modalEl) => !modalEl.classList.contains("modal-template"))
        .map((modalEl) => modalEl.cloneNode(true)),
    );

    // render one create appointment modal from the template
    const createApptModal = doc.querySelector("#modal-appt").cloneNode(true);
    createApptModal.setAttribute("id", "modal-create-appt");

    // TODO: make sure that button triggers to open edit modal have a
    // data-apptid="<id>" render one edit appointment modal from the template
    const editApptModal = doc.querySelector("#modal-appt").cloneNode(true);
    editApptModal.setAttribute("id", "modal-edit-appt");

    editApptModal
      .querySelector("#form-create-appt")
      .setAttribute("id", "form-edit-appt");
    editApptModal.querySelector(".modal-card-title").innerText =
      "Edit Appointment";
    editApptModal.querySelector(".is-success").innerText = "Confirm Edits";

    const editDeleteBtn = editApptModal.querySelector(".is-danger");
    editDeleteBtn.parentElement.classList.remove("is-hidden");

    const parseApptFormData = (formData) => {
      const apptData = Object.fromEntries(formData.entries());

      console.log(
        "parseApptFormData conversationOtherUser",
        conversationOtherUser,
      );

      const parsedApptData = {
        teacherId:
          apptData.role === "teaching" ? user._id : conversationOtherUser._id,
        learnerId:
          apptData.role === "learning" ? user._id : conversationOtherUser._id,
        type: apptData.type,
        url: apptData.url,
        topic: apptData.topic,
        time: dayjs(apptData.time).valueOf(),
      };

      return parsedApptData;
    };

    // TODO: should i do some form validation? or leave it up to the backend?
    // add event listener to create appointment
    const createAppointmentForm =
      createApptModal.querySelector("#form-create-appt");
    const createBtn = createAppointmentForm.querySelector("[type=submit]");

    createAppointmentForm.addEventListener("submit", async (e) => {
      // we don't want the actual submit event to happen
      e.preventDefault();

      createBtn.classList.add("is-loading");

      try {
        const formData = new FormData(createAppointmentForm);
        const parsedApptData = parseApptFormData(formData);

        console.log("[messages] creating appointment", parsedApptData);

        await api.appointments.create(parsedApptData);

        createAppointmentForm.querySelector("[type=reset]").click(); // close modal!
        routes.refresh();
      } catch (err) {
        // TODO add user-facing error message
        console.error("[messages] error creating appointment", err);
      }

      createBtn.classList.remove("is-loading");
    });

    // add event listener to edit appointment
    const editAppointmentForm = editApptModal.querySelector("#form-edit-appt");
    editAppointmentForm.addEventListener("submit", async (e) => {
      // we don't want the actual submit event to happen
      e.preventDefault();

      const apptId = e.target.dataset.apptid;

      const formData = new FormData(editAppointmentForm);

      const parsedApptData = parseApptFormData(formData);

      await api.appointments.update(apptId, parsedApptData);

      console.log(parsedApptData);

      // route refresh to update the conversation & close modals
      routes.refresh();
    });

    editDeleteBtn.addEventListener("click", async (e) => {
      editDeleteBtn.classList.add("is-loading");

      try {
        const apptId = editAppointmentForm.dataset.apptid;
        await api.appointments.delete(apptId);

        // route refresh to update the conversation & close modals
        routes.refresh();
      } catch (err) {
        console.error("[messages] error deleting appointment", err);
      }

      editDeleteBtn.classList.remove("is-loading");
    });

    app.append(createApptModal, editApptModal);
  }

  conversationOtherUser = null;

  // either render a conversation or a blank conversation
  try {
    // check to see if the other user exists, if doesn't error, continue
    // rendering
    const otherUser = await api.users.get(args.id);

    conversationOtherUser = otherUser;
    console.log("set conversationOtherUser", conversationOtherUser);

    setTitle(`Chat with ${otherUser.name}`);

    // render the frame to hold the conversation
    const convoEl = doc.getElementById("conversation").cloneNode(true);

    // grab the header, message container, and input elements
    const convoHeaderEl = convoEl.querySelector("#convo-header");
    const messageContainerEl = convoEl.querySelector("#message-container");
    const messageInputEl = convoEl.querySelector("#message-form");

    // autofocus on the message input
    // NOTE: cannot use autofocus attribute in the html since it won't refocus
    // when changing conversations with a click
    messageInputEl.querySelector("input").focus();

    convoHeaderEl.querySelector("a").setAttribute(":id", otherUser._id);
    convoHeaderEl.querySelector("h2").innerText =
      `${otherUser.name} (@${otherUser.username})`;

    convoWrapperEl.appendChild(convoEl);

    // unpaginated get all appointments by calling until no more next
    const getAllAppts = async () => {
      const allAppts = [];
      for (let curPage = 1; ; curPage++) {
        const response = await api.appointments.all(curPage);
        allAppts.push(...Array.from(response));
        if (!response.pagination.next) break;
      }
      return allAppts;
    };

    // get all appointments between user and other user
    const relevantAppts = (await getAllAppts()).filter((appt) => {
      return (
        (appt.teacherId === user._id && appt.learnerId === otherUser._id) ||
        (appt.teacherId === otherUser._id && appt.learnerId === user._id)
      );
    });

    // sort appointments by time in place
    relevantAppts.sort((a, b) => b.time - a.time);

    console.log("[messages] relevant appts", relevantAppts);

    /**
     * Creates and returns a new message element with the given message data
     * NOTE: do not call this function for recieved new messages that aren't part of this conversation
     *
     * @param {Message} msg - The message data to render.
     * @returns {Promise<Element>} - A promise that resolves to the new message element.
     */
    const createNewMessageEl = async (msg) => {
      const messageEl = doc.querySelector(".message").cloneNode(true);

      const isThisUser = msg.fromId === user._id;
      const msgName = isThisUser ? user.name : otherUser.name;

      const usernameEl = messageEl.querySelector(".msg-from");
      usernameEl.innerText = msgName;

      const messageContentEl = messageEl.querySelector(".msg-content");
      messageContentEl.innerText = msg.text;

      const timeEl = messageEl.querySelector(".msg-time");
      timeEl.innerText = dayjs(msg.time).fromNow();
      timeEl.timestamp = msg.time;
      timeEl.title = formatTimeVerbose(msg.time);

      messageEl.dataset.user = isThisUser ? "self" : "other";

      return messageEl;
    };

    /**
     * Creates and returns a new appointment element with the given appointment data
     *
     * @param {Appointment} appt - The appointment data to render.
     * @returns {Promise<Element>} - A promise that resolves to the new appointment element.
     */
    const createNewAppointmentEl = async (appt) => {
      const apptEl = doc.querySelector(".appointment").cloneNode(true);

      const apptRole = appt.teacherId === user._id ? "Teaching" : "Learning";
      const apptTime = dayjs(appt.time);
      const fullTime = apptTime.format("MMMM D, YYYY [at] h:mm A");

      apptEl.querySelector(".time").innerText =
        `${fullTime} - ${apptTime.fromNow()}`;
      apptEl.querySelector(".time").title = apptTime.toDate().toLocaleString();
      apptEl.querySelector("span.role").innerText = apptRole;
      apptEl.querySelector("span.topic").innerText = appt.topic;
      apptEl.querySelector("span.type").innerText = appt.type;
      if (!appt.url) {
        apptEl.querySelector(".url-container").remove();
      } else {
        apptEl.querySelector("a.url").innerText = appt.url;
        apptEl.querySelector("a.url").setAttribute("href", appt.url);
      }

      apptEl
        .querySelector(".js-modal-trigger")
        .setAttribute("data-apptid", appt._id);

      return apptEl;
    };

    const zippedElements = (convos, appts) => {
      if (!convos) return appts.map(createNewAppointmentEl);

      const allMessageBlocks = [...convos, ...appts];
      allMessageBlocks.sort((a, b) => b.time - a.time);

      return allMessageBlocks.map((msg) => {
        if (msg.text) {
          return createNewMessageEl(msg);
        } else {
          return createNewAppointmentEl(msg);
        }
      });
    };

    const relevantConvos = conversations[otherUser._id];

    // TODO: add an || check for appointments so that no msgs but yes appts
    // still render
    if (relevantConvos || relevantAppts.length) {
      console.debug(
        "conversation convos & appts",
        relevantConvos,
        relevantAppts,
      );
      messageContainerEl.append(
        ...(await Promise.all(zippedElements(relevantConvos, relevantAppts))),
      );
    } else {
      console.log(
        `[messages] no messages found between user ${user._id} and ${otherUser._id}`,
      );
      // NOTE: I don't think any additional code is necessary for a blank
      // conversation
      // TODO: consider adding a ui bit to prompt "start the conversation!"

      // TODO: also consider creating a blank conversation in the sidebar
      // isn't strictly necessary, honestly works as is
    }

    // add event listener to send messages
    messageInputEl.addEventListener("submit", async (e) => {
      // we don't want the actual submit event to happen
      e.preventDefault();

      // get message text from the input, if empty, do nothing
      const msgText = messageInputEl.querySelector("#message-box").value;
      if (!msgText) return;

      // send message and clear the input
      const sentMsg = await sendMessage(msgText, user._id, otherUser._id);
      messageInputEl.querySelector("#message-box").value = "";

      // render the new message in the conversation
      messageContainerEl.prepend(await createNewMessageEl(sentMsg));
      // new message requires a rerender of message previews
      renderSidebar(true);
    });

    // must be called at the end of everything to ensure all necessary elements
    // are rendered
    setupBulmaModals();
  } catch (err) {
    // if there was an arg provided, log error and redirect to blank
    // conversation
    if (args.id) {
      console.error(
        `[messages] error fetching conversation with user ${args.id}:`,
        err,
      );
      return routes.goToRoute("messages");
    }

    setTitle(`My Messages`);
    // if no arg provided, render a blank conversation
    const blankConvoEl = doc.getElementById("unselected-convo").cloneNode(true);
    convoWrapperEl.appendChild(blankConvoEl);
  }
};
