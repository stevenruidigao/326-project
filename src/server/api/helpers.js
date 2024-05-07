export class APIError extends Error {
  /** Constructor for APIError
   * 
   * @param {string} message 
   * @param {number} status 
   */
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

/**
 *  Checks if a request requires authentication
 * 
 * @param {Request} req
 * @param {Response} res
 * @param {Function} next
 */
export const requiresAuth = (req, res, next) => {
  if (!req.user) {
    throw new APIError("Unauthorized", 401);
  }

  next();
};
