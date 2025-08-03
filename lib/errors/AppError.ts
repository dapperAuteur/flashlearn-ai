/**
 * Custom error class for the application.
 * Allows for creating errors with a specific HTTP status code, which can be
 * used to send appropriate responses from API routes.
 * * @example
 * // In an API route
 * if (!user) {
 * throw new AppError("User not found", 404);
 * }
 */
export class AppError extends Error {
  /**
   * The HTTP status code associated with the error.
   * @type {number}
   */
  public readonly statusCode: number;

  /**
   * Creates an instance of AppError.
   * @param {string} message - The error message.
   * @param {number} [statusCode=500] - The HTTP status code. Defaults to 500.
   */
  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = "AppError";

    // This line is to ensure that `instanceof AppError` works correctly.
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
