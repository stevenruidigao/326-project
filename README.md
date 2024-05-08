# TutorSwap (326-project)

<!-- According to the end of Milestone 2, we need to:

> Include a README.md file in the root of the project repository detailing the **project structure**, **setup instructions**, and **documentation** necessary to _understand and navigate your application_.
> --- -->

This repository contains code for both Milestone 1 and Milestone 2 in `src/`. The code for Milestone 1 is in `src/docs/milestone-01` and the code for Milestone 2 is in `src/client`. The code for Milestone 3 is in `src/server` and `src/db` (alongside the client code in `src/client`).

To set up this project to run locally, run `npm install` in the project root.

Run `npm run milestone-01` or `npm run milestone-02` to start the server for Milestone 1 and Milestone 2, respectively.

## Milestone 02: Front-End

The aim of this app is to find other people who can teach you something you want and/or someone who you can learn from.

### Usage

Run `npm run milestone-02` to open a web-browser to the page.

On first page load, the website will create mock data (users, appointments, and messages) as to not be empty.

You may log in as any of them using the login page (passwords are _NOT_ implemented - just don't leave those fields empty) or create your own profile with the signup page.

> Existing users include _dfenning0_ (id 1), _ddraye1_ (id 2), _calu2_ (id 3), and more, which can be found in `src/client/js/api/mock/initial.js`

While logged out, you can view the **Browse** page and **public profiles** (eg. `/#/profile/@dfenning0` or `/#/profile/1` for the same user).

Once logged in:

- the **dashboard** page serves to show recent messages & upcoming appointments you may have scheduled - whether that be to teach someone else or learn yourself
- the **browse** page allows you to find users based on what skills you are looking for to teach and/or learn
- the **messages** page shows all existing conversations with other users, alongside appointments between you and whoever you're talking to
  - in addition, you may create, edit, and delete appointments from this page
- the **profile** page allows you to edit your settings and skills, and upload a custom profile picture

### Directory Structure

The directory structure is divided primarily into the API and routes. _All further paths will be starting from `src/client`_

- `js/api` contains the functions used by most of the application to obtain data from the "API"
  - mocked in `js/api/mock` using PouchDB
  - `js/api/local.js` contains the local data that is not part of the mocked API - eg. session token (not the actual session data!)
- `js/routes` contains a custom SPA route handler that matches paths to routes and afterwards files
  - contains route definitions (name, path, file, css & html)
    - every route has a file (not unique) at `js/routes/pages`
    - routes may have HTML in `pages` and CSS in `styles/pages`
    - the necessary files are loaded all at the same time, and once done, the JS script runs to set up the page before getting rid of the loading spinner
    - the HTML is loaded as a `DocumentFragment` for the JS to take advantage of, so that we can work with regular HTML (mostly) while adding dynamic elements
    - the HTML may also contain `<template>`s, but we found that they don't meet our needs as originally thought
  - registers a custom component `<a is="app-route">` to route links internally
  - see [CONTRIBUTING.md](./CONTRIBUTING.md) for more info
- `index.html` - contains the boilerplate that every page uses
- `pages/*.html` - page-specific content that the JS modifies before adding to the page (if at all)
- `styles` - the app's CSS
  - contains bulma framework (`libs/`) & general css (`app.css`)
  - `pages/*.css` contains page-specific CSS loaded only when those routes request it

## Milestone 03: Back-End

### Usage

- Run `npm install`
- OPTIONAL: Edit `.env` and fill in `SESSION_SECRET` (the others may be left blank)
- OPTIONAL: Run `npm run db:migrate` to create PouchDB indexes in the backend
- Run `npm milestone-03`/`npm start` to start up the NodeJS server serving the client-side & backend API code.

To test "offline"/local PouchDB storage, set `TEST_OFFLINE = true` in the developer console. Switching the network throttling to offline also works, but you must've loaded all the routes already, otherwise loading them will fail (since those are file endpoints & not API data).

### API Routes

- `GET /api/me` - returns the current logged in user
- `GET /api/users` - paginated search for users with specific known skills & interests
- `GET /api/users/:id` - ID may be username (`@<USERNAME>`) or UID; returns user
- `GET /api/users/:id/avatar` - returns image avatar for user (if it exists)
- `GET /api/users/:id/appointments` - returns ALL appointments involving this user; includes user data for all involved users
- `POST /api/users/:id/appointments` - create appointment between specified user and logged in user (must be different)
- `GET /api/appointments` - return appointments involving logged-in user
- `GET /api/appointments/:id` - fetch a single appointment
- `POST /api/appointments/:id` - update appointment data
- `DELETE /api/appointments/:id` - delete appointment
- `GET /api/messages` - get all messages involving logged-in user (sent or received)
- `POST /users/:id/message` - send message to specified user
