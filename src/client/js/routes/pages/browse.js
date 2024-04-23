import { app } from "../helper.js";
import { HTMLAppRouteElement, goToRoute } from "../index.js";
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

    // const usernameEl = document.createElement("app-route");
    // const usernameEl = document.createElement("a");
    // usernameEl.setAttribute("name", "profile");
    // usernameEl.target = "_blank";

    const usernameEl = new HTMLAppRouteElement();
    usernameEl.setAttribute("is", "app-route");
    usernameEl.setAttribute("slot", "username");
    usernameEl.setAttribute("route", "profile");
    usernameEl.setAttribute(":id", user._id);
    usernameEl.innerText = `@${user.username}`;
    usernameEl.className = "username";

    const skillsEl = document.createElement("span");
    skillsEl.setAttribute("slot", "skills");
    skillsEl.className = "skills";

    for (const skill of user.skills) {
      // const skillEl = document.createElement("app-route");
      // const skillEl = document.createElement("a");
      // skillEl.setAttribute("name", "browse");
      // skillEl.target = "_blank";

      const skillEl = new HTMLAppRouteElement();
      skillEl.setAttribute("is", "app-route");
      skillEl.setAttribute("route", "search");
      skillEl.setAttribute(":search", skill);
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
  input.className = "input is-light";
  input.id = "search-box";

  const button = document.createElement("button");
  button.innerText = "Search";
  button.className = "button is-light";
  button.id = "search-button";

  searchDiv.appendChild(input);
  searchDiv.appendChild(button);

  app.appendChild(searchDiv);

  const browseEl = document.createElement("div");
  browseEl.id = "browse";

  app.appendChild(browseEl);

  if (args.search) {
    input.value = args.search;
    renderUsers(0, args.search.split(/,\s*/g).filter((str) => str !== ""), []);
    
  } else {
    renderUsers(0, [], []);
  }

  input.addEventListener("input", () => {
    renderUsers(0, input.value.split(/,\s*/g).filter((str) => str !== ""), []);
  });

  input.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      goToRoute("search", {
        search: input.value.split(/,\s*/g).filter((str) => str !== "").join(","),
      });
    }
  });

  button.addEventListener("click", () => {
    goToRoute("search", {
      search: input.value,
    });

    // renderUsers(0, input.value.split(", ").filter((str) => str !== ""), []);
  });
};
