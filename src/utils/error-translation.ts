import type { AuthError } from "@/types/auth";
import type { ApiError } from "@/services/api-types";

type TranslationFunction = (
  key: string,
  params?: Record<string, string>
) => string;

interface TranslationOptions {
  context?: string;
  action?: string;
}

/**
 * Translates API errors to user-friendly localized messages
 * @param error - The error object or string
 * @param t - The translation function
 * @param options - Additional context for translation
 * @returns Translated error message
 */
// Common error interface
interface ErrorWithMessage {
  message: string;
  status?: number;
}

export function translateError(
  error: ApiError | AuthError | ErrorWithMessage | Error | string,
  t: TranslationFunction,
  options: TranslationOptions = {}
): string {
  // Handle string errors
  if (typeof error === "string") {
    return t("errors.generic");
  }

  const { status, message } = error as ErrorWithMessage;
  const { context, action } = options;

  // Check for specific message patterns first
  if (message) {
    const lowerMessage = message.toLowerCase();

    // Pending approval pattern
    if (lowerMessage.includes("pending approval")) {
      return t("errors.pendingApproval");
    }

    // Timeout pattern
    if (lowerMessage.includes("timeout")) {
      return t("errors.timeout");
    }

    // Version loading specific errors
    if (context === "version-loading") {
      if (lowerMessage.includes("version")) {
        return t("servers.create.errors.failedToLoadVersions");
      }
    }
  }

  // Handle by status code
  switch (status) {
    case 401:
      // In authentication context, use specific message for invalid credentials
      if (context === "auth") {
        return t("errors.invalidCredentials");
      }
      return t("errors.unauthorized");

    case 403:
      return t("errors.forbidden");

    case 404:
      return t("errors.notFound");

    case 408:
      return t("errors.timeout");

    case 409:
      return t("errors.conflict");

    case 422:
      return t("errors.validation");

    case 429:
      return t("errors.tooManyAttempts");

    case 500:
    case 502:
    case 503:
    case 504:
      if (action) {
        return t("errors.operationFailed", { action });
      }
      return t("errors.serverError");

    case 0:
      return t("errors.network");

    default:
      if (action) {
        return t("errors.operationFailed", { action });
      }
      return t("errors.generic");
  }
}
