import * as layout from "../layout.js";

import { app } from "./helper.js";
import * as pages from "./pages.js";

/**
 * Prefix for all paths in the app
 * @type {string}
 */
export const PATH_PREFIX = "/#";

/**
 * Regular expression to match the path prefix
 * @type {RegExp}
 */
export const PATH_PREFIX_REGEX = new RegExp(`^${PATH_PREFIX}`);

/**
 * @typedef {{
 *   path: string,
 *   file: string,
 *   hasHTML?: boolean,
 *   hasCSS?: boolean,
 * }} Route
 */
/**
 * The routes for the application, mapped from route name to route data.
 * - `path` may contain dynamic parts, referenced to as arguments, eg.
 * `/profile/:id`
 * - `file` is the name of the JS file to load for the route, located at
 * `/pages/[file].js`
 * - `hasHTML` loads the HTML fragment for the route, located at
 * `/pages/[file].html`
 * - `hasCSS` loads the CSS for the route, located at `/styles/pages/[file].css`
 * @type {Object<string, Route>}
 */
export const routes = {
  home: { path: "/", file: "home", hasHTML: true },
  dashboard: {
    path: "/dashboard",
    file: "dashboard",
    hasHTML: true,
    hasCSS: true,
  },
  browse: { path: "/browse", file: "browse", hasCSS: true },
  search: { path: "/browse/:search", file: "browse", hasCSS: true },
  messages: {
    path: "/messages",
    file: "messages",
    hasHTML: true,
    hasCSS: true,
  },
  conversation: {
    path: "/messages/:id",
    file: "messages",
    hasHTML: true,
    hasCSS: true,
  },
  profile: { path: "/profile", file: "profile", hasHTML: true, hasCSS: true },
  user: { path: "/profile/:id", file: "profile", hasHTML: true, hasCSS: true },

  login: { path: "/auth/login", file: "auth/login", hasHTML: true },
  logout: { path: "/auth/logout", file: "auth/logout" },
  signup: { path: "/auth/signup", file: "auth/signup", hasHTML: true },

  404: { file: "404", hasHTML: true },
};

/**
 * The loading element to show when a page is loading
 * @type {HTMLElement}
 */
const loadingEl = document.getElementById("loading");

/**
 * The styles for the current route
 * @type {HTMLStyleElement}
 */
const routeStyles = document.createElement("style");
routeStyles.id = "route-styles";

/**
 * @typedef {?
 *  {module: { default: function, onunload?: function, onload?: function },
 *  file: string, name: string, args: object,
 *  location: string, path: string, search: URLSearchParams,
 * }} RoutePage
 */

/**
 * Information on the current loaded page.
 * Likely not null when it is used, but it is null until the first page is
 * loaded.
 * @type {RoutePage}
 */
let current = null;

/**
 * Information on the previously loaded page.
 * If the browser was refreshed, this will be null. Otherwise, it will be data
 * on the last page.
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

/**
 * Scuffed way to handle events before & after route changes.
 */
export const callbacks = {
  beforeRouteChange: [],
  afterPageLoad: [],

  /**
   * @param {(route: string, args: string) => boolean} cb function to run before
   *     the route changes. 'true' cancels route change
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
   * @param {(route: string, args: string) => any} cb function to run after
   *     route changes
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
 * Handles calling that page's init function & registering `<template>` in the
 * HTML file. Defaults route to 404 if the name does not exist in `ROUTES`.
 * @param {string} routeName route name
 * @param {object?} args route args
 * @param {URLSearchParams?} search search params (?key=val&key2=val2)
 */
export const load = async (routeName, args = {}, search) => {
  args ||= {};

  if (!(routeName in routes)) routeName = 404;

  loadingEl.classList.add("is-active");

  const route = routes[routeName];

  const [routeJS, document, css] = await Promise.all([
    import(`./pages/${route.file}.js`),
    route.hasHTML && pages.fetchDOM(route.file),
    route.hasCSS && pages.fetchCSS(route.file),
    layout.onAppLoad(), // the logic inside only runs once!
  ]);

  const init = routeJS.default;

  if (document) pages.registerCustomComponents(route.file, document);

  /**
   * @type {RoutePage}
   */
  const next = {
    module: routeJS,
    file: route.file,
    name: routeName,
    args,
    location: convertRouteToPath(routeName, args, search),
    path: convertRouteToPath(routeName, args),
    search,
  };

  // in case page needs to do things before being unloaded, to "reset" something
  current?.module?.onunload?.(current, next);
  previous = current;
  current = next;

  // Update app data attributes; useful for CSS styling.
  app.dataset.route = current.name;
  app.dataset.file = current.file;
  app.dataset.path = current.path;

  // Replace the old page's CSS with the new page's CSS.
  // Most of this CSS should be scoped anyways, but it doesn't hurt to get rid
  // of it.
  routeStyles.textContent = css || "";

  layout.showGlobalError();

  await init(args, document);

  // After loading the page, finalize the route change.
  // Sometimes `init` may go to another route - somehow this has not caused
  // issues since these callbacks are called after that function finishes.
  // Something to watch out for.

  // Call the route change callbacks after the page has loaded
  callbacks.afterPageLoad.forEach((cb) => cb(routeName, args));

  loadingEl.classList.remove("is-active");

  // If the route has a specific onload function (I don't believe any do), call
  // it.
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

  // Replace dynamic parts of path with their argument values
  for (const key of Object.keys(args))
    path = path.replace(`:${key}`, args[key]);

  if (search?.size) {
    search.sort?.();
    path += "?" + search.toString();
  }

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

      if (part === splitPath[i] && !part.startsWith(":")) continue;
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
 * @param {String} name the name of the route to navigate to, must exist in
 *     routes
 * @param {Object} args arguments to pass to route  -- pass force=true to force
 *     pushState
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

  // sort params to ensure consistency
  search?.sort?.();

  const data = { route: name, data: args, search: search?.toString() };

  // only push state is path is not equal AND push state is not being forced
  if (path !== getPath() && !args.force)
    history.pushState(data, "", PATH_PREFIX + path);

  return load(name, args, search);
};

/**
 * Returns the application's path, supporting hash-only & otherwise.
 * Includes search params! Does NOT include the path prefix.
 * @param {boolean} force - force obtaining from current browser location
 * @returns {string}
 */
export const getPath = (force = false) => {
  // if there is a page currently loaded, use that path as that's the one the
  // app knows
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

  console.debug("[routes] loadPath() path =", path, "=>", info);

  // coming from popstate, cannot serialize URLSearchParams
  if (typeof info?.search === "string")
    info.search = new URLSearchParams(info.search);

  load(info?.route, info?.data, info?.search);
};

/**
 * Refresh the current page.
 * @returns {void}
 */
export const refresh = () => loadPath();

/**
 * Custom HTML element extending `<a>` for app routes.
 * - `route` attribute is the name of the route to navigate to
 * - `:arg` attributes are arguments to pass to the route
 * - `search` attribute is the search params to pass to the route
 * - `when-active` attribute is a space-separated list of classes to add when
 * the route is active
 * @extends {HTMLAnchorElement}
 * @example
 * <a is="app-route" route="profile" :id="5" when-active="is-active">Profile</a>
 * <a is="app-route" route="profile" :id="5" search="key=value">Profile</a>
 */
export class HTMLAppRouteElement extends HTMLAnchorElement {
  /**
   * Listen to changes on these attributes (+ route arguments as those are
   * dynamic). NOTE: Weird behavior occurs with this - it seems that adding to
   * this list does not update existing elements? Only uses list when
   * registering the element with browser? Try to reuse params!!
   */
  static observedAttributes = [
    "route",
    "when-active",
    "search",
    ":id",
    ":search",
  ];

  #args = {};
  #search = null;
  #onRouteChange;

  connectedCallback() {
    // Handle clicks on app routes.
    // This is not needed when using a hash router (like we are now, with
    // PATH_PREFIX=/#), but it would be were we to stop using it.
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
  attributeChangedCallback(key, old, newval) {
    this._updateAttrs();
  }

  /**
   * Recalculate the route arguments & final `href` attribute
   * based on the current attributes of the element.
   */
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

    const path = convertRouteToPath(this.route, args, this.#search);

    this.#args = args;
    this.href = path ? PATH_PREFIX + path : "";

    this._updateActiveState();
  }

  /**
   * Update the active state of the app route link.
   */
  _updateActiveState() {
    // calculate whether the route name & arguments match
    const isSameRoute = getCurrent()?.name === this.route;
    const currentArgsEntries = Object.entries(getCurrent()?.args || {});
    const isSameArgs =
      currentArgsEntries.length === Object.keys(this.#args).length &&
      currentArgsEntries.every(([key, val]) => this.#args[key] === val);

    // we only care if the search params are the same or not if any were
    // specified in the <a> itself!
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
        Boolean(isSameRoute && isSameArgs && isSameSearch),
      );
    }
  }

  /**
   * The name of the route to navigate to
   * @returns {string}
   */
  get route() {
    return this.getAttribute("route");
  }

  /**
   * Set the name of the route to navigate to
   * @param {string} route
   */
  set route(route) {
    this.setAttribute("route", route);
    this._updateAttrs();
  }

  /**
   * The arguments to pass to the route.
   * Changes to this object do not update the element.
   * @returns {object}
   */
  get args() {
    return { ...this.#args };
  }

  /**
   * Set a route's argument
   * @param {string} key the route argument
   * @param {string} value
   */
  setArg(key, value) {
    this.setAttribute(`:${key}`, value);
    this._updateAttrs();
  }

  /**
   * Obtain the search params for the route.
   * Overrides the original `a.search` since we're using hash routing.
   */
  get search() {
    return this.getAttribute("search");
  }

  /**
   * Set the search params for the route.
   * @param {string|URLSearchParams} value
   */
  set search(value) {
    this.setAttribute("search", String(value));
    this._updateAttrs();
  }
}

/**
 * Registers `<a is="app-route">` custom element for linking
 * and handler for changing state (backwards/forwards in history).
 */
export default () => {
  document.head.appendChild(routeStyles);

  window.addEventListener("popstate", (ev) => {
    // Navigate to new/old page
    loadPath(ev?.state);
  });

  // Initialize page
  loadPath();

  /**
   * Define custom element <app-route> for local SPA links
   * Use as `<a is="app-route" route="profile" :id="5" target="_blank">go to
   * profile of user ID 5!</a>`
   */
  customElements.define("app-route", HTMLAppRouteElement, { extends: "a" });
};
