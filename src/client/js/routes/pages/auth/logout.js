import { session, users } from "../../../api/index.js";
import { setLogOut } from "../../../api/offline.js";
import { setupNavbar, showGlobalError } from "../../../layout.js";
import { app, setTitle } from "../../helper.js";
import * as routes from "../../index.js";

/**
 * Log the user out if there is a session logged in.
 * Redirects to home page afterwards.
 */
export default async () => {
  app.innerHTML = "";

  setTitle("Logging out...");

  const user = await session.current();

  if (user) {
    try {
      console.debug("[logout] LOGGING OUT");
      await users.logout();
      session.setCurrent(null);
      await setupNavbar();
    } catch (err) {
      console.error("An error occurred while logging out --", err);
      showGlobalError(err?.message || err);
      return;
    }
  }

  await routes.goToRoute("home", null, null, true);
};
