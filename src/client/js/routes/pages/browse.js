import * as api from "../../api/index.js";
import { app } from "../helper.js";
import { getCurrent, goToRoute, HTMLAppRouteElement } from "../index.js";

export const onunload = async (prev, next) => {
  console.log(`[browse] unloading ${prev.file} for ${next.file}!`);
};

/**
 * Generates search parameters based on the values of the "search-has" and
 * "search-wants" input fields.
 *
 * @return {URLSearchParams} The generated search parameters.
 */
function generateSearchParams() {
  const hasInput = document.getElementById("search-has");
  const wantsInput = document.getElementById("search-wants");

  const params = new URLSearchParams();
  params.set(
    "has",
    hasInput.value
      .split(/,\s*/g)
      .filter((str) => str !== "")
      .join(","),
  );
  params.set(
    "wants",
    wantsInput.value
      .split(/,\s*/g)
      .filter((str) => str !== "")
      .join(","),
  );

  return params;
}

/**
 * Asynchronously fetches users with skills for a specific page and provides
 * functionality to get the next page (and also whether or not there is a next
 * page).
 *
 * @param {number} page - The page number to fetch users from.
 * @param {Array<string>} skillsHad - The skills that the users to search for
 *     had.
 * @param {Array<string>} skillsWant - The skills that the users to search for
 *     want.
 */
async function getUsersPaginated(page = 1, skillsHad = [], skillsWant = []) {
  const users = await api.users.withSkills(page, skillsHad, skillsWant);

  return {
    users: users,
    getNextPage: async () =>
      await getUsersPaginated(page + 1, skillsHad, skillsWant),
    hasNextPage: users.length > 0,
  };
}

/**
 * Creates a custom HTML element representing a user with their profile picture,
 * name, username, skills they have, and skills they want. Returns the created
 * element.
 *
 * @param {Object} user - An object containing user information.
 * @param {string} user.name - The name of the user.
 * @param {string} user._id - The ID of the user.
 * @param {string} user.username - The username of the user.
 * @param {Array<string>} user.skills - An array of skills the user has.
 * @param {Array<string>} user.skillsWanted - An array of skills the user wants.
 * @return {HTMLElement} - The custom HTML element representing the user.
 */
function createUserEl(user) {
  const userEl = document.createElement("browse-user");

  // Basic user info (pic, name, username)
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

  // Things the user knows
  const hasSkillsEl = document.createElement("span");
  hasSkillsEl.setAttribute("slot", "hasSkills");
  hasSkillsEl.className = "skills";

  hasSkillsEl.innerText =
    "Has skills: " + (user.skills.length == 0 ? "None" : "");

  for (const skill of user.skills) {
    const skillEl = new HTMLAppRouteElement();
    skillEl.setAttribute("route", "browse");
    skillEl.setAttribute("search", "?has=" + skill);
    skillEl.innerText = skill;
    skillEl.className = "skill";
    hasSkillsEl.appendChild(skillEl);
  }

  // Things the user wants to know
  const wantsSkillsEl = document.createElement("span");
  wantsSkillsEl.setAttribute("slot", "wantsSkills");
  wantsSkillsEl.className = "skills";

  wantsSkillsEl.innerText =
    "Wants skills: " + (user.skillsWanted.length == 0 ? "None" : "");

  for (const skill of user.skillsWanted) {
    const skillEl = new HTMLAppRouteElement();
    skillEl.setAttribute("route", "browse");
    skillEl.setAttribute("search", "?wants=" + skill);
    skillEl.innerText = skill;
    skillEl.className = "skill";
    wantsSkillsEl.appendChild(skillEl);
  }

  // Add everything into the user's div
  userEl.appendChild(profilePictureEl);
  userEl.appendChild(nameEl);
  userEl.appendChild(usernameEl);
  userEl.appendChild(hasSkillsEl);
  userEl.appendChild(wantsSkillsEl);

  return userEl;
}

/**
 * Renders a list of users with their profile pictures, names, usernames, and
 * skills into the "browse" HTML element.
 *
 * @param {number} page - The page number to fetch users from.
 * @param {Array<string>} skillsHad - The skills that the users to search for
 *     had.
 * @param {Array<string>} skillsWant - The skills that the users to search for
 *     want.
 */
async function renderUsers(page = 1, skillsHad = [], skillsWant = []) {
  const browseEl = document.getElementById("browse");
  const { users, getNextPage, hasNextPage } = await getUsersPaginated(
    page,
    skillsHad,
    skillsWant,
  );

  for (const user of users) {
    const userEl = createUserEl(user);
    browseEl.appendChild(userEl);
  }

  if (hasNextPage) {
    const loadMoreEl = document.getElementById("load-more-button");
    loadMoreEl.classList.remove("is-hidden");

    loadMoreEl.addEventListener("click", async function onclick() {
      loadMoreEl.classList.add("is-hidden");
      loadMoreEl.removeEventListener("click", onclick);
      await renderUsers(page + 1, skillsHad, skillsWant);
    });
  } else {
    const endEl = document.getElementById("load-end");
    endEl.classList.remove("is-hidden");
    loadMoreEl.classList.add("is-hidden");
  }
}

/**
 * Asynchronously renders a search interface for browsing users based on their
 * skills.
 *
 * @param {Object} args - An object containing arguments for the function.
 */
export default async (args) => {
  app.innerHTML = "";

  console.log("** browse loaded with args", args);

  // Search inputs
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

  // User info (grid)
  const browseEl = document.createElement("div");
  browseEl.id = "browse";

  app.appendChild(browseEl);

  const loadMoreButton = document.createElement("button");
  loadMoreButton.innerText = "Load More";
  loadMoreButton.className = "button is-light is-hidden";
  loadMoreButton.id = "load-more-button";

  const endEl = document.createElement("p");
  endEl.innerText = "You're at the end of the search results!";
  endEl.className = "is-hidden";
  endEl.id = "load-end";

  app.appendChild(loadMoreButton);
  app.appendChild(endEl);

  // Get search from provided args (if there are any)
  if (args.search) {
    hasInput.value = args.search;
  }

  const params = getCurrent() ? getCurrent().search : null;

  if (params) {
    hasInput.value = params.get("has");
    wantsInput.value = params.get("wants");
  }

  // Render search results
  browseEl.innerHTML = "";
  renderUsers(
    1,
    hasInput.value.split(/,\s*/g).filter((str) => str !== ""),
    wantsInput.value.split(/,\s*/g).filter((str) => str !== ""),
  );

  // Add event listeners for searching users
  hasInput.addEventListener("input", () => {
    browseEl.innerHTML = "";
    renderUsers(
      1,
      hasInput.value.split(/,\s*/g).filter((str) => str !== ""),
      wantsInput.value.split(/,\s*/g).filter((str) => str !== ""),
    );
  });

  wantsInput.addEventListener("input", () => {
    browseEl.innerHTML = "";
    renderUsers(
      1,
      hasInput.value.split(/,\s*/g).filter((str) => str !== ""),
      wantsInput.value.split(/,\s*/g).filter((str) => str !== ""),
    );
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
