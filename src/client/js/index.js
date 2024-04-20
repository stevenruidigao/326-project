import "./libs/pouchdb.min.js";
import "./libs/pouchdb.find.min.js";

import initRoutes from "./routes/index.js";

initRoutes();

document.addEventListener("DOMContentLoaded", () => {
  // navbar burger nav -- https://bulma.io/documentation/components/navbar/
  const $navbarBurgers = [...document.querySelectorAll(".navbar-burger")];

  $navbarBurgers.forEach((el) => {
    el.addEventListener("click", () => {
      const target = el.dataset.target;
      const $target = document.getElementById(target);

      // Toggle the "is-active" class on both the "navbar-burger" and the "navbar-menu"
      el.classList.toggle("is-active");
      $target.classList.toggle("is-active");
    });
  });
});
