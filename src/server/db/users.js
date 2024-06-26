import { createDB, withPagination, withSerializer } from "./index.js";

export const db = createDB("users");

/**
 * @typedef {{
 *   _id: string,
 *   username: string,
 *   name: string,
 *   email?: string,
 *   known: string[],
 *   interests: string[],
 *   avatarUrl: string,
 * }} SerializedUser
 *
 * @typedef {Omit<SerializedUser, "avatarUrl"> & { password: string } &
 * Pick<PouchDB.Core.GetMeta, "_rev" | "_attachments">} User
 */

/**
 * Finds a user by their id or their username (if it starts with an \@)
 *
 * @param {string} identifier
 * @returns {Promise<User?>}
 */
export const findUser = (identifier) => {
  const method = identifier.startsWith("@") ? getByUsername : getById;
  const id = identifier.replace(/^@/, "");

  return method(id);
};

/**
 * Serialize a user for sending to the client
 *
 * @type {ReturnType<typeof withSerializer<User, SerializedUser>>}
 */
export const serialize = withSerializer((user, loggedInId) => {
  const avatar = user._attachments?.avatar;

  const data = {
    _id: user._id,
    username: user.username,
    name: user.name,
    known: user.known || [],
    interests: user.interests || [],
    avatarUrl: avatar
      ? `/api/users/${user._id}/avatar?${avatar.digest}`
      : "/images/logo.png",
  };

  // if logged in
  if (user._id === loggedInId) {
    data.email = user.email;
  }

  return data;
});

/**
 * Valid keys for user data -- used to maintain consistency in the database
 */
export const VALID_KEYS = ["name", "username", "email", "known", "interests"];

/**
 * How many users to show per page in paginated endpoints
 */
const USERS_PAGE_SIZE = 5;

/**
 * @type {ReturnType<typeof withPagination<User>>}
 */
const userPagination = withPagination(USERS_PAGE_SIZE);

/**
 * Find a user by their username
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
 * Find a user by their email
 *
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
 * Get a user's avatar
 *
 * @param {User} user
 * @returns {Promise<Blob | Buffer>}
 */
export const getAvatar = async (user) => {
  const avatar = user._attachments?.avatar;

  if (!avatar) return null;
  else if (avatar.data) return avatar.data;

  const attachment = await db.getAttachment(user._id, "avatar");

  avatar.data = attachment;

  return attachment;
};

/**
 * Get a user by their ID
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
 * NOTE: uses pagination, but behind the scenes it fetches ALL users and filters
 * each time, since this query does not allow for an index to be used.
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
 * Create a new user given their data
 * @param {Omit<User, "_attachments" | "_rev" | "_id">} user
 * @returns {Promise<User>}
 */
export const create = async (user) => {
  const result = await db.post(user);

  return { ...user, _id: result.id, _rev: result.rev };
};

/**
 * Update a user with new data
 *
 * @param {string} id User ID
 * @param {User} data
 * @returns {Promise<User>}
 */
export const update = async (id, data) => {
  const result = await db.put({
    ...data,
    _id: id,
  });

  return { ...data, _id: id, _rev: result.rev };
};

/**
 * Update a user's avatar. If no avatar is provided, the user's avatar is
 * removed.
 *
 * @param {User} user
 * @param {string} [mimetype]
 * @param {Blob | Buffer} [avatar]
 * @returns {Promise<User>}
 */
export const updateAvatar = async (user, mimetype, avatar) => {
  if (!user) throw new Error("User not found");

  if (!avatar) {
    if (user._attachments?.avatar) {
      const result = await db.removeAttachment(user._id, "avatar", user._rev);

      user._rev = result.rev;
      delete user._attachments.avatar;
    }

    return user;
  }

  await db.putAttachment(user._id, "avatar", user._rev, avatar, mimetype);

  return db.get(user._id);
};

export default db;
