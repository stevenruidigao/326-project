# Contributing

## Front-end

### Routing

_These paths are all under `src/client`_

Use the `<route>` custom component for app links

```html
<route name="ROUTENAME" :arg="VALUE">link</routeu>
```

Use `goToRoute(name, args)` and `getPath()` from `js/routes/index.js` as necessary.

- The `load*()` functions load a page without changing the location address! Use only if applicable

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

- (OPTIONAL) Create file in `pages/home.html`

  - All templates in this file will automatically be registered as custom HTML components, using the `PAGEFILE` as the prefix
  - Eg. `<template id="message">` in `home.html` will be useable through `<home-message>`
