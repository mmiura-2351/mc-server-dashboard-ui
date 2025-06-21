/**
 * Token manager to handle race conditions and secure token operations
 */
import { ok, err, type Result } from "neverthrow";
import { AuthStorage } from "./secure-storage";
import type { AuthError, RefreshTokenResponse } from "@/types/auth";

interface TokenRefreshRequest {
  refreshToken: string;
}

/**
 * Singleton token manager to prevent race conditions in token refresh
 */
class TokenManager {
  private static instance: TokenManager | null = null;
  private refreshPromise: Promise<
    Result<RefreshTokenResponse, AuthError>
  > | null = null;
  private refreshInProgress = false;
  private lastRefreshTime = 0;
  private readonly MIN_REFRESH_INTERVAL = 5000; // 5 seconds minimum between refreshes

  private constructor() {}

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  /**
   * Get access token with automatic refresh if needed
   */
  async getValidAccessToken(): Promise<string | null> {
    const accessToken = AuthStorage.getAccessToken();

    if (!accessToken) {
      return null;
    }

    // Check if token is expired (basic check - could be enhanced with JWT parsing)
    if (this.isTokenExpired(accessToken)) {
      const refreshResult = await this.refreshTokens();
      if (refreshResult.isOk()) {
        return refreshResult.value.access_token;
      }
      return null;
    }

    return accessToken;
  }

  /**
   * Refresh tokens with race condition protection
   */
  async refreshTokens(): Promise<Result<RefreshTokenResponse, AuthError>> {
    // Check if refresh is already in progress
    if (this.refreshInProgress && this.refreshPromise) {
      return this.refreshPromise;
    }

    // Check minimum refresh interval to prevent spam
    const now = Date.now();
    if (now - this.lastRefreshTime < this.MIN_REFRESH_INTERVAL) {
      return err({ message: "Refresh rate limited", status: 429 });
    }

    const refreshToken = AuthStorage.getRefreshToken();
    if (!refreshToken) {
      return err({ message: "No refresh token available", status: 401 });
    }

    // Set refresh in progress
    this.refreshInProgress = true;
    this.lastRefreshTime = now;

    // Create refresh promise
    this.refreshPromise = this.performTokenRefresh({ refreshToken });

    try {
      const result = await this.refreshPromise;

      if (result.isOk()) {
        // Update stored tokens
        const { access_token, refresh_token } = result.value;
        AuthStorage.setAuthTokens(access_token, refresh_token);

        // Dispatch custom event for UI updates
        this.dispatchTokenRefreshEvent(result.value);
      } else {
        // If refresh fails, clear all auth data
        AuthStorage.clearAuthData();
        this.dispatchAuthLogoutEvent();
      }

      return result;
    } finally {
      // Reset refresh state
      this.refreshInProgress = false;
      this.refreshPromise = null;
    }
  }

  /**
   * Perform the actual token refresh API call
   */
  private async performTokenRefresh(
    request: TokenRefreshRequest
  ): Promise<Result<RefreshTokenResponse, AuthError>> {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/refresh`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refresh_token: request.refreshToken }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return err({
          message: errorText || "Token refresh failed",
          status: response.status,
        });
      }

      const data = await response.json();
      return ok(data);
    } catch (error) {
      return err({
        message:
          error instanceof Error
            ? error.message
            : "Network error during token refresh",
        status: 0,
      });
    }
  }

  /**
   * JWT token expiration check with proper validation
   */
  private isTokenExpired(token: string): boolean {
    try {
      if (!token || token.length < 10) {
        return true;
      }

      const parts = token.split(".");
      if (parts.length !== 3) {
        return true;
      }

      const payload = JSON.parse(atob(parts[1]!));
      const currentTime = Math.floor(Date.now() / 1000);

      // Check expiration (exp claim)
      if (payload.exp && currentTime >= payload.exp) {
        return true;
      }

      // Check not before (nbf claim)
      if (payload.nbf && currentTime < payload.nbf) {
        return true;
      }

      return false;
    } catch (error) {
      console.warn("Token validation error:", error);
      return true;
    }
  }

  /**
   * Clear all token-related data
   */
  clearTokens(): void {
    AuthStorage.clearAuthData();
    this.refreshInProgress = false;
    this.refreshPromise = null;
    this.lastRefreshTime = 0;
  }

  /**
   * Check if tokens are available
   */
  hasTokens(): boolean {
    const { accessToken, refreshToken } = AuthStorage.getAuthTokens();
    return !!(accessToken && refreshToken);
  }

  /**
   * Get current token status
   */
  getTokenStatus(): {
    hasAccessToken: boolean;
    hasRefreshToken: boolean;
    refreshInProgress: boolean;
  } {
    const { accessToken, refreshToken } = AuthStorage.getAuthTokens();
    return {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      refreshInProgress: this.refreshInProgress,
    };
  }

  /**
   * Dispatch token refresh event for UI updates
   */
  private dispatchTokenRefreshEvent(tokens: RefreshTokenResponse): void {
    if (typeof window !== "undefined") {
      const event = new CustomEvent("tokenRefresh", {
        detail: tokens,
      });
      window.dispatchEvent(event);
    }
  }

  /**
   * Dispatch auth logout event for UI updates
   */
  private dispatchAuthLogoutEvent(): void {
    if (typeof window !== "undefined") {
      const event = new CustomEvent("authLogout");
      window.dispatchEvent(event);
    }
  }

  /**
   * Handle network errors and token validation
   */
  handleAPIError(status: number, _error: string): boolean {
    if (status === 401) {
      // Token expired or invalid
      this.clearTokens();
      this.dispatchAuthLogoutEvent();
      return true;
    }
    return false;
  }
}

// Export singleton instance
export const tokenManager = TokenManager.getInstance();

/**
 * Hook for easy token management in components
 */
export function useTokenManager() {
  return {
    getValidAccessToken: () => tokenManager.getValidAccessToken(),
    refreshTokens: () => tokenManager.refreshTokens(),
    clearTokens: () => tokenManager.clearTokens(),
    hasTokens: () => tokenManager.hasTokens(),
    getTokenStatus: () => tokenManager.getTokenStatus(),
  };
}
