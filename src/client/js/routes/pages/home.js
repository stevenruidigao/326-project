import { app } from "../helper.js";

export default async (args, doc) => {
  app.innerHTML = "";

  app.append(doc.querySelector('#home'));

  const style = document.querySelector('#route-styles');
  style.innerText = `#app[data-file="home"] { padding: 0 !important; margin: 0 !important; }`
};
