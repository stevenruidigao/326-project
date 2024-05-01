import * as routes from "../../index.js";
import { session, users } from "../../../api/index.js";
import { setupNavbar } from "../../../layout.js";
import { setTitle } from "../../helper.js";

/**
 * Log the user out if there is a session logged in.
 * Redirects to home page afterwards.
 */
export default async () => {
  setTitle("Logging out...");

  const user = await session.current();

  if (user) {
    await users.logout();
    session.setCurrent(null);
    await setupNavbar();
  }

  await routes.goToRoute("home");
};
