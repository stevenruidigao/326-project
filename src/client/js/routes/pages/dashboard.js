import { app } from "../helper.js";
import * as api from "../../api/index.js";
import * as routes from "../index.js";

export const onunload = async (prev, next) => {
  // TODO: when websockets are implemented, close the connection here
  
  console.log(`[messages] unloading ${prev.file} for ${next.file}!`);
};

export default async (args, doc) => {
  app.innerHTML = "";

  // get user id if logged in, otherwise redirect to home
  const user = await api.session.getUser();

  if (!user) {
    console.log(`[messages] user not logged in! returning to home`);
    return routes.goToRoute("home");
  }

  // TODO: show latest messages? don't have unread messages so can't show unreads
  

  // TODO: show all upcoming appointments?

  console.log("** dashboard loaded with args", args);
};
