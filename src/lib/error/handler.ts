import { AppError } from "./types";
import { HttpStatus } from "@enums/http.enum";
import { logger } from "@lib/logger/logger";

export function handleError(error: unknown): string {
  if (error instanceof AppError) {
    logger.error(`[${error.name}] ${error.message}`, { status: error.status });

    // Define generic HTTP status texts to avoid displaying them directly to users
    const genericMessages = [
      "bad request",
      "unauthorized",
      "payment required",
      "forbidden",
      "not found",
      "method not allowed",
      "not acceptable",
      "request timeout",
      "conflict",
      "gone",
      "length required",
      "precondition failed",
      "payload too large",
      "uri too long",
      "unsupported media type",
      "range not satisfiable",
      "expectation failed",
      "misdirected request",
      "unprocessable entity",
      "locked",
      "failed dependency",
      "too early",
      "upgrade required",
      "precondition required",
      "too many requests",
      "request header fields too large",
      "unavailable for legal reasons",
      "internal server error",
      "not implemented",
      "bad gateway",
      "service unavailable",
      "gateway timeout",
      "http version not supported",
      "variant also negotiates",
      "insufficient storage",
      "loop detected",
      "not extended",
      "network authentication required"
    ];

    const lowerMessage = error.message?.toLowerCase().trim();
    if (lowerMessage && !genericMessages.includes(lowerMessage)) {
      return error.message;
    }

    switch (error.status) {
      case HttpStatus.UNAUTHORIZED:
        return "Session expired. Please sign in again.";
      case HttpStatus.NOT_FOUND:
        return "The requested resource was not found.";
      case HttpStatus.TOO_MANY_REQUESTS:
        return "Too many requests. Please slow down.";
      case HttpStatus.INTERNAL_SERVER_ERROR:
      default:
        return "Something went wrong. Please try again.";
    }
  }

  if (error instanceof Error) {
    logger.error("[UnhandledError]", { message: error.message });
    return error.message || "An error occurred.";
  }

  // Handle non-Error objects
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = String((error as any).message || "An error occurred.");
    logger.error("[UnhandledError]", { message: msg });
    return msg;
  }

  logger.error("[UnhandledError]", { error });
  return "An unexpected error occurred.";
}
