import * as routes from "../index.js";
import { session } from "../../api/index.js";
import { setupNavbar } from "../../layout.js";

export default async () => {
  console.log("** logout loaded");

  const user = await session.current();

  if (user) {
    await session.delete();

    await setupNavbar();
  }

  return routes.goToRoute("home");
};
