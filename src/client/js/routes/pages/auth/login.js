import { app } from "../../helper.js";
import { goToRoute } from "../../index.js";
import { session, users } from "../../../api/index.js";
import { setupNavbar } from "../../../layout.js";
import { toggleElement } from "../../helper.js";

const showError = (el, error) => {
  if (!el) return console.warn("error display element not found"); // Nowhere to display
  else {
    el.innerText = error
    toggleElement(el, "is-hidden", !error);
  }
};

export default async (args, doc) => {
  app.innerHTML = "";

  const loggedInUser = await session.current();

  if (loggedInUser) {
    await goToRoute("dashboard");
    return;
  }

  console.log("** login loaded with args", args);
  
  const login = doc.querySelector("#login"); // Don't need to use cloneNode?
  const form = doc.querySelector("form");
  const button = doc.querySelector("#login-submit");
  const error = doc.querySelector("#login-error");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    button.classList.add("is-loading");
    
    const data = new FormData(form);

    users.login({ username: data.get("username"), password: data.get("password") })
      .then(user => {
        session.create(user._id).then(_ => goToRoute("dashboard").then(_ => setupNavbar()));
      })
      .catch(err => {console.error(err), showError(error, err)})
      .finally(() => button.classList.remove("is-loading"));
  });

  app.appendChild(login);

  
};