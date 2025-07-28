/**
 * Safely gets an error message from an unknown type.
 * @param error The error object, which is of type 'unknown' in a catch block.
 * @returns A string representing the error message.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unknown error occurred.";
}