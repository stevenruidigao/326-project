import "dotenv/config";

import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import logger from "morgan";

import { configure as authConfigure } from "./auth.js";
import api from "./api/index.js";

const app = express();
const port = process.env.WEB_PORT || 3000;

/**
 * The directory name of the current module.
 * _`import.meta.dirname` is only available on node 20+_
 * @type {string}
 */
const __dirname =
  import.meta.dirname || path.dirname(fileURLToPath(import.meta.url));

// Serve static files before logger middleware to avoid cluttering the log with static files
app.use(express.static(path.resolve(__dirname, "../client")));

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

authConfigure(app);

app.use("/api", api);

app.use((req, res) =>
  res.sendFile(path.resolve(__dirname, "../client/index.html")),
);

app.use((err, req, res) => {
  console.error(err);

  if (err.stack && process.env.NODE_ENV === "production") delete err.stack;

  res.status(err.status || 500).send(err);
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
