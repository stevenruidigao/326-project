import { app } from "../helper.js";
import { goToRoute } from "../index.js";

export default (args, doc) => {
  app.innerHTML = "";

  console.log("** login loaded with args", args);

  // args is key-value object of arguments pased to path
  // e.g. /profile/:id obtains { id: VALUE }

  // doc is DocumentFragment of corresponding HTML file
  // can querySelector, etc... to add to app
  
  const login = doc.querySelector("#login").cloneNode(true);
  
  // TODO: Make button functional!!!

  /*submit.addEventListener("click", () => {
    console.log("login button clicked");
    // TODO: Display loading screen while waiting
    // TODO: Communicate to server
    // Create a session? 
    goToRoute("home"); // Temporary
    // Remove this event listener before it's deleted?
  });*/

  app.appendChild(login);

  
};