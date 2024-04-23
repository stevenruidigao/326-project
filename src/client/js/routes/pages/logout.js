import { session } from "../../api/index.js";
import { setupNavbar } from "../../layout.js";
import * as routes from "../index.js";

export default async () => {
  console.log("** logout loaded");

  const user = await session.current();

  if (user) {
    await session.delete();

    await setupNavbar();
  }

  await routes.goToRoute("home");
};
