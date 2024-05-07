import * as api from "../../api/index.js";
import {app, setTitle} from "../helper.js";
import {getCurrent, goToRoute, HTMLAppRouteElement} from "../index.js";

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
  const knows =
      hasInput.value.split(/,\s*/g).filter((str) => str !== "").join(",");
  const interests =
      wantsInput.value.split(/,\s*/g).filter((str) => str !== "").join(",");

  if (knows)
    params.set("knows", knows);
  if (interests)
    params.set("interests", interests);

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
    users : users.data,
    getNextPage : async () =>
        await getUsersPaginated(users.pagination.next, skillsHad, skillsWant),
    hasNextPage : Boolean(users.pagination.next),
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
 * @param {Array<string>} user.known - An array of skills the user has.
 * @param {Array<string>} user.interests - An array of skills the user wants.
 * @return {HTMLElement} - The custom HTML element representing the user.
 */
async function createUserCard(user) {
  const card = document.createElement("div");
  card.className = "card user-card cell is-col-span-2";

  const cardContent = document.createElement("div");
  cardContent.className = "card-content";

  const media = document.createElement("div");
  media.className = "media mb-4";

  const mediaLeft = document.createElement("div");
  mediaLeft.className = "media-left";

  const figure = document.createElement("figure");
  figure.className = "image is-48x48 is-square";

  // Basic user info (pic, name, username)
  console.debug("[browse]", user);

  const profilePicture = document.createElement("img");
  profilePicture.loading = "lazy";
  profilePicture.className = "is-rounded is-clipped";
  profilePicture.src = user.avatarUrl;
  profilePicture.alt = `user avatar`;

  figure.appendChild(profilePicture);

  mediaLeft.appendChild(figure);

  const mediaContent = document.createElement("div");
  mediaContent.className = "media-content";

  const name = document.createElement("span");
  name.innerText = user.name;
  name.className = "title is-5";

  const username = new HTMLAppRouteElement();
  username.setAttribute("route", "user");
  username.setAttribute(":id", user._id);
  username.innerText = `@${user.username}`;
  username.className = "username is-6";

  mediaContent.appendChild(name);
  mediaContent.appendChild(username);

  media.appendChild(mediaLeft);
  media.appendChild(mediaContent);

  cardContent.appendChild(media);

  // Things the user knows
  const content = document.createElement("div");
  content.className = "content";

  const knows = document.createElement("span");
  knows.className = "skills";

  knows.innerText = "Knows: " + (!user.known?.length ? "None" : "");

  for (const known of user.known || []) {
    const skill = new HTMLAppRouteElement();
    skill.setAttribute("route", "browse");
    skill.setAttribute("search", "?knows=" + known);
    skill.innerText = known;
    skill.className = "skill";
    knows.appendChild(skill);
  }

  content.appendChild(knows);

  // Things the user wants to know
  const interests = document.createElement("span");
  interests.className = "skills";

  interests.innerText = "Interests: " + (!user.interests?.length ? "None" : "");

  for (const interest of user.interests || []) {
    const skill = new HTMLAppRouteElement();
    skill.setAttribute("route", "browse");
    skill.setAttribute("search", "?interests=" + interest);
    skill.innerText = interest;
    skill.className = "skill";
    interests.appendChild(skill);
  }

  content.appendChild(interests);
  cardContent.appendChild(content);
  card.appendChild(cardContent);

  return card;
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
  const browseContainer = document.getElementById("browse");
  const {users, getNextPage, hasNextPage} = await getUsersPaginated(
      page,
      skillsHad,
      skillsWant,
  );

  for (const user of users) {
    const userCard = await createUserCard(user);
    browseContainer.appendChild(userCard);
  }

  const loadMoreButton = document.getElementById("load-more-button");

  if (hasNextPage) {
    loadMoreButton.classList.remove("is-hidden");

    loadMoreButton.addEventListener("click", async function onclick() {
      loadMoreButton.classList.add("is-hidden");
      loadMoreButton.removeEventListener("click", onclick);
      await renderUsers(page + 1, skillsHad, skillsWant);
    });
  } else {
    const endOfResults = document.getElementById("load-end");
    endOfResults.classList.toggle("is-hidden");
    loadMoreButton.classList.add("is-hidden");
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

  setTitle("Browse");

  console.debug("** browse loaded with args", args);

  // title heading
  const title = document.createElement("h1");
  title.className = "title";
  title.innerText = "Browse Users";

  app.appendChild(title);

  // Search inputs
  const searchDiv = document.createElement("form");
  searchDiv.id = "search-div";

  const hasInput = document.createElement("input");
  hasInput.type = "text";
  hasInput.placeholder = "Skills you want to learn";
  hasInput.className = "input is-light";
  hasInput.id = "search-has";

  const wantsInput = document.createElement("input");
  wantsInput.type = "text";
  wantsInput.placeholder = "Skills you can help others learn";
  wantsInput.className = "input is-light";
  wantsInput.id = "search-wants";

  const button = document.createElement("button");
  button.innerText = "Search";
  button.className = "button is-light";
  button.id = "search-button";
  button.type = "submit";

  searchDiv.appendChild(hasInput);
  searchDiv.appendChild(wantsInput);
  searchDiv.appendChild(button);

  app.appendChild(searchDiv);

  // User info (grid)
  const browseContainer = document.createElement("div");
  browseContainer.className = "grid mt-2";
  browseContainer.id = "browse";

  app.appendChild(browseContainer);

  const loadMoreButton = document.createElement("button");
  loadMoreButton.innerText = "Load More";
  loadMoreButton.className = "button is-light is-hidden mb-5";
  loadMoreButton.id = "load-more-button";

  const endOfResults = document.createElement("p");
  endOfResults.innerText = "You're at the end of the search results!";
  endOfResults.className = "is-hidden mb-5";
  endOfResults.id = "load-end";

  app.appendChild(loadMoreButton);
  app.appendChild(endOfResults);

  // Get search from provided args (if there are any)
  if (args.search) {
    hasInput.value = args.search;
  }

  const params = getCurrent() ? getCurrent().search : null;

  if (params) {
    hasInput.value = params.get("knows");
    wantsInput.value = params.get("interests");
  }

  // Render search results
  browseContainer.innerHTML = "";
  renderUsers(
      1,
      hasInput.value.split(/,\s*/g).filter((str) => str !== ""),
      wantsInput.value.split(/,\s*/g).filter((str) => str !== ""),
  );

  // Add event listeners for searching users
  hasInput.addEventListener("input", () => {
    browseContainer.innerHTML = "";
    loadMoreButton.classList.add("is-hidden");
    endOfResults.classList.add("is-hidden");
    renderUsers(
        1,
        hasInput.value.split(/,\s*/g).filter((str) => str !== ""),
        wantsInput.value.split(/,\s*/g).filter((str) => str !== ""),
    );
  });

  wantsInput.addEventListener("input", () => {
    browseContainer.innerHTML = "";
    loadMoreButton.classList.add("is-hidden");
    endOfResults.classList.add("is-hidden");
    renderUsers(
        1,
        hasInput.value.split(/,\s*/g).filter((str) => str !== ""),
        wantsInput.value.split(/,\s*/g).filter((str) => str !== ""),
    );
  });

  searchDiv.addEventListener("submit", (event) => {
    event.preventDefault();
    goToRoute("browse", {}, generateSearchParams());
  });
};
