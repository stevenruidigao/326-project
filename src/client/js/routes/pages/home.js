import * as api from "../../api/index.js";

export default async (args) => {
  app.innerHTML = "";

  console.log("** home loaded with args", args);

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
