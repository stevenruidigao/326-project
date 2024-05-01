export class APIError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export const requiresAuth = (req, res, next) => {
  if (!req.user) {
    throw new APIError("Unauthorized", 401);
  }

  next();
};
