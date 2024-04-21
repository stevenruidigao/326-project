import mock from "../api/mock/index.js";
import * as pages from "./pages.js";

export const PATH_PREFIX = "/#";
export const PATH_PREFIX_REGEX = new RegExp(`^${PATH_PREFIX}`);

export const routes = {
  home: { path: "/", file: "home", hasHTML: true },
  dashboard: { path: "/dashboard", file: "dashboard" },
  messages: { path: "/messages", file: "messages" },
  conversation: { path: "/messages/:id", file: "messages" },
  profile: { path: "/profile", file: "profile" },
  user: { path: "/profile/:id", file: "profile" },
  404: { file: "404" },
};

const loadingEl = document.getElementById("loading");

let current = null;
let previous = null;

/**
 * Get the current loaded page
 * @returns {?{module: { default: function, onunload?: function }, file: string, name: string, args: object }}
 */
export const getCurrent = () => current;

/**
 * Get the previously loaded page
 * @returns {?{module: { default: function, onunload?: function }, file: string, name: string, args: object }}
 */
export const getPrevious = () => previous;

export const beforeRouteChange = {
  cb: [],

  /**
   * @param {(route: string, args: string) => any} cb function to run when the route changes
   * @returns {number}
   */
  add(cb) {
    return this.cb.push(cb) - 1;
  },

  /**
   * Remove a listener on before route changes
   * @param {number} index return value of `onBeforeRouteChange()`
   */
  remove(index) {
    return delete this.cb[index];
  },
};

/**
 * Load a page's JS file & its HTML file (if it exists).
 * Handles calling that page's init function & registering `<template>` in the HTML file.
 * Defaults route to 404 if the name does not exist in `ROUTES`.
 * @param {string} routeName route name
 * @param {object} args route args
 */
export const load = async (routeName, args = {}) => {
  if (!(routeName in routes)) routeName = 404;

  loadingEl.classList.add("is-active");

  const route = routes[routeName];

  const [routeJS, document] = await Promise.all(
    [
      import(`./pages/${route.file}.js`),
      route.hasHTML && pages.fetchDOM(route.file),
    ].filter(Boolean),
  );

  const init = routeJS.default;

  if (document) pages.registerCustomComponents(route.file, document);

  // in case page needs to do things before being unloaded, to "reset" something
  const next = { module: routeJS, file: route.file, name: routeName, args };

  current?.module?.onunload?.(current, next);
  previous = current;
  current = next;

  await init(args, document);

  loadingEl.classList.remove("is-active");
};

/**
 * Convert route & arguments to path (without PATH_PREFIX!)
 * @param {string} name route name in `ROUTES`
 * @param {object} args arguments to replace dynamic parts of path with
 * @returns string
 */
export const convertRouteToPath = (name, args = {}) => {
  const route = routes[name];

  if (!route) return null;

  let path = route.path;

  for (const key of Object.keys(args))
    path = path.replace(`:${key}`, args[key]);

  return path;
};

/**
 * Convert a path (eg. `/profile/5`) to route data.
 * Also obtains arguments from path -- eg. `data = { id: "5" }`
 * @param {string} path
 * @returns {{ name: string, data: object }}
 */
export const convertPathToRoute = (path) => {
  // fix to allow empty path is same as /
  const splitPath = path ? path.split("/") : ["", ""];

  for (const routeName of Object.keys(routes)) {
    const route = routes[routeName];
    const routePath = route.path;

    // support 404 and other routes like it
    if (!routePath) continue;

    const splitRoutePath = routePath.split("/");
    const args = {};

    let match = true;

    if (splitPath.length !== splitRoutePath.length) continue;

    // check if current route matches path & obtain args from it
    for (let i = 0; i < splitRoutePath.length; i++) {
      const part = splitRoutePath[i];

      if (part === splitPath[i]) continue;
      else if (part.startsWith(":")) {
        args[part.slice(1)] = splitPath[i];
      } else {
        match = false;
        break;
      }
    }

    if (match) {
      return { route: routeName, data: args };
    }
  }

  // TODO should this return the 404 route? or handle that elsewhere
  return null;
};

/**
 * @param {String} name the name of the route to navigate to, must exist in routes
 * @param {Object} args arguments to pass to route
 * @example goToRoute(user, { id: 5 });
 */
export const goToRoute = (name, args = {}) => {
  if (!(name in routes)) throw new Error(`Route '${name}' does not exist.`);

  // call route change callbacks before unloading current page
  const stopChange = beforeRouteChange.cb.map((cb) => cb(name, args));

  if (stopChange.includes(true)) return;

  // change page location & load page afterwards
  const path = convertRouteToPath(name, args);

  const data = { route: name, data: args };

  history.pushState(data, "", PATH_PREFIX + path);

  return load(name);
};

/**
 * Returns the application's path, supporting hash-only & otherwise
 * @returns {string}
 */
export const getPath = () => {
  const { href, host } = document.location;
  const index = href.indexOf(host);

  return href.slice(index + host.length).replace(PATH_PREFIX_REGEX, "");
};

/**
 * Load a page based on the current path.
 * Optionally, provide route information to use instead (avoids code repetition)
 * @param {object} def
 */
export const loadPath = (def) => {
  const path = getPath();
  const info = def || convertPathToRoute(path);

  console.log("[routes] path =", path, "=>", info);

  load(info?.route, info?.data);
};

/**
 * Registers `<app-route>` custom element for linking
 * and handler for changing state (backwards/forwards in history).
 *
 * MOCK ONLY: Waits for mock data before loading first page!
 */
export default () => {
  window.addEventListener("popstate", (ev) => {
    // Navigate to new/old page
    loadPath(ev?.state);
  });

  // Initialize page
  // --> wait for mock data
  mock.then(() => loadPath());

  /**
   * Define custom element <app-route> for local SPA links
   * Use as `<app-route name="profile" :id="5" target="_blank">go to profile of user ID 5!</app-route>`
   */
  customElements.define(
    "app-route",
    class extends HTMLElement {
      static observedAttributes = ["name", "target"];

      #route;
      #args;

      constructor() {
        super();

        this._a = document.createElement("a");
      }

      connectedCallback() {
        this._a.addEventListener("click", (ev) => {
          if (
            ev.ctrlKey ||
            ev.metaKey ||
            this.getAttribute("target") === "_blank"
          )
            return;

          ev.preventDefault();

          goToRoute(this.#route, this.#args);

          return false;
        });

        for (const child of [...this.childNodes]) {
          this._a.append(child);
        }

        this.appendChild(this._a);
      }

      // Recompute 'href' link (for new tab clicks) when parameters change
      attributeChangedCallback() {
        this._updateAttrs();
      }

      _updateAttrs() {
        const route = this.getAttribute("name");
        const args = {};

        const observed = this.constructor.observedAttributes;

        for (const attr of this.attributes) {
          const { name, value } = attr;

          if (name.startsWith(":")) {
            args[name.slice(1)] = value;

            // add to observed attributes
            if (!observed.includes(name)) observed.push(name);
          }
        }

        this.#route = route;
        this.#args = args;

        const path = convertRouteToPath(route, args);

        this._a.setAttribute("href", path ? PATH_PREFIX + path : "");
        this._a.setAttribute("target", this.getAttribute("target") || "");
      }
    },
  );
};
