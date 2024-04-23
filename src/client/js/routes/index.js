import mock from "../api/mock/index.js";
import * as layout from "../layout.js";
import * as pages from "./pages.js";

export const PATH_PREFIX = "/#";
export const PATH_PREFIX_REGEX = new RegExp(`^${PATH_PREFIX}`);

export const routes = {
  home: { path: "/", file: "home", hasHTML: true },
  dashboard: { path: "/dashboard", file: "dashboard" },
  messages: { path: "/messages", file: "messages", hasHTML: true },
  conversation: { path: "/messages/:id", file: "messages", hasHTML: true },
  profile: { path: "/profile", file: "profile" },
  user: { path: "/profile/:id", file: "profile" },

  logout: { path: "/auth/logout", file: "logout" },

  404: { file: "404" },
};

const loadingEl = document.getElementById("loading");

/**
 * @typedef {?
 *  {module: { default: function, onunload?: function, onload?: function },
 *  file: string, name: string, args: object,
 *  location: string, path: string, search: URLSearchParams,
 * }} RoutePage
 */

/**
 * @type {RoutePage}
 */
let current = null;

/**
 * @type {RoutePage}
 */
let previous = null;

/**
 * Get the current loaded page
 * @returns {RoutePage}
 */
export const getCurrent = () => current;

/**
 * Get the previously loaded page
 * @returns {RoutePage}
 */
export const getPrevious = () => previous;

export const callbacks = {
  beforeRouteChange: [],
  afterPageLoad: [],

  /**
   * @param {(route: string, args: string) => boolean} cb function to run before the route changes. 'true' cancels route change
   * @returns {number}
   */
  addBefore(cb) {
    return this.beforeRouteChange.push(cb) - 1;
  },

  /**
   * Remove a listener on before route changes
   * @param {number} index return value of `removeBefore()`
   */
  removeBefore(index) {
    return delete this.beforeRouteChange[index];
  },

  /**
   * @param {(route: string, args: string) => any} cb function to run after route changes
   * @returns {number}
   */
  addAfter(cb) {
    return this.afterPageLoad.push(cb) - 1;
  },

  /**
   * Remove a listener on after route changes
   * @param {number} index return value of `addAfter()`
   */
  removeAfter(index) {
    return delete this.afterPageLoad[index];
  },
};

/**
 * Load a page's JS file & its HTML file (if it exists).
 * Handles calling that page's init function & registering `<template>` in the HTML file.
 * Defaults route to 404 if the name does not exist in `ROUTES`.
 * @param {string} routeName route name
 * @param {object?} args route args
 * @param {URLSearchParams?} search search params (?key=val&key2=val2)
 */
export const load = async (routeName, args = {}, search) => {
  args ||= {};

  if (!(routeName in routes)) routeName = 404;

  loadingEl.classList.add("is-active");

  const route = routes[routeName];

  const [routeJS, document] = await Promise.all([
    import(`./pages/${route.file}.js`),
    route.hasHTML && pages.fetchDOM(route.file),
    layout.onAppLoad(), // the logic inside only runs once!
  ]);

  const init = routeJS.default;

  if (document) pages.registerCustomComponents(route.file, document);

  // in case page needs to do things before being unloaded, to "reset" something
  const next = {
    module: routeJS,
    file: route.file,
    name: routeName,
    args,
    location: convertRouteToPath(routeName, args, search),
    path: convertRouteToPath(routeName, args),
    search,
  };

  current?.module?.onunload?.(current, next);
  previous = current;
  current = next;

  await init(args, document);

  callbacks.afterPageLoad.forEach((cb) => cb(routeName, args));

  loadingEl.classList.remove("is-active");

  await routeJS?.onload?.(routeName, args);
};

/**
 * Convert route & arguments to path (without PATH_PREFIX!)
 * @param {string} name route name in `ROUTES`
 * @param {object?} args arguments to replace dynamic parts of path with
 * @param {URLSearchParams?} search search params
 * @returns string
 */
export const convertRouteToPath = (name, args, search) => {
  args ||= {};

  const route = routes[name];

  if (!route) return null;

  let path = route.path;

  for (const key of Object.keys(args))
    path = path.replace(`:${key}`, args[key]);

  if (search) path += "?" + search.toString();

  return path;
};

/**
 * Convert a path (eg. `/profile/5`) to route data.
 * Also obtains arguments from path -- eg. `data = { id: "5" }`
 * @param {string} path
 * @returns {{ name: string, data: object, search: URLSearchParams }}
 */
export const convertPathToRoute = (origPath) => {
  // fix to allow empty path is same as /
  const [path, search] = origPath?.split("?") || [];
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
      return {
        route: routeName,
        data: args,
        search: search && new URLSearchParams(search),
      };
    }
  }

  // TODO should this return the 404 route? or handle that elsewhere
  return null;
};

/**
 * @param {String} name the name of the route to navigate to, must exist in routes
 * @param {Object} args arguments to pass to route
 * @param {URLSearchParams} search
 * @example goToRoute(user, { id: 5 });
 */
export const goToRoute = (name, args, search) => {
  args ||= {};

  if (!(name in routes)) throw new Error(`Route '${name}' does not exist.`);

  // call route change callbacks before unloading current page
  const stopChange = callbacks.beforeRouteChange.map((cb) => cb(name, args));

  if (stopChange.includes(true)) return;

  // change page location & load page afterwards
  const path = convertRouteToPath(name, args, search);

  const data = { route: name, data: args, search: search?.toString() };

  history.pushState(data, "", PATH_PREFIX + path);

  return load(name, args, search);
};

/**
 * Returns the application's path, supporting hash-only & otherwise.
 * Includes search params!
 * @param {boolean} force - force obtaining from current browser location
 * @returns {string}
 */
export const getPath = (force = false) => {
  if (!force && current?.path)
    return [current.path, current.search].filter(Boolean).join("?");

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
  const path = getPath(true);
  const info = def || convertPathToRoute(path);

  console.log("[routes] loadPath() path =", path, "=>", info);

  // coming from popstate, cannot serialize URLSearchParams
  if (typeof info?.search === "string")
    info.search = new URLSearchParams(info.search);

  load(info?.route, info?.data, info?.search);
};

export class HTMLAppRouteElement extends HTMLAnchorElement {
  static observedAttributes = ["name", "when-active", "search"];

  #args = {};
  #search = null;
  #onRouteChange;

  connectedCallback() {
    this.addEventListener("click", (ev) => {
      if (ev.ctrlKey || ev.metaKey || this.target === "_blank") return;

      ev.preventDefault();

      goToRoute(this.route, this.#args, this.#search);

      return false;
    });

    this._updateAttrs();

    this.#onRouteChange = callbacks.addAfter(() => this._updateActiveState());
  }

  disconnectedCallback() {
    callbacks.removeAfter(this.#onRouteChange);
  }

  // Recompute 'href' link (for new tab clicks) when parameters change
  attributeChangedCallback() {
    this._updateAttrs();
  }

  _updateAttrs() {
    // update url params
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

    // update url search
    const search = this.search;
    this.#search = search ? new URLSearchParams(search) : null;

    const path = convertRouteToPath(this.route, args, search);

    this.#args = args;
    this.href = path ? PATH_PREFIX + path : "";

    this._updateActiveState();
  }

  _updateActiveState() {
    // calculate whether the route name & arguments match
    const isSameRoute = getCurrent()?.name === this.route;
    const currentArgsEntries = Object.entries(getCurrent()?.args || {});
    const isSameArgs =
      currentArgsEntries.length === Object.keys(this.#args).length &&
      currentArgsEntries.every(([key, val]) => this.#args[key] === val);

    // we only care if the search params are the same or not if any were specified in the <a> itself!
    const currentSearch = getCurrent()?.search;
    currentSearch?.sort();
    this.#search?.sort();
    const isSameSearch =
      !this.#search ||
      (currentSearch && currentSearch.toString() === this.#search.toString());

    const whenActive = this.getAttribute("when-active")?.split(" ");

    if (!whenActive?.length) return;

    for (const className of whenActive) {
      this.classList.toggle(
        className,
        !!(isSameRoute && isSameArgs && isSameSearch),
      );
    }
  }

  get route() {
    return this.getAttribute("route");
  }

  set route(route) {
    this.setAttribute("route", route);
    this._updateAttrs();
  }

  get args() {
    return { ...this.#args };
  }

  setArg(key, value) {
    this.setAttribute(`:${key}`, value);
    this._updateAttrs();
  }

  get search() {
    return this.getAttribute("search");
  }

  set search(value) {
    this.setAttribute("search", String(value));
    this._updateAttrs();
  }
}

/**
 * Registers `<a is="app-route">` custom element for linking
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
   * Use as `<a is="app-route" route="profile" :id="5" target="_blank">go to profile of user ID 5!</a>`
   */
  customElements.define("app-route", HTMLAppRouteElement, { extends: "a" });
};
