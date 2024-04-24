import { session, users } from "./api/index.js";
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

  toggleElement("#navbar-guest-actions", "is-hidden", !!user);
  toggleElement(userActions, "is-hidden", !user);

  toggleElementAll("#navbar-guest-actions .is-skeleton", "is-skeleton", false);

  imageContainer.classList.toggle("is-hidden", true);

  if (user) {
    userActions.querySelector("span").innerText = user.username;

    const avatar = await users.getAvatar(user);

    if (avatar) {
      image.src = URL.createObjectURL(avatar);
      imageContainer.classList.remove("is-hidden");
    }
  }
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

  const user = session.getUser();
};
