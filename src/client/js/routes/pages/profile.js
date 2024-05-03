import { appointments, session, users } from "../../api/index.js";
import dayjs, {
  formatRelative,
  formatTime,
  formatTimeVerbose,
} from "../../dayjs.js";
import { setupNavbar } from "../../layout.js";
import { app, setTitle, toggleElementAll } from "../helper.js";
import { goToRoute, HTMLAppRouteElement, load } from "../index.js";

/**
 * Load 3 appointments that the user was involved in.
 * If there are no appointments, hide the appointments section.
 * @param {DocumentFragment} doc
 * @param {HTMLElement} profileEl
 * @param {User} user
 */
export const loadAppointments = async (doc, profileEl, user) => {
  const apptsParentEl = profileEl.querySelector("#profile-appointments");
  const apptsGridEl = apptsParentEl.querySelector("#profile-appointments-grid");

  apptsParentEl.classList.remove("is-hidden");

  const userAppointments = (await appointments.withUser(user._id, 1)).slice(
    0,
    3,
  );

  if (!userAppointments.length) {
    apptsParentEl.classList.add("is-hidden");
    return;
  }

  const usersInvolved = await appointments.getUsersInvolved(userAppointments);

  // render appointments
  for (const appt of userAppointments) {
    const newApptEl = doc
      .querySelector(".profile-appointments-cell")
      .cloneNode(true);
    newApptEl.querySelector(".profile-appointments-card-topic").innerText =
      appt.topic;

    const timeEl = newApptEl.querySelector(".profile-appointments-card-time");
    const date = dayjs(appt.time);

    timeEl.innerText = formatRelative(date);
    timeEl.title = formatTime(appt.time);
    timeEl.dateTime = date.toISOString();

    const otherUser =
      usersInvolved[
        appt.teacherId === user._id ? appt.learnerId : appt.teacherId
      ];
    const link = new HTMLAppRouteElement();
    link.route = "user";
    link.setArg("id", otherUser._id);
    link.innerText = `@${otherUser.username}`;

    newApptEl
      .querySelector(".profile-appointments-card-user")
      .appendChild(link);

    apptsGridEl.appendChild(newApptEl);
  }

  apptsParentEl.classList.remove("is-skeleton");
};

/**
 * Shows the profile edit page for the current logged-in user (at /profile)
 * or the public page for a user with the given id (at /profile/:id) or username (at /profile/@:username).
 * @param {{ id?: string }} args
 * @param {DocumentFragment} doc
 */
export default async (args, doc) => {
  // get current logged-in user
  const loggedInUser = await session.current();

  if (!args.id && !loggedInUser) {
    goToRoute("login");
    return;
  }

  const id = args.id;
  const isUsername = id?.startsWith("@");
  const getMethod = isUsername ? "getByUsername" : "get";
  const username = isUsername ? id.slice(1) : id;

  app.innerHTML = "";

  let user = null;

  try {
    user = username
      ? await users[getMethod](username, { attachments: true, binary: true })
      : loggedInUser;
  } catch (err) {
    console.error("An error occurred while loading user profile --", err);
  }

  const isEditingUser = !args.id;
  const isSameUser = loggedInUser?._id === user?._id;

  if (!user) {
    await load("404");
    return;
  }

  console.debug("* profile page user =", user);

  setTitle(isEditingUser ? "Editing profile" : `@${user.username}`);

  const div = doc.querySelector("#profile");

  const publicContent = div.querySelector("#profile-public");
  const editContent = div.querySelector("#profile-edit");

  publicContent.classList.toggle("is-hidden", Boolean(isEditingUser));
  editContent.classList.toggle("is-hidden", !isEditingUser);

  const content = div.querySelector(
    `#profile-${isEditingUser ? "edit" : "public"}`,
  );
  const key = isEditingUser ? "value" : "innerText";

  const nameEl = content.querySelector(".profile-name");
  const usernameEl = content.querySelector(".profile-username");
  const emailEl = content.querySelector(".profile-email");
  const knowsEl = content.querySelector(".profile-knows");
  const interestsEl = content.querySelector(".profile-interests");
  const imageEl = div.querySelector("img");

  const uploadEl = content.querySelector(".profile-img-upload");
  const idEl = content.querySelector(".profile-id");

  nameEl[key] = user.name;
  usernameEl[key] = user.username;

  imageEl.src = user.avatarUrl;

  if (isEditingUser) {
    idEl.value = "User ID: " + user._id;
    emailEl.value = user.email;

    knowsEl.value = user.known?.join(", ") ?? "";
    interestsEl.value = user.interests?.join(", ") ?? "";

    const imageButtons = div.querySelector("#profile-img-buttons");
    const uploadBtn = div.querySelector("#profile-img-upload-btn");
    const deleteBtn = div.querySelector("#profile-img-delete-btn");

    imageButtons.classList.remove("is-hidden");

    const saveAvatar = async (file) => {
      toggleElementAll("button", "is-loading", true, imageButtons);

      user = await users.updateAvatar(user._id, file);

      imageEl.src = `${user.avatarUrl}?${Date.now()}`;

      session.setCurrent(user);

      setupNavbar();

      toggleElementAll("button", "is-loading", false, imageButtons);
    };

    uploadBtn.addEventListener("click", () => uploadEl.click());
    deleteBtn.addEventListener("click", () => {
      if (confirm("Are you sure you want to clear your profile picture?")) {
        saveAvatar(null);
      }
    });

    uploadEl.addEventListener("change", async (ev) => {
      const file = uploadEl.files[0];

      await saveAvatar(file);
    });

    const formEl = content.querySelector("form");
    const submitEl = formEl.querySelector("[type=submit]");

    formEl.addEventListener("submit", async (ev) => {
      ev.preventDefault();

      submitEl.classList.add("is-loading");

      const formData = new FormData(formEl);
      formData.delete("img");

      const data = Object.fromEntries(formData.entries());

      data.known = data.known?.split(/,\s+/) || [];
      data.interests = data.interests?.split(/,\s+/) || [];

      users
        .update(user._id, {
          ...user,
          ...data,
        })
        .finally(() => submitEl.classList.remove("is-loading"));

      // TODO backend validation of duplicate email & username
    });

    // add link to public view
    const publicBtn = content.querySelector("#profile-public-btn");
    publicBtn.setAttribute(":id", user._id);
  } else if (isSameUser) {
    // content is not editing, show button
    content.querySelector(".profile-edit-button").classList.remove("is-hidden");
  } else {
    // user is NOT the same as logged in user

    const messageBtn = content.querySelector("#profile-message-button");
    messageBtn.setAttribute(":id", user._id);
    messageBtn.classList.remove("is-hidden");
  }

  // initialize known links
  if (!isEditingUser) {
    const known = user.known || [];
    const interests = user.interests || [];

    const addSkills = (parentEl, searchKey, known) =>
      known.forEach((skill) => {
        const link = new HTMLAppRouteElement();

        link.route = "browse";
        link.search = `${searchKey}=${skill}`;
        link.innerText = skill;

        parentEl.appendChild(link);
      });

    addSkills(knowsEl, "knows", known);
    addSkills(interestsEl, "interests", interests);

    // obtain sample set of appointments
    loadAppointments(doc, div, user);
  }

  app.appendChild(div);
};
