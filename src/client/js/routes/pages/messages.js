import { app } from "../helper.js";

export default (args) => {
  app.innerHTML = "";

  console.log("** messages loaded with args", args);
};
