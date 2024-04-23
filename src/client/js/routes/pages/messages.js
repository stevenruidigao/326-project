import { app } from "../helper.js";
import * as api from "../../api/index.js";
import { HTMLAppRouteElement } from "../index.js";
import * as routes from "../index.js";


// returns undefined if arg cannot be parsed as a base 10 number
//otherwise returns the number as a string
const cleanId = (arg) => {
  const num = parseInt(arg, 10);
  if (isNaN(num)) return undefined;
  return num.toString();
}

export const onunload = async (prev, next) => {
  console.log(`[messages] unloading ${prev.file} for ${next.file}!`);
};


export default async (args) => {
  app.innerHTML = "";

  console.log("** messages loaded with args", args);

  // get user id if logged in, otherwise redirect to home
  const user = await api.session.getUser();

  console.log("user", user);

  if (!user) {
    console.log(`[messages] user not logged in! returning to home`);
    return routes.goToRoute("home");
  }

  // TODO: figure out why I need an Array.from here
  const allUserMessages = Array.from(await api.messages.allWithUser(user._id));
  
  // TODO: render the sidebar with all the user's conversations + msg previews + set all to not highlighted (maybe check if class exists, and if its there remove it)
  
  try {
    // clean up the id of other user (treats garbage id as undefined)
    const otherUserId = cleanId(args.id);

    // check to see if the other user exists, if doesn't error, continue rendering
    api.users.get(otherUserId);
    
    // TODO: render the full conversation specified

    // render the frame to hold the conversation

    // look for messages between the two users
      // if messages found:
        // render the conversation
      // else: if no messages found
        // create an empty conversation
        // (allow user to send message to other user)
        // create a blank conversation in the sidebar


    // highlight the other user in the side bar (add a class)
  }
  catch (err) {
    // if there was an arg provided, log error and redirect to blank conversation
    if (args.id) {
      console.error(`[messages] error fetching conversation with user ${args.id}: ${err}`);
      return routes.goToRoute("messages");
    }

    // TODO: render a blank convo (text and/or image saying to select a conversation from the sidebar)
  }
};
