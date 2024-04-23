import { app } from "../helper.js";
import * as api from "../../api/index.js";
import { HTMLAppRouteElement } from "../index.js";

export const onunload = async (prev, next) => {
  console.log(`[home] unloading ${prev.file} for ${next.file}!`);
};

export default async (args) => {
  app.innerHTML = "";

  console.log("** home loaded with args", args);

  const skillEl = new HTMLAppRouteElement();
  skillEl.className = "skill";
  skillEl.route = "browse";
  skillEl.target = "_blank";
  skillEl.innerText = "test";
  app.appendChild(skillEl);

  const users = Array.from(await api.users.all());

  for (const user of users) {
    const el = document.createElement("home-message");
    const nameEl = document.createElement("span");
    nameEl.setAttribute("slot", "name");
    nameEl.innerText = user.name;

    const skillsEl = document.createElement("span");
    skillsEl.setAttribute("slot", "skills");
    skillsEl.innerText = user.skills.join(", ");

    el.appendChild(nameEl);
    el.appendChild(skillsEl);

    app.appendChild(el);
  }
};
