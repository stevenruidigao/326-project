import { app, setTitle } from "../helper.js";

/**
 * Show the 404 page - see src/client/pages/404.html
 * @param {DocumentFragment} doc
 */
export default (_, doc) => {
  app.innerHTML = "";

  app.append(...doc.childNodes);

  setTitle("404 Not Found");
};
