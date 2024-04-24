import { app, setTitle } from "../helper.js";

/**
 * Show basic home page.
 * @param {DocumentFragment} doc
 */
export default async (_, doc) => {
  app.innerHTML = "";

  app.append(...doc.childNodes);

  setTitle("Home");
};
