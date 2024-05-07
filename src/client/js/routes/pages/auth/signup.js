import { session, users } from "../../../api/index.js";
import { setupNavbar } from "../../../layout.js";
import { app, setTitle, toggleElement } from "../../helper.js";
import { goToRoute } from "../../index.js";

let errorsEl = null;

/**
 * Show the errors on the signup form. Hide the display if there are none.
 * @param {string[]} errors 
 */
export const showErrors = (errors) => {
  if (!errorsEl) console.warn("`errorsEl` has not been initialized!");
  else {
    errorsEl.innerText = errors.join("\n");

    toggleElement(errorsEl, "is-hidden", !errors.length);

    if (errors.length) errorsEl.scrollIntoView(false);
  }
};

/**
 * Register user & log them in.
 * If registration fails, shows errors.
 * If logging in fails, redirects to login page.
 * @param {object} data
 * @returns {void}
 */
export const register = async (data) => {
  showErrors([]);

  let id = null;

  try {
    const user = await users.register(data);

    session.setCurrent(user);

    goToRoute("dashboard", null, null, true);
    setupNavbar();
  } catch (err) {
    console.error("An error occurred during registration --", err);

    if (err === "Error logging in") return goToRoute("login");

    showErrors([err]);

    return;
  }
};

/**
 * Add the signup elements to #app and setup the form submit event.
 * @param _
 * @param {DocumentFragment} doc
 */
export default async (_, doc) => {
  app.innerHTML = "";

  setTitle("Sign Up");

  const loggedInUser = await session.current();

  if (loggedInUser) {
    await goToRoute("dashboard");
    return;
  }

  const formContainer = doc.querySelector("#signup-form");
  const form = doc.querySelector("form");
  const submitButton = form.querySelector("[type=submit]");
  const requiredFields = [...form.querySelectorAll("input[required]")].map(
    (el) => el.name,
  );

  errorsEl = doc.querySelector("#signup-form-errors");

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();

    submitButton.classList.add("is-loading");

    const data = new FormData(form);
    const errors = [];

    for (const key of requiredFields) {
      if (data.get(key)?.trim()) continue;

      errors.push(`The ${key} is required.`);
    }

    const next = errors.length
      ? Promise.resolve(showErrors(errors))
      : register(Object.fromEntries(data.entries()));

    next
      .then(() => setupNavbar())
      .finally(() => submitButton.classList.remove("is-loading"));
  });

  app.appendChild(formContainer);
};
