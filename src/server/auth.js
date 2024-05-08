import {hash, verify} from "argon2";
import asyncHandler from "express-async-handler";
import session from "express-session";
import passport from "passport";
import LocalStrategy from "passport-local";
import FileStore from "session-file-store";

// import PouchDBStore from "session-pouchdb-store";

import * as users from "./db/users.js";

// import sessions from "./db/sessions.js";

if (!process.env.SESSION_SECRET) {
  console.error("Please set SESSION_SECRET in .env");
  process.exit(1);
}

// Setup passport

/**
 * Configure the sign in strategy for passport.
 * Finds the user & verifies their password.
 */
passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = (await users.getByUsername(username)) ??
                     (await users.getByEmail(username));

        if (user) {
          const isValid = await verify(user.password, password);

          if (isValid) {
            return done(null, user);
          }
        }

        done(null, false, {message : "Incorrect username or password."});
      } catch (error) {
        done(error);
      }
    }),
);

/**
 * Convert a user object into a user ID for storage in the session data
 */
passport.serializeUser((user, done) => { done(null, user._id); });

/**
 * Convert a user ID into the user object
 */
passport.deserializeUser((id, done) => {
  users.getById(id)
      .then((user) => done(null, user))
      .catch((error) => done(error));
});

// Express

/**
 * Configure the Express application for authentication
 * @param {Express.Application} app
 */
export const configure = (app) => {
  app.use(
      session({
        secret : process.env.SESSION_SECRET,
        resave : false,
        saveUninitialized : false,
        //   FIXME PACKAGE ERRORS. LIKELY BROKEN
        //   store: new PouchDBStore(sessions),
        store : new (FileStore(session))(),
        cookie : {
          secure : app.get("env") === "production",
          sameSite : "strict",
          maxAge : 60 * 60 * 1000, // 1 hour (in ms)
        },
        name : "tutorswap.session",
      }),
  );

  app.use(passport.initialize());
  app.use(passport.session());

  /**
   * Log in a user.
   * Since we use this like an API (no redirects), we'll return the user data
   * so that the frontend can update its data.
   *
   * The session data contains the user ID after `req.login`, so the API will
   * allow the user to access their data. If the cookie doesn't exist
   * beforehand, it is created, and sent to the client's browser. Subsequent
   * requests will include this cookie, allowing the server to identify the
   * user.
   */
  app.post("/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info, status) => {
      if (err)
        return next(err);

      if (!user) {
        return res.status(status || 400).json({message : info.message});
      }

      req.login(user, (error) => {
        if (error) {
          return next(error);
        }

        res.json(users.serialize(user, user._id));
      });
    })(req, res, next);
  });

  /**
   * Sign up a new user. Weak validation of input & password hashing occurs
   * here. Similar to the /login endpoint in terms of logic.
   */
  app.post(
      "/signup",
      asyncHandler(async (req, res) => {
        const {name, username, email, password} = req.body;

        const sendError = (message, status = 400) =>
            res.status(status).json({message});

        //  validate input
        for (const key of ["username", "email", "password", "name"]) {
          if (req.body[key]?.trim())
            continue;

          return sendError(`The ${key} is required`);
        }

        try {
          const [emailOut, usernameOut] = await Promise.all([
            users.getByUsername(username),
            users.getByEmail(email),
          ]);

          if (emailOut || usernameOut) {
            return sendError(
                `${emailOut ? "Email" : "Username"} is already taken`,
            );
          }

          const hashedPassword = await hash(password);

          const user = await users.create({
            name,
            username,
            email,
            password : hashedPassword,
          });

          req.login(user, (error) => {
            console.error(error);

            if (error) {
              return sendError("Error logging in", 500);
            }

            res.json(users.serialize(user, user._id));
          });
        } catch (error) {
          console.error("Error signing up:", error);
          sendError(error.message, 500);
        }
      }),
  );

  /**
   * Log out the user. This will remove the session data from the server.
   * The client will not lose the session cookie, but the server-side session
   * data will no longer match that token, effectively logging the user out.
   */
  app.post("/logout", (req, res) => {
    req.logout((err) => {
      if (err)
        return res.status(500).json({message : err.message});

      res.json({message : "Logged out successfully"});
    });
  });
};

export const middleware = passport.authenticate("session");
