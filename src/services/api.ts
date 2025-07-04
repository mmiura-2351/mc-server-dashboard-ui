import { ok, err, type Result } from "neverthrow";
import type { AuthError } from "@/types/auth";
import type { ApiRequestConfig } from "./api-types";
import { ResponseHandlerManager } from "./response-handlers";
import { tokenManager } from "@/utils/token-manager";
import { ErrorHandler } from "@/utils/error-handler";

// Note: Token refresh is now handled by TokenManager to prevent race conditions

interface ValidationError {
  loc: string[];
  msg: string;
  type: string;
}

// API_BASE_URL moved to token manager

// Response handler manager instance
const responseHandler = new ResponseHandlerManager();

// Internal fetch function without auto-refresh (to avoid circular dependency in refreshToken)
async function fetchWithErrorHandlingInternal<T>(
  url: string,
  config: ApiRequestConfig = {}
): Promise<Result<T, AuthError>> {
  try {
    const {
      expectEmpty: _expectEmpty,
      expectBlob: _expectBlob,
      timeout,
      ...options
    } = config;

    // Set up headers - don't add Content-Type for FormData (browser will set it automatically)
    let requestHeaders: HeadersInit | undefined = options.headers;

    if (!(options.body instanceof FormData)) {
      const headersObj = new Headers(options.headers as HeadersInit);
      if (!headersObj.has("Content-Type")) {
        headersObj.set("Content-Type", "application/json");
      }
      requestHeaders = headersObj;
    } else {
      // For FormData, keep headers as-is (don't convert to Headers object)
      requestHeaders = options.headers;
    }

    // Set up timeout using AbortController if timeout is specified
    let controller: AbortController | undefined;
    let timeoutId: NodeJS.Timeout | undefined;

    if (timeout && timeout > 0) {
      controller = new AbortController();
      timeoutId = setTimeout(() => {
        controller?.abort();
      }, timeout);
    }

    const requestOptions: RequestInit = {
      ...options,
      headers: requestHeaders,
      signal: controller?.signal,
    };

    const response = await fetch(url, requestOptions);

    // Clear timeout if request completed successfully
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      return handleErrorResponse(response, "network_request");
    }

    return handleSuccessResponse<T>(response, config);
  } catch (error) {
    // Handle abort/timeout errors specifically
    if (error instanceof Error && error.name === "AbortError") {
      const timeoutError = ErrorHandler.createNetworkError(
        "Request timeout - the operation took too long to complete",
        "network_timeout",
        {
          status: 408,
          retryable: true,
          suggestions: [
            "Check your internet connection",
            "Try again with a longer timeout",
          ],
        }
      );
      ErrorHandler.logError(timeoutError);

      return err({
        message: timeoutError.message,
        status: 408, // HTTP 408 Request Timeout
      });
    }

    const networkError = ErrorHandler.createNetworkError(
      error instanceof Error ? error.message : "Network error",
      "network_exception",
      {
        retryable: true,
        suggestions: [
          "Check your internet connection",
          "Verify the server is accessible",
        ],
      }
    );
    ErrorHandler.logError(networkError);

    return err({
      message: networkError.message,
    });
  }
}

// Handle error responses with enhanced error context
async function handleErrorResponse(
  response: Response,
  operation: string = "api_request"
): Promise<Result<never, AuthError>> {
  const errorText = await response.text();
  let errorMessage = "An error occurred";
  let suggestions: string[] = [];

  try {
    const errorData = JSON.parse(errorText);

    // Handle FastAPI validation errors (422)
    if (response.status === 422 && Array.isArray(errorData.detail)) {
      // Extract validation error messages
      const validationErrors = errorData.detail
        .map((error: ValidationError) => {
          const field = error.loc ? error.loc.join(".") : "field";
          return `${field}: ${error.msg}`;
        })
        .join(", ");
      errorMessage = `Validation error: ${validationErrors}`;
      suggestions = [
        "Please check your input data",
        "Verify all required fields are provided",
      ];
    } else if (errorData.detail) {
      // Handle standard FastAPI errors
      errorMessage = errorData.detail;
    } else {
      // Fallback for other error formats
      errorMessage = errorText || `HTTP ${response.status}`;
    }
  } catch {
    errorMessage = errorText || `HTTP ${response.status}`;
  }

  // Create structured error based on status code
  let structuredError;

  if (response.status === 401) {
    structuredError = ErrorHandler.createAuthError(errorMessage, operation, {
      status: response.status,
      shouldLogout: true,
      retryable: true,
      suggestions:
        suggestions.length > 0
          ? suggestions
          : ["Please log in again", "Check your session status"],
    });
  } else if (response.status === 403) {
    structuredError = ErrorHandler.createAuthError(errorMessage, operation, {
      status: response.status,
      shouldLogout: false,
      retryable: false,
      suggestions: [
        "You may not have permission for this action",
        "Contact an administrator",
      ],
    });
  } else if (response.status === 422) {
    structuredError = ErrorHandler.createValidationError(
      errorMessage,
      operation,
      {
        suggestions:
          suggestions.length > 0
            ? suggestions
            : ["Please check your input and try again"],
      }
    );
  } else {
    structuredError = ErrorHandler.createNetworkError(errorMessage, operation, {
      status: response.status,
      retryable: [408, 429, 500, 502, 503, 504].includes(response.status),
      suggestions: getNetworkErrorSuggestions(response.status),
    });
  }

  // Log the structured error for debugging
  ErrorHandler.logError(structuredError);

  // Return compatible AuthError for existing code
  return err({
    message: structuredError.message,
    status: response.status,
  });
}

// Get suggestions based on HTTP status code
function getNetworkErrorSuggestions(status: number): string[] {
  const suggestions: Record<number, string[]> = {
    400: ["Check your request data", "Verify the request format"],
    404: ["The resource was not found", "Check the URL or refresh the page"],
    408: ["Request timed out", "Check your connection and try again"],
    429: ["Too many requests", "Please wait a moment and try again"],
    500: ["Server error", "Please try again later"],
    502: ["Service unavailable", "Please try again in a few minutes"],
    503: ["Service under maintenance", "Please try again later"],
    504: ["Gateway timeout", "Please try again later"],
  };

  return suggestions[status] || ["Please check your connection and try again"];
}

// Handle success responses with proper type detection
async function handleSuccessResponse<T>(
  response: Response,
  config: ApiRequestConfig
): Promise<Result<T, AuthError>> {
  try {
    const apiResponse = await responseHandler.handleResponse<T>(
      response,
      config
    );

    switch (apiResponse.type) {
      case "json":
        return ok(apiResponse.data);
      case "empty":
        // For empty responses, return appropriate empty value based on expected type
        return ok({} as T);
      case "blob":
        return ok(apiResponse.data as T);
      default:
        return err({
          message: "Unknown response type",
          status: response.status,
        });
    }
  } catch (error) {
    return err({
      message:
        error instanceof Error ? error.message : "Failed to handle response",
      status: response.status,
    });
  }
}

// Token refresh is now handled by TokenManager

// Retry configuration
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second base delay
  maxDelay: 5000, // 5 second maximum delay
};

// Track active refresh attempts to prevent simultaneous retries
const activeRefreshAttempts = new Set<string>();

// Utility functions for retry configuration
export function createRetryConfig(
  maxRetries: number = 3,
  baseDelay: number = 1000,
  maxDelay: number = 5000
): RetryConfig {
  return { maxRetries, baseDelay, maxDelay };
}

export function createNoRetryConfig(): RetryConfig {
  return { maxRetries: 0, baseDelay: 0, maxDelay: 0 };
}

export function createAggressiveRetryConfig(): RetryConfig {
  return { maxRetries: 5, baseDelay: 500, maxDelay: 3000 };
}

// Test utility to clear active refresh attempts
export function clearActiveRefreshAttempts(): void {
  activeRefreshAttempts.clear();
}

// Enhanced fetch function with automatic token refresh via TokenManager
export async function fetchWithErrorHandling<T>(
  url: string,
  config: ApiRequestConfig = {},
  skipAutoRefresh = false,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<Result<T, AuthError>> {
  return fetchWithRetry<T>(url, config, skipAutoRefresh, retryConfig, 0);
}

// Internal retry function with exponential backoff
async function fetchWithRetry<T>(
  url: string,
  config: ApiRequestConfig,
  skipAutoRefresh: boolean,
  retryConfig: RetryConfig,
  retryCount: number
): Promise<Result<T, AuthError>> {
  // Get valid token through TokenManager (handles refresh automatically)
  const token = await tokenManager.getValidAccessToken();
  if (token) {
    if (config.headers instanceof Headers) {
      config.headers.set("Authorization", `Bearer ${token}`);
    } else {
      const headers = new Headers(config.headers as HeadersInit);
      headers.set("Authorization", `Bearer ${token}`);
      config.headers = headers;
    }
  }

  // Make the initial request
  const result = await fetchWithErrorHandlingInternal<T>(url, config);

  // Handle 401 errors with retry limits and exponential backoff
  if (result.isErr() && result.error.status === 401 && !skipAutoRefresh) {
    // Check if we've exceeded retry limits
    if (retryCount >= retryConfig.maxRetries) {
      return err({
        message: "Authentication failed after maximum retries",
        status: 401,
      });
    }

    // Create unique key for this request to prevent duplicate refresh attempts
    const requestKey = `${url}-${JSON.stringify(config)}`;

    // Check if this exact request is already being retried
    if (activeRefreshAttempts.has(requestKey)) {
      return err({
        message: "Refresh already in progress for this request",
        status: 401,
      });
    }

    try {
      // Mark this request as being retried
      activeRefreshAttempts.add(requestKey);

      // Let TokenManager handle the error and potential logout
      const handled = tokenManager.handleAPIError(
        result.error.status || 0,
        result.error.message
      );

      if (handled) {
        // Apply exponential backoff delay before retry
        if (retryCount > 0) {
          const delay = Math.min(
            retryConfig.baseDelay * Math.pow(2, retryCount - 1),
            retryConfig.maxDelay
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        // Try to get a fresh token
        const freshToken = await tokenManager.getValidAccessToken();
        if (freshToken) {
          // Retry the original request with new token
          return fetchWithRetry<T>(
            url,
            config,
            skipAutoRefresh,
            retryConfig,
            retryCount + 1
          );
        }
      }

      // If token refresh failed or wasn't handled, return auth error
      return err({
        message: "Authentication failed - unable to refresh token",
        status: 401,
      });
    } finally {
      // Always clean up the active refresh attempt
      activeRefreshAttempts.delete(requestKey);
    }
  }

  return result;
}

// Convenience functions for specific operation types
export async function fetchJson<T>(
  url: string,
  config: Omit<ApiRequestConfig, "expectEmpty" | "expectBlob"> = {}
): Promise<Result<T, AuthError>> {
  return fetchWithErrorHandling<T>(url, {
    ...config,
    expectEmpty: false,
    expectBlob: false,
  });
}

export async function fetchEmpty(
  url: string,
  config: Omit<ApiRequestConfig, "expectEmpty" | "expectBlob"> = {}
): Promise<Result<void, AuthError>> {
  const result = await fetchWithErrorHandling<void>(url, {
    ...config,
    expectEmpty: true,
  });
  return result.map(() => undefined);
}

export { fetchWithErrorHandlingInternal };
