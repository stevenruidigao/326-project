import { app } from "../helper.js";
import * as api from "../../api/index.js";

export const onunload = async (prev, next) => {
  console.log(`[browse] unloading ${prev.file} for ${next.file}!`);
};

async function renderUsers(page, skillsHad, skillsWant) {
  const browseEl = document.getElementById("browse");
  const users = Array.from(await api.users.withSkills(page, skillsHad, skillsWant));
  browseEl.innerHTML = "";

  for (const user of users) {
    const userEl = document.createElement("browse-user");

    const profilePictureEl = document.createElement("img");
    profilePictureEl.setAttribute("slot", "profile-picture");
    profilePictureEl.src = "/images/logo.png";
    profilePictureEl.className = "profile-picture";

    const nameEl = document.createElement("span");
    nameEl.setAttribute("slot", "name");
    nameEl.innerText = user.name;
    nameEl.className = "name";

    const usernameEl = document.createElement("app-route");
    usernameEl.setAttribute("slot", "username");
    usernameEl.setAttribute("name", "profile");
    usernameEl.target = "_blank";
    usernameEl.innerText = `@${user.username}`;
    usernameEl.className = "username";

    const skillsEl = document.createElement("span");
    skillsEl.setAttribute("slot", "skills");
    skillsEl.className = "skills";

    for (const skill of user.skills) {
      const skillEl = document.createElement("app-route");
      skillEl.setAttribute("name", "browse");
      skillEl.target = "_blank";
      skillEl.innerText = skill;
      skillEl.className = "skill";
      skillsEl.appendChild(skillEl);
    }

    userEl.appendChild(profilePictureEl);
    userEl.appendChild(nameEl);
    userEl.appendChild(usernameEl);
    userEl.appendChild(skillsEl);

    browseEl.appendChild(userEl);
  }
}

export default async (args) => {
  app.innerHTML = "";

  console.log("** browse loaded with args", args);

  const searchDiv = document.createElement("div");
  searchDiv.id = "search-div";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Search";
  input.id = "search-box";

  const button = document.createElement("button");
  button.innerText = "Search";
  button.id = "search-button";

  searchDiv.appendChild(input);
  searchDiv.appendChild(button);

  app.appendChild(searchDiv);

  const browseEl = document.createElement("div");
  browseEl.id = "browse";

  app.appendChild(browseEl);

  renderUsers(0, [], []);

  input.addEventListener("input", () => {
    renderUsers(0, input.value.split(", ").filter((str) => str !== ""), []);
  });

  button.addEventListener("click", () => {
    renderUsers(0, input.value.split(", ").filter((str) => str !== ""), []);
  });
};
