import {appointments, session, users} from "../../api/index.js";
import {setupNavbar} from "../../layout.js";
import {app, setTitle, toggleElementAll} from "../helper.js";
import {goToRoute, HTMLAppRouteElement} from "../index.js";

export const loadAppointments = async (doc, profileEl, user) => {
  const apptsParentEl = profileEl.querySelector("#profile-appointments");
  const apptsGridEl = apptsParentEl.querySelector("#profile-appointments-grid");

  apptsParentEl.classList.remove("is-hidden");

  const userAppointments = (await appointments.withUser(user._id, 1))
                               .slice(
                                   0,
                                   3,
                               );

  const usersInvolved = await appointments.getUsersInvolved(userAppointments);

  // render appointments
  for (const appt of userAppointments) {
    const newApptEl =
        doc.querySelector(".profile-appointments-cell").cloneNode(true);
    newApptEl.querySelector(".profile-appointments-card-topic").innerText =
        appt.topic;

    const date = new Date(appt.time);

    newApptEl.querySelector(".profile-appointments-card-time").innerText =
        date.toLocaleDateString();
    newApptEl.querySelector(".profile-appointments-card-time")
        .setAttribute("datetime", date.toISOString());

    const otherUser =
        usersInvolved[appt.teacherId === user._id ? appt.learnerId
                                                  : appt.teacherId];
    const link = new HTMLAppRouteElement();
    link.route = "user";
    link.setArg("id", otherUser._id);
    link.innerText = `@${otherUser.username}`;

    newApptEl.querySelector(".profile-appointments-card-user")
        .appendChild(link);

    apptsGridEl.appendChild(newApptEl);
  }

  apptsParentEl.classList.remove("is-skeleton");
};

export default async (args, doc) => {
  // get current logged-in user
  const loggedInUser = await session.current();

  if (!args.id && !loggedInUser) {
    goToRoute("login");
    // TODO go to log-in page
    return;
  }

  const id = args.id;
  const isUsername = id?.startsWith("@");
  const getMethod = isUsername ? "getByUsername" : "get";
  const username = isUsername ? id.slice(1) : id;

  app.innerHTML = "";

  const user = username ? await users[getMethod](
                              username, {attachments : true, binary : true})
                        : loggedInUser;
  const isEditingUser = !args.id;
  const isSameUser = loggedInUser?._id === user?._id;

  if (!user) {
    // TODO 404 profile page
    return;
  }

  console.log("* profile page user =", user);

  setTitle(isEditingUser ? "Editing profile" : `@${user.username}`);

  const div = doc.querySelector("#profile");

  const publicContent = div.querySelector("#profile-public");
  const editContent = div.querySelector("#profile-edit");

  publicContent.classList.toggle("is-hidden", !!isEditingUser);
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

  const avatar = await users.getAvatar(user);

  if (avatar) {
    imageEl.src = URL.createObjectURL(avatar);
  }

  if (isEditingUser) {
    idEl.value = "User ID: " + user._id;
    emailEl.value = user.email;

    knowsEl.value = user.skills?.join(", ") ?? "";
    interestsEl.value = user.skillsWanted?.join(", ") ?? "";

    const imageButtons = div.querySelector("#profile-img-buttons");
    const uploadBtn = div.querySelector("#profile-img-upload-btn");
    const deleteBtn = div.querySelector("#profile-img-delete-btn");

    imageButtons.classList.remove("is-hidden");

    const saveAvatar = async (file) => {
      toggleElementAll("button", "is-loading", true, imageButtons);

      await users.update(user._id, {
        ...user,
        _attachments : file ? {
          avatar : {
            content_type : file.type,
            data : file,
          },
        }
                            : {},
      });

      imageEl.src = file ? URL.createObjectURL(file) : "/images/logo.png";

      await session.setCurrent();
      await session.current();

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

      data.skills = data.skills?.split(/,\s+/) || [];
      data.skillsWanted = data.skillsWanted?.split(/,\s+/) || [];

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

  // initialize skills links
  if (!isEditingUser) {
    const known = user.skills || [];
    const interests = user.skillsWanted || [];

    const addSkills = (parentEl, searchKey, skills) =>
        skills.forEach((skill) => {
          const link = new HTMLAppRouteElement();

          link.route = "browse";
          link.search = `${searchKey}=${skill}`;
          link.innerText = skill;

          parentEl.appendChild(link);
        });

    addSkills(knowsEl, "has", known);
    addSkills(interestsEl, "wants", interests);

    // obtain sample set of appointments
    loadAppointments(doc, div, user);
  }

  app.appendChild(div);
};
