import { app } from "../helper.js";

export default (args) => {
  app.innerHTML = "";

  console.log("** dashboard loaded with args", args);
};
