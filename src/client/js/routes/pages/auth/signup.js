import { session, users } from "../../../api/index.js";
import { setupNavbar } from "../../../layout.js";
import { app, toggleElement } from "../../helper.js";
import { goToRoute } from "../../index.js";

let errorsEl = null;

export const showErrors = (errors) => {
  if (!errorsEl) console.warn("`errorsEl` has not been initialized!");
  else {
    errorsEl.innerText = errors.join("\n");

    toggleElement(errorsEl, "is-hidden", !errors.length);
  }
};

export const register = async (data) => {
  showErrors([]);

  let id = null;

  try {
    const res = await users.register(data);

    id = res.id;
  } catch (err) {
    console.error("An error occurred during registration --", err);

    showErrors([err]);

    return;
  }

  try {
    await session.create(id);
  } catch (err) {
    console.error(
      "An error occurred logging you in. User was created! --",
      err,
    );

    // redirect to login page

    return;
  }

  return goToRoute("dashboard");
};

export default async (args, doc) => {
  app.innerHTML = "";

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
