import { ok, err, type Result } from "neverthrow";
import type {
  AuthError,
  RefreshTokenRequest,
  RefreshTokenResponse,
} from "@/types/auth";
import type { ApiRequestConfig, JsonResponse, BlobResponse } from "./api-types";
import { ResponseHandlerManager } from "./response-handlers";

// Global refresh token promise to prevent multiple simultaneous refresh attempts
let refreshPromise: Promise<Result<RefreshTokenResponse, AuthError>> | null =
  null;

interface ValidationError {
  loc: string[];
  msg: string;
  type: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
        return ok((apiResponse as JsonResponse<T>).data);
      case "empty":
        // For empty responses, return appropriate empty value based on expected type
        return ok({} as T);
      case "blob":
        return ok((apiResponse as BlobResponse).data as T);
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

// Refresh token function (single attempt)
async function refreshTokenSingle(
  refreshData: RefreshTokenRequest
): Promise<Result<RefreshTokenResponse, AuthError>> {
  return fetchWithErrorHandlingInternal<RefreshTokenResponse>(
    `${API_BASE_URL}/api/v1/auth/refresh`,
    {
      method: "POST",
      body: JSON.stringify(refreshData),
    }
  );
}

// Refresh token with singleton pattern to prevent multiple simultaneous attempts
async function refreshToken(
  refreshTokenValue: string
): Promise<Result<RefreshTokenResponse, AuthError>> {
  // If there's already a refresh in progress, wait for it
  if (refreshPromise) {
    return refreshPromise;
  }

  // Start new refresh
  refreshPromise = refreshTokenSingle({ refresh_token: refreshTokenValue });

  // Wait for the result
  const result = await refreshPromise;

  // Clear the promise regardless of success/failure
  refreshPromise = null;

  return result;
}

// Enhanced fetch function with automatic token refresh
export async function fetchWithErrorHandling<T>(
  url: string,
  config: ApiRequestConfig = {},
  skipAutoRefresh = false
): Promise<Result<T, AuthError>> {
  // Add authorization header if token exists
  const token = localStorage.getItem("access_token");
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

  // Handle 401 errors with automatic token refresh
  if (result.isErr() && result.error.status === 401 && !skipAutoRefresh) {
    const refreshTokenValue = localStorage.getItem("refresh_token");

    if (refreshTokenValue) {
      const refreshResult = await refreshToken(refreshTokenValue);

      if (refreshResult.isOk()) {
        // Update stored tokens
        const { access_token, refresh_token: newRefreshToken } =
          refreshResult.value;
        localStorage.setItem("access_token", access_token);
        localStorage.setItem("refresh_token", newRefreshToken);

        // Dispatch custom event to notify other parts of the app about token refresh
        window.dispatchEvent(
          new CustomEvent("tokenRefresh", {
            detail: { access_token, refresh_token: newRefreshToken },
          })
        );

        // Retry the original request with new token
        const newHeaders = new Headers(config.headers as HeadersInit);
        newHeaders.set("Authorization", `Bearer ${access_token}`);

        const newConfig: ApiRequestConfig = {
          ...config,
          headers: newHeaders,
        };

        return fetchWithErrorHandlingInternal<T>(url, newConfig);
      } else {
        // Refresh failed, clear tokens and notify app
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user_data");

        // Dispatch logout event to notify AuthContext
        window.dispatchEvent(new CustomEvent("authLogout"));
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
