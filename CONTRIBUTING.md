# Contributing

## Front-end

### Routing

_These paths are all under `src/client`_

Use the `app-route` custom component for app links

```html
<a is="app-route" route="ROUTENAME" :arg="VALUE" search="key=value&key2=val2" when-active="is-active">link</a>
```

Use `goToRoute(name, args, search)` and `getPath()` from `js/routes/index.js` as necessary.

- The `load*()` functions load a page without changing the location address! Use only if applicable
- `when-active` attribute adds those classnames to the `app-route` element (not the child `<a>`!) if the route name & args match exactly

#### Creating a route

- Add route to `js/routes/index.js`

  ```js
  const routes = {
    ROUTE_NAME: {
      path: "/routepath/:argument",
      file: "FILENAME",
      hasHTML: true,
    },
  };
  ```

- Create file in `js/routes/pages/FILENAME.js`

  ```js
  import { app } from "../helper.js";

  export default (args, doc) => {
    app.innerHTML = "";

    // args is key-value object of arguments pased to path
    // e.g. /profile/:id obtains { id: VALUE }

    // doc is DocumentFragment of corresponding HTML file
    // can querySelector, etc... to add to app
  };
  ```

- (OPTIONAL) Create file in `pages/FILENAME.html`

  Given

  ```html
  <div id="login"></div>
  ```

  one can load it into the app via

  ```js
  const loginEl = doc.getElementById("login").cloneNode(true);
  app.appendChild(loginEl);
  ```
