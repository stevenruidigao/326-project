import { hash, verify } from "argon2";
import asyncHandler from "express-async-handler";
import session from "express-session";
import passport from "passport";
import LocalStrategy from "passport-local";
import FileStore from "session-file-store";

// import PouchDBStore from "session-pouchdb-store";

import * as users from "./db/users.js";
// import sessions from "./db/sessions.js";

// Setup passport

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user =
        (await users.getByUsername(username)) ??
        (await users.getByEmail(username));

      if (user) {
        const isValid = await verify(user.password, password);

        if (isValid) {
          return done(null, user);
        }
      }

      done(null, false, { message: "Incorrect username or password." });
    } catch (error) {
      done(error);
    }
  }),
);

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser((id, done) => {
  users
    .getById(id)
    .then((user) => done(null, user))
    .catch((error) => done(error));
});

// Express

export const configure = (app) => {
  app.use(
    session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      //   FIXME PACKAGE ERRORS. LIKELY BROKEN
      //   store: new PouchDBStore(sessions),
      store: new (FileStore(session))(),
      cookie: {
        secure: app.get("env") === "production",
        sameSite: "strict",
      },
      name: "tutorswap.session",
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());

  app.post("/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info, status) => {
      if (err) return next(err);

      if (!user) {
        return res.status(status || 400).json({ message: info.message });
      }

      req.login(user, (error) => {
        if (error) {
          return next(error);
        }

        res.json(users.serialize(user, user._id));
      });
    })(req, res, next);
  });

  app.post(
    "/signup",
    asyncHandler(async (req, res) => {
      const { name, username, email, password } = req.body;

      const sendError = (message, status = 400) =>
        res.status(status).json({ message });

      //  validate input
      for (const key of ["username", "email", "password", "name"]) {
        if (req.body[key]?.trim()) continue;

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
          password: hashedPassword,
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

  app.post("/logout", (req, res) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ message: err.message });

      res.json({ message: "Logged out successfully" });
    });
  });
};

export const middleware = passport.authenticate("session");
