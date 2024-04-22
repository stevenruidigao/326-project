import "./libs/pouchdb.min.js";
import "./libs/pouchdb.find.min.js";

import initRoutes from "./routes/index.js";
import layout from "./layout.js";

initRoutes();

document.addEventListener("DOMContentLoaded", () => {
  layout();
});
