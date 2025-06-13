import { ok, err, type Result } from "neverthrow";
import type {
  AuthError,
} from "@/types/auth";
import type { ApiRequestConfig } from "./api-types";
import { ResponseHandlerManager } from "./response-handlers";
import { tokenManager } from "@/utils/token-manager";

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

    const requestOptions: RequestInit = {
      ...options,
      headers: requestHeaders,
    };

    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      return handleErrorResponse(response);
    }

    return handleSuccessResponse<T>(response, config);
  } catch (error) {
    return err({
      message: error instanceof Error ? error.message : "Network error",
    });
  }
}

// Handle error responses
async function handleErrorResponse(
  response: Response
): Promise<Result<never, AuthError>> {
  const errorText = await response.text();
  let errorMessage = "An error occurred";

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

  return err({
    message: errorMessage,
    status: response.status,
  });
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

// Enhanced fetch function with automatic token refresh via TokenManager
export async function fetchWithErrorHandling<T>(
  url: string,
  config: ApiRequestConfig = {},
  skipAutoRefresh = false
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

  // Handle 401 errors with TokenManager
  if (result.isErr() && result.error.status === 401 && !skipAutoRefresh) {
    // Let TokenManager handle the error and potential logout
    const handled = tokenManager.handleAPIError(result.error.status || 0, result.error.message);
    
    if (handled) {
      // Try to get a fresh token one more time
      const freshToken = await tokenManager.getValidAccessToken();
      if (freshToken) {
        // Retry the original request with new token
        const newHeaders = new Headers(config.headers as HeadersInit);
        newHeaders.set("Authorization", `Bearer ${freshToken}`);

        const newConfig: ApiRequestConfig = {
          ...config,
          headers: newHeaders,
        };

        return fetchWithErrorHandlingInternal<T>(url, newConfig);
      }
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

export async function fetchBlob(
  url: string,
  config: Omit<ApiRequestConfig, "expectEmpty" | "expectBlob"> = {}
): Promise<Result<Blob, AuthError>> {
  return fetchWithErrorHandling<Blob>(url, { ...config, expectBlob: true });
}

export { fetchWithErrorHandlingInternal };
