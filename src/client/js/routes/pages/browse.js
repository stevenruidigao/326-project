import { app } from "../helper.js";
import { HTMLAppRouteElement, goToRoute, getCurrent } from "../index.js";
import * as api from "../../api/index.js";

export const onunload = async (prev, next) => {
  console.log(`[browse] unloading ${prev.file} for ${next.file}!`);
};

function generateSearchParams() {
  const hasInput = document.getElementById("search-has");
  const wantsInput = document.getElementById("search-wants");

  const params = new URLSearchParams();
  params.set("has", hasInput.value.split(/,\s*/g).filter((str) => str !== "").join(","));
  params.set("wants", wantsInput.value.split(/,\s*/g).filter((str) => str !== "").join(","));

  return params;
}

/**
 * Renders a list of users with their profile pictures, names, usernames, and skills into the "browse" HTML element.
 *
 * @param {number} page - The page number to fetch users from.
 * @param {Array<string>} skillsHad - The skills that the users to search for had.
 * @param {Array<string>} skillsWant - The skills that the users to search for want.
 */
async function renderUsers(page=1, skillsHad=[], skillsWant=[]) {
  const browseEl = document.getElementById("browse");
  const users = Array.from(await api.users.withSkills(page, skillsHad, skillsWant));

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

    const usernameEl = new HTMLAppRouteElement();
    usernameEl.setAttribute("slot", "username");
    usernameEl.setAttribute("route", "profile");
    usernameEl.setAttribute(":id", user._id);
    usernameEl.innerText = `@${user.username}`;
    usernameEl.className = "username";

    const hasSkillsEl = document.createElement("span");
    hasSkillsEl.setAttribute("slot", "hasSkills");
    hasSkillsEl.className = "skills";

    hasSkillsEl.innerText = "Has skills: " + (user.skills.length == 0 ? "None" : "");

    for (const skill of user.skills) {
      const skillEl = new HTMLAppRouteElement();
      skillEl.setAttribute("route", "browse");
      skillEl.setAttribute("search", "?has=" + skill);
      skillEl.innerText = skill;
      skillEl.className = "skill";
      hasSkillsEl.appendChild(skillEl);
    }

    const wantsSkillsEl = document.createElement("span");
    wantsSkillsEl.setAttribute("slot", "wantsSkills");
    wantsSkillsEl.className = "skills";

    wantsSkillsEl.innerText = "Wants skills: " + (user.skillsWanted.length == 0 ? "None" : "");

    for (const skill of user.skillsWanted) {
      const skillEl = new HTMLAppRouteElement();
      skillEl.setAttribute("route", "browse");
      skillEl.setAttribute("search", "?wants=" + skill);
      skillEl.innerText = skill;
      skillEl.className = "skill";
      wantsSkillsEl.appendChild(skillEl);
    }

    userEl.appendChild(profilePictureEl);
    userEl.appendChild(nameEl);
    userEl.appendChild(usernameEl);
    userEl.appendChild(hasSkillsEl);
    userEl.appendChild(wantsSkillsEl);

    browseEl.appendChild(userEl);
  }
}

export default async (args) => {
  app.innerHTML = "";

  console.log("** browse loaded with args", args);

  const searchDiv = document.createElement("div");
  searchDiv.id = "search-div";

  const hasInput = document.createElement("input");
  hasInput.type = "text";
  hasInput.placeholder = "Skills you want";
  hasInput.className = "input is-light";
  hasInput.id = "search-has";

  const wantsInput = document.createElement("input");
  wantsInput.type = "text";
  wantsInput.placeholder = "Skills you have";
  wantsInput.className = "input is-light";
  wantsInput.id = "search-wants";

  const button = document.createElement("button");
  button.innerText = "Search";
  button.className = "button is-light";
  button.id = "search-button";

  searchDiv.appendChild(hasInput);
  searchDiv.appendChild(wantsInput);
  searchDiv.appendChild(button);

  app.appendChild(searchDiv);

  const browseEl = document.createElement("div");
  browseEl.id = "browse";

  app.appendChild(browseEl);

  if (args.search) {
    hasInput.value = args.search;
  }

  const params = getCurrent() ? getCurrent().search : null;

  if (params) {
    hasInput.value = params.get("has");
    wantsInput.value = params.get("wants");
  }

  browseEl.innerHTML = "";
  renderUsers(0, hasInput.value.split(/,\s*/g).filter((str) => str !== ""), wantsInput.value.split(/,\s*/g).filter((str) => str !== ""));

  // Add event listeners for searching users
  hasInput.addEventListener("input", () => {
    browseEl.innerHTML = "";
    renderUsers(0, hasInput.value.split(/,\s*/g).filter((str) => str !== ""), wantsInput.value.split(/,\s*/g).filter((str) => str !== ""));
  });

  wantsInput.addEventListener("input", () => {
    browseEl.innerHTML = "";
    renderUsers(0, hasInput.value.split(/,\s*/g).filter((str) => str !== ""), wantsInput.value.split(/,\s*/g).filter((str) => str !== ""));
  });

  hasInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      goToRoute("browse", {}, generateSearchParams());
    }
  });

  wantsInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      goToRoute("browse", {}, generateSearchParams());
    }
  });

  button.addEventListener("click", () => {
    goToRoute("browse", {}, generateSearchParams());
  });
};
