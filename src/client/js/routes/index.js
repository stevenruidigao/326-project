export const PATH_PREFIX = "/#";
export const PATH_PREFIX_REGEX = new RegExp(`^${PATH_PREFIX}`);

export const routes = {
  home: { path: "/", file: "home" },
  dashboard: { path: "/dashboard", file: "dashboard" },
  messages: { path: "/messages", file: "messages" },
  conversation: { path: "/messages/:id", file: "messages" },
  profile: { path: "/profile", file: "profile" },
  user: { path: "/profile/:id", file: "profile" },
  404: { file: "404" },
};

const loadingEl = document.getElementById("loading");

export const load = async (routeName, args = {}) => {
  if (!(routeName in routes)) routeName = 404;

  loadingEl.classList.remove("is-hidden");

  const route = routes[routeName];

  const { default: init } = await import(`./pages/${route.file}.js`);

  await init(args);

  loadingEl.classList.add("is-hidden");
};

/**
 *
 * @param {string} path
 * @returns {{ name: string, data: any }}
 */
export const convertPathToRoute = (path) => {
  const splitPath = path.split("/");

  for (const routeName in routes) {
    const route = routes[routeName];
    const routePath = route.path;

    // support 404 and other routes like it
    if (!routePath) continue;

    const splitRoutePath = routePath.split("/");
    const args = {};

    let match = true;

    if (splitPath.length !== splitRoutePath.length) continue;

    for (const i in splitRoutePath) {
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

  const route = routes[name];
  let path = route.path;

  for (const key in args) path = path.replace(`:${key}`, args[key]);

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

export default function init() {
  window.addEventListener("popstate", (ev) => {
    const path = getPath();
    const info = ev?.state || convertPathToRoute(path);

    console.log("[popstate] path =", path, "- navigating to", info);

    load(info?.route, info?.data);
  });

  const path = getPath();
  const info = convertPathToRoute(path);

  console.log("[routes] path =", path, "- initializing to", info);

  load(info?.route, info?.data);
}
