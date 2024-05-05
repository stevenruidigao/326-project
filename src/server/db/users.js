import { createDB, withPagination, withSerializer } from "./index.js";

const db = createDB("users");

/**
 * @typedef {{ _id: string }} User
 *
 * TODO
 */

/**
 * Finds a user by their id or their username (if it starts with an @)
 *
 * @param {string} identifier
 * @returns {Promise<User?>}
 */
export const findUser = (identifier) => {
  const method = identifier.startsWith("@") ? getByUsername : getById;
  const id = identifier.replace(/^@/, "");

  return method(id);
};

// * @param {User | User[] | PaginatedArray<User>} res Data to serialize
// * @param {string?} userId ID of logged in user

/**
 * Serialize a user for sending to the client
 *
 * @type {ReturnType<typeof withSerializer<User>>}
 */
export const serialize = withSerializer((user, loggedInId) => {
  const data = {
    _id: user._id,
    username: user.username,
    name: user.name,
    known: user.known || [],
    interests: user.interests || [],
  };

  // if logged in
  if (user._id === loggedInId) {
    data.email = user.email;
  }

  return data;
});

export const VALID_KEYS = ["name", "username", "email", "known", "interests"];

const USERS_PAGE_SIZE = 5;

/**
 * @type {ReturnType<typeof withPagination<User>>}
 */
const userPagination = withPagination(USERS_PAGE_SIZE);

/**
 * TODO
 *
 * @param {string} username
 * @returns {Promise<User?>}
 */
export const getByUsername = async (username) => {
  const result = await db.find({
    selector: {
      username: { $eq: username },
    },
    limit: 1,
  });

  return result.docs[0];
};

/**
 * TODO
 * @param {string} email
 * @returns {Promise<User?>}
 */
export const getByEmail = async (email) => {
  const result = await db.find({
    selector: {
      email: { $eq: email },
    },
    limit: 1,
  });

  return result.docs[0];
};

/**
 * TODO
 * @param {string} id
 * @returns {Promise<User?>}
 */
export const getById = async (id) => {
  try {
    return await db.get(id);
  } catch (error) {
    console.debug("[users] getById error", error);
    // Return null if the user is not found
    if (error.status === 404) {
      return null;
    }

    throw error;
  }
};

/**
 * Get users that have ANY of the skills listed AND any of the skills wanted.
 * NOTE: uses pagination, but behind the scenes it fetches ALL users and filters each time,
 * since this query does not allow for an index to be used.
 * @param {number} page
 * @param {string[]} skillsHad
 * @param {string[]} skillsWant
 * @returns {Promise<PaginatedArray<User>>}
 */
export const allWithSkills = (page = 1, skillsHad = [], skillsWant = []) =>
  // TODO probably fix logic
  userPagination(page, (opts) =>
    db.find({
      selector: {
        $and: [
          skillsHad.length && {
            $or: skillsHad.map((skill) => ({
              known: { $elemMatch: { $eq: skill } },
            })),
          },
          skillsWant.length && {
            $or: skillsWant.map((skill) => ({
              interests: { $elemMatch: { $eq: skill } },
            })),
          },
        ].filter(Boolean),
      },
      ...opts,
    }),
  );

// modify

/**
 * TODO
 * @param {User} user
 * @returns {Promise<User>}
 */
export const create = async (user) => {
  const result = await db.post(user);

  return { ...user, _id: result.id, _rev: result.rev };
};

/**
 * TODO
 *
 * @param {string} id User ID
 * @param {Omit<User, "id">} data
 * @returns {Promise<User>}
 */
export const update = async (id, data) => {
  const result = await db.put({
    ...data,
    _id: id,
  });

  return { ...data, _id: id, _rev: result.rev };
};

export default db;
