import {app} from "../helper.js";

export default (args) => {
  app.innerHTML = "";

  console.log("** profile loaded with args", args);
};
