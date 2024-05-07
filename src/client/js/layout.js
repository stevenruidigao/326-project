import { session } from "./api/index.js";
import { isOffline } from "./api/offline.js";
import { toggleElement, toggleElementAll } from "./routes/helper.js";

let onLoadPromise = null;

/**
 * Allows for switching user authentication state without refresh!
 */
export const setupNavbar = async () => {
  const user = await session.current();

  const userActions = document.querySelector("#navbar-user-actions");
  const imageContainer = document.querySelector("#navbar-user-image");
  const image = imageContainer.querySelector("img");

  toggleElement("#navbar-guest-actions", "is-hidden", Boolean(user));
  toggleElement(userActions, "is-hidden", !user);

  toggleElementAll("#navbar-guest-actions .is-skeleton", "is-skeleton", false);

  imageContainer.classList.toggle("is-hidden", true);

  if (user) {
    userActions.querySelector("span").innerText = user.username;

    image.src = user.avatarUrl;
    imageContainer.classList.remove("is-hidden");
  }
};

export const showOfflineStatus = () => {
  const offline = isOffline();

  toggleElement("#offline-status", "is-hidden", !offline);
};

export const showGlobalError = (message) => {
  const errorEl = document.querySelector("#global-error");
  errorEl.querySelector("span").innerText = message;
  errorEl.classList.toggle("is-hidden", !message);
};

/**
 * Runs at the same time as the page load logic to keep the loading spinner
 * but prevent delaying
 * @returns {Promise}
 */
export const onAppLoad = () => {
  if (onLoadPromise) return onLoadPromise;

  return (onLoadPromise = Promise.all([setupNavbar()]));
};

/**
 * Run layout logic that only needs to run once
 */
export default () => {
  // navbar burger nav -- https://bulma.io/documentation/components/navbar/
  const $navbarBurgers = [...document.querySelectorAll(".navbar-burger")];

  $navbarBurgers.forEach((el) => {
    el.addEventListener("click", () => {
      const target = el.dataset.target;
      const $target = document.getElementById(target);

      // Toggle the "is-active" class on both the "navbar-burger" and the "navbar-menu"
      el.classList.toggle("is-active");
      $target.classList.toggle("is-active");
    });
  });

  setInterval(() => showOfflineStatus(), 10000);

  const $globalErrorClose = document.querySelector("#global-error .delete");
  $globalErrorClose.addEventListener("click", () => showGlobalError());
};
