import { session, users } from "../../api/index.js";
import { setupNavbar } from "../../layout.js";
import { app, toggleElementAll } from "../helper.js";
import { goToRoute, load } from "../index.js";

export default async (args, doc) => {
  app.innerHTML = "";

  // get current logged-in user
  const loggedInUser = await session.current();

  if (!args.id && !loggedInUser) {
    // TODO go to log-in page
    return;
  }

  const id = args.id;
  const isUsername = id?.startsWith("@");
  const getMethod = isUsername ? "getByUsername" : "get";
  const username = isUsername ? id.slice(1) : id;

  const user = username
    ? await users[getMethod](username, { attachments: true, binary: true })
    : loggedInUser;
  const isEditingUser = !args.id;
  const isSameUser = loggedInUser?._id === user?._id;

  if (!user) {
    // TODO 404 profile page
    return;
  }

  console.log("* profile page user =", user);

  document.title = `${user.username}'s Profile`;

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
  knowsEl[key] = user.skills.join(", ");
  interestsEl[key] = user.skillsWanted.join(", ");

  const avatar = await users.getAvatar(user);

  if (avatar) {
    imageEl.src = URL.createObjectURL(avatar);
  }

  if (isEditingUser) {
    idEl.value = "User ID: " + user._id;
    emailEl.value = user.email;

    const imageButtons = div.querySelector("#profile-img-buttons");
    const uploadBtn = div.querySelector("#profile-img-upload-btn");
    const deleteBtn = div.querySelector("#profile-img-delete-btn");

    imageButtons.classList.remove("is-hidden");

    const saveAvatar = async (file) => {
      toggleElementAll("button", "is-loading", true, imageButtons);

      await users.update(user._id, {
        ...user,
        _attachments: file
          ? {
              avatar: {
                content_type: file.type,
                data: file,
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
  }

  app.appendChild(div);
};
