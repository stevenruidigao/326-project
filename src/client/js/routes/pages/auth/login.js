import {session, users} from "../../../api/index.js";
import {setupNavbar} from "../../../layout.js";
import {app, setTitle, toggleElement} from "../../helper.js";
import {goToRoute} from "../../index.js";

/**
 * Show the errors on the login form. Hide the display if there are none.
 * @param {Element?} el
 * @param {string} error
 * @returns
 */
const showError = (el, error) => {
  if (!el)
    return console.warn(
        "error display element not found"); // Nowhere to display
  else {
    el.innerText = error;
    toggleElement(el, "is-hidden", !error);

    if (error)
      el.scrollIntoView(false);
  }
};

/**
 * Add the login elements to #app and setup the form submit event.
 */
export default async (args, doc) => {
  app.innerHTML = "";

  setTitle("Login");

  const loggedInUser = await session.current();

  if (loggedInUser) {
    await goToRoute("dashboard", null, null, true);
    return;
  }

  const login = doc.querySelector("#login"); // Don't need to use cloneNode?
  const form = doc.querySelector("form");
  const button = doc.querySelector("#login-submit");
  const error = doc.querySelector("#login-error");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    button.classList.add("is-loading");

    showError(error); // clear error display

    const data = new FormData(form);

    users
        .login(
            {username : data.get("username"), password : data.get("password")})
        .then((user) => {
          session.setCurrent(user);

          return goToRoute("dashboard");
        })
        .then((_) => setupNavbar())
        .catch((err) => { console.error(err), showError(error, err); })
        .finally(() => button.classList.remove("is-loading"));
  });

  app.appendChild(login);
};
