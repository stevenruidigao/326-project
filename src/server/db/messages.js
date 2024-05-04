import { createDB, withPagination, withSerializer } from "./index.js";

const db = createDB("users");

/**
 * @typedef {{
 *      fromId: string,
 *      toId: string,
 *      time: number,
 *      text: string
 *  }} Message
 *
 * TODO
 */
