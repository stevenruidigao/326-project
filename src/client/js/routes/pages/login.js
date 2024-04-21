import { app } from "../helper.js";

export default (args, doc) => {
  app.innerHTML = "";

  console.log("** login loaded with args", args);

  // args is key-value object of arguments pased to path
  // e.g. /profile/:id obtains { id: VALUE }

  // doc is DocumentFragment of corresponding HTML file
  // can querySelector, etc... to add to app
  
  

  const name = document.createElement("input");
  name.id = "login-name";
  
  const nameLabel = document.createElement("label");
  nameLabel.innerText = "Username: ";
  nameLabel.htmlFor = "login-name";

  const pwd = document.createElement("input");
  pwd.type="password";
  pwd.id = "login-pwd";

  const pwdLabel = document.createElement("label");
  pwdLabel.innerText = "Password: ";
  pwdLabel.htmlFor = "login-pwd";
  
  const submit = document.createElement("button");
  submit.textContent = "Log in";
  submit.addEventListener("click", () => {
    console.log("login button clicked");
  });

  [nameLabel, name, document.createElement("br"), pwdLabel, pwd, document.createElement("br"), submit].forEach(x => app.appendChild(x));

  
};