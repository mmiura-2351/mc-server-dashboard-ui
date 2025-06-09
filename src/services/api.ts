import { ok, err, type Result } from "neverthrow";
import type {
  AuthError,
  RefreshTokenRequest,
  RefreshTokenResponse,
} from "@/types/auth";

// Global refresh token promise to prevent multiple simultaneous refresh attempts
let refreshPromise: Promise<Result<RefreshTokenResponse, AuthError>> | null = null;

interface ValidationError {
  loc: string[];
  msg: string;
  type: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Internal fetch function without auto-refresh (to avoid circular dependency in refreshToken)
async function fetchWithErrorHandlingInternal<T>(
  url: string,
  options?: RequestInit
): Promise<Result<T, AuthError>> {
  try {
    // Only add Content-Type header if not already specified and body is not FormData
    const headers: HeadersInit = { ...options?.headers };

    // Don't add Content-Type for FormData (browser will set it automatically)
    if (!(options?.body instanceof FormData)) {
      const headersObj = new Headers(headers);
      if (!headersObj.has("Content-Type")) {
        headersObj.set("Content-Type", "application/json");
      }

      const requestOptions: RequestInit = {
        ...options,
        headers: headersObj,
      };

      const response = await fetch(url, requestOptions);

      if (!response.ok) {
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

      const data = await response.json();
      return ok(data);
    } else {
      // For FormData, use original headers without modification
      const requestOptions: RequestInit = {
        ...options,
        headers:
          headers instanceof Headers
            ? headers
            : new Headers(headers as HeadersInit),
      };

      const response = await fetch(url, requestOptions);

      if (!response.ok) {
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

      const data = await response.json();
      return ok(data);
    }
  } catch (error) {
    return err({
      message: error instanceof Error ? error.message : "Network error",
    });
  }
}

async function refreshTokenSingle(
  refreshTokenData: RefreshTokenRequest
): Promise<Result<RefreshTokenResponse, AuthError>> {
  return fetchWithErrorHandlingInternal<RefreshTokenResponse>(
    `${API_BASE_URL}/api/v1/auth/refresh`,
    {
      method: "POST",
      body: JSON.stringify(refreshTokenData),
    }
  );
}

// Centralized refresh token function that prevents multiple simultaneous refresh attempts
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
  options?: RequestInit,
  skipAutoRefresh = false
): Promise<Result<T, AuthError>> {
  // Get auth token from localStorage and add it to headers
  const token = localStorage.getItem("access_token");

  const headers: HeadersInit = { ...options?.headers };
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const requestOptions = {
    ...options,
    headers,
  };

  const result = await fetchWithErrorHandlingInternal<T>(url, requestOptions);

  // If the request failed with 401 and we have a refresh token, try to refresh
  if (
    !skipAutoRefresh &&
    result.isErr() &&
    result.error.status === 401 &&
    token
  ) {
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
        window.dispatchEvent(new CustomEvent('tokenRefresh', {
          detail: { access_token, refresh_token: newRefreshToken }
        }));

        // Retry the original request with new token
        const newHeaders = {
          ...headers,
          Authorization: `Bearer ${access_token}`,
        };

        const newOptions = {
          ...options,
          headers: newHeaders,
        };

        return fetchWithErrorHandlingInternal<T>(url, newOptions);
      } else {
        // Refresh failed, clear tokens and notify app
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user_data");
        
        // Dispatch logout event to notify AuthContext
        window.dispatchEvent(new CustomEvent('authLogout'));
      }
    }
  }

  return result;
}

export { fetchWithErrorHandlingInternal };
