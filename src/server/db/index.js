import path from "node:path";
import { fileURLToPath } from "node:url";

// PouchDB
import PouchDB from "pouchdb-node";
import PouchDBFind from "pouchdb-find";

PouchDB.plugin(PouchDBFind);

const __dirname =
  import.meta.dirname || path.dirname(fileURLToPath(import.meta.url));

export const directory = path.resolve(__dirname, "../../../db");

const LocalPouchDB = PouchDB.defaults({
  prefix: directory,
});

// Helper functions

export const createDB = (name) => new LocalPouchDB(`./${name}`);

/**
 * @typedef {{ data: T[], pagination: { prev?: number, current: number, next?: number, total?: number }}} PaginatedArray<T>
 * @template {any} T
 */

/**
 * Pagination helper function for PouchDB queries. The callback function
 * should utilize the `opts` object to pass to the query function.
 *
 * NOTE: .find() doesn't return total_rows equivalent (since we're querying
 * data) so we don't know when pagination ends until we reach a page with no
 * rows. Those queries will have to likely implement a "show more"
 * button/infinite scrolling on the frontend
 * @template {Record} T
 * @param {number} pageSize
 * @returns {(page: number, cb: (opts: { limit: number, skip: number }) => Promise<any>) =>
 *  Promise<PaginatedArray<T>>}
 */
export const withPagination = (pageSize) => async (page, cb) => {
  page = Math.max(1, page);

  const start = (page - 1) * pageSize;
  const res = await cb({ limit: pageSize, skip: start });

  if (res.warning) console.warn(`[PouchDB] ${res.warning}`);

  const rows = res.rows?.map((r) => r.doc || r);

  const data = [...(rows || res.docs)];
  const totalPages = Math.ceil(res.total_rows / pageSize);

  const pagination = {
    current: page,
  };

  if (page > 1) pagination.prev = Math.min(totalPages || Infinity, page - 1);

  // If we know there are more results OR we have a full page, state there is (likely) a next page
  if (totalPages ? page < totalPages : data.length === pageSize)
    pagination.next = page + 1;

  // Not present for .find() results. See note above function
  if (totalPages) pagination.total = totalPages;

  return { data, pagination };
};

/**
 *
 * @template T
 * @param {(doc: T) => object} serializer
 * @returns {(res: T | T[] | PaginatedArray, userId?: string) => object | object[] | PaginatedArray
 */
export const withSerializer = (serializer) => (res, userId) => {
  const serialize = (doc) => serializer(doc, userId);

  if (!res) return null;
  else if (Array.isArray(res)) return res.map(serialize);
  else if (res.data) return { ...res, data: res.data.map(serialize) };
  else if (res._id) return serialize(res);

  throw new Error(
    `Unknown response type for serializer:  ${JSON.stringify(res)}`,
  );
};
