import { createDB, withPagination } from "./index.js";

const db = createDB("users");

const USERS_PAGE_SIZE = 5;
const userPagination = withPagination(USERS_PAGE_SIZE);

/**
 * @typedef {Object} User
 * TODO
 */

/**
 * TODO
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
    console.debug("[users] getById", id);
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
 * TODO
 * @param {User} user
 * @returns {Promise<User>}
 */
export const create = async (user) => {
  const result = await db.post(user);

  return { ...user, _id: result.id, _rev: result.rev };
};

/**
 * Get users that have ANY of the skills listed AND any of the skills wanted.
 * NOTE: uses pagination, but behind the scenes it fetches ALL users and filters each time,
 * since this query does not allow for an index to be used.
 * @param {number} page
 * @param {string[]} skillsHad
 * @param {string[]} skillsWant
 * @returns
 */
export const allWithSkills = (page = 1, skillsHad = [], skillsWant = []) =>
  // TODO probably fix logic
  userPagination(page, (opts) =>
    db.find({
      selector: {
        $and: [
          skillsHad.length && {
            $or: skillsHad.map((skill) => ({
              skills: { $elemMatch: { $eq: skill } },
            })),
          },
          skillsWant.length && {
            $or: skillsWant.map((skill) => ({
              skillsWanted: { $elemMatch: { $eq: skill } },
            })),
          },
        ].filter(Boolean),
      },
      ...opts,
    }),
  );

/**
 * Serialize a user for sending to the client
 *
 * @param {User} user
 * @param {string} loggedInId
 * @returns {Promise<User>}
 */
export const serialize = (user, loggedInId) => {
  const data = {
    _id: user._id,
    username: user.username,
    known: user.known || [],
    interests: user.interests || [],
  };

  // if logged in
  if (user._id === loggedInId) {
    data.username = user.username;
    data.email = user.email;
    data.name = user.name;
  }

  return data;
};

// TODO more

export default db;
