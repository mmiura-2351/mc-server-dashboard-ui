import { describe, test, expect, beforeEach, vi, afterEach } from "vitest";
import { tokenManager } from "../token-manager";
import { AuthStorage } from "../secure-storage";

// Mock AuthStorage
vi.mock("../secure-storage", () => ({
  AuthStorage: {
    getAccessToken: vi.fn(),
    getRefreshToken: vi.fn(),
    setAuthTokens: vi.fn(),
    clearAuthData: vi.fn(),
    getAuthTokens: vi.fn(),
  },
}));

// Mock fetch
global.fetch = vi.fn();

// Mock window events
const mockEventDispatcher = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
};

Object.defineProperty(global, "window", {
  value: mockEventDispatcher,
  writable: true,
});

describe("TokenManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Reset the singleton instance to ensure clean state
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (tokenManager as any).refreshPromise = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (tokenManager as any).refreshInProgress = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (tokenManager as any).lastRefreshTime = 0;

    // Advance time to reset rate limiting
    vi.advanceTimersByTime(10000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("getValidAccessToken", () => {
    // Helper function to create valid JWT tokens for testing
    const createValidJWTToken = () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const payload = {
        sub: "user123",
        exp: futureTime,
        iat: Math.floor(Date.now() / 1000),
      };
      const header = { alg: "HS256", typ: "JWT" };
      const encodedHeader = btoa(JSON.stringify(header));
      const encodedPayload = btoa(JSON.stringify(payload));
      return `${encodedHeader}.${encodedPayload}.mock-signature`;
    };

    test("should return valid token if available", async () => {
      const mockToken = createValidJWTToken();
      vi.mocked(AuthStorage.getAccessToken).mockReturnValue(mockToken);

      const result = await tokenManager.getValidAccessToken();

      expect(result).toBe(mockToken);
      expect(AuthStorage.getAccessToken).toHaveBeenCalledOnce();
    });

    test("should return null if no token available", async () => {
      vi.mocked(AuthStorage.getAccessToken).mockReturnValue(null);

      const result = await tokenManager.getValidAccessToken();

      expect(result).toBeNull();
    });

    test("should return token when available", async () => {
      const validToken = createValidJWTToken();

      vi.mocked(AuthStorage.getAccessToken).mockReturnValue(validToken);

      const result = await tokenManager.getValidAccessToken();

      expect(result).toBe(validToken);
    });

    test("should refresh token when access token is expired", async () => {
      // Create an expired JWT token
      const expiredTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const expiredPayload = {
        sub: "user123",
        exp: expiredTime,
        iat: Math.floor(Date.now() / 1000) - 7200,
      };
      const header = { alg: "HS256", typ: "JWT" };
      const encodedHeader = btoa(JSON.stringify(header));
      const encodedPayload = btoa(JSON.stringify(expiredPayload));
      const expiredToken = `${encodedHeader}.${encodedPayload}.mock-signature`;

      const newAccessToken = "new-access-token";
      const refreshToken = "valid-refresh-token";

      vi.mocked(AuthStorage.getAccessToken).mockReturnValue(expiredToken);
      vi.mocked(AuthStorage.getRefreshToken).mockReturnValue(refreshToken);
      vi.mocked(AuthStorage.setAuthTokens).mockReturnValue(true);

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: newAccessToken,
            refresh_token: "new-refresh-token",
          }),
      } as Response);

      const result = await tokenManager.getValidAccessToken();

      expect(result).toBe(newAccessToken);
      expect(fetch).toHaveBeenCalledWith(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/refresh`,
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        })
      );
    });

    test("should return null when expired token refresh fails", async () => {
      // Create an expired JWT token
      const expiredTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const expiredPayload = {
        sub: "user123",
        exp: expiredTime,
        iat: Math.floor(Date.now() / 1000) - 7200,
      };
      const header = { alg: "HS256", typ: "JWT" };
      const encodedHeader = btoa(JSON.stringify(header));
      const encodedPayload = btoa(JSON.stringify(expiredPayload));
      const expiredToken = `${encodedHeader}.${encodedPayload}.mock-signature`;

      const refreshToken = "invalid-refresh-token";

      vi.mocked(AuthStorage.getAccessToken).mockReturnValue(expiredToken);
      vi.mocked(AuthStorage.getRefreshToken).mockReturnValue(refreshToken);

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve("Unauthorized"),
      } as Response);

      const result = await tokenManager.getValidAccessToken();

      expect(result).toBeNull();
    });
  });

  describe("refreshTokens", () => {
    test("should refresh tokens successfully", async () => {
      const refreshToken = "valid-refresh-token";
      const newAccessToken = "new-access-token";
      const newRefreshToken = "new-refresh-token";

      vi.mocked(AuthStorage.getRefreshToken).mockReturnValue(refreshToken);
      vi.mocked(AuthStorage.setAuthTokens).mockReturnValue(true);

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: newAccessToken,
            refresh_token: newRefreshToken,
          }),
      } as Response);

      const result = await tokenManager.refreshTokens();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.access_token).toBe(newAccessToken);
        expect(result.value.refresh_token).toBe(newRefreshToken);
      }
      expect(AuthStorage.setAuthTokens).toHaveBeenCalledWith(
        newAccessToken,
        newRefreshToken
      );
      expect(mockEventDispatcher.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "tokenRefresh",
          detail: {
            access_token: newAccessToken,
            refresh_token: newRefreshToken,
          },
        })
      );
    });

    test("should handle refresh failure", async () => {
      const refreshToken = "invalid-refresh-token";

      vi.mocked(AuthStorage.getRefreshToken).mockReturnValue(refreshToken);
      vi.mocked(AuthStorage.clearAuthData).mockReturnValue(true);

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve("Unauthorized"),
      } as Response);

      const result = await tokenManager.refreshTokens();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Unauthorized");
        expect(result.error.status).toBe(401);
      }
      expect(AuthStorage.clearAuthData).toHaveBeenCalledOnce();
      expect(mockEventDispatcher.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: "authLogout" })
      );
    });

    test("should handle network errors", async () => {
      const refreshToken = "valid-refresh-token";

      vi.mocked(AuthStorage.getRefreshToken).mockReturnValue(refreshToken);
      vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

      const result = await tokenManager.refreshTokens();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Network error");
        expect(result.error.status).toBe(0);
      }
    });

    test("should prevent concurrent refresh requests", async () => {
      const refreshToken = "valid-refresh-token";

      vi.mocked(AuthStorage.getRefreshToken).mockReturnValue(refreshToken);
      vi.mocked(fetch).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () =>
                    Promise.resolve({
                      access_token: "new-token",
                      refresh_token: "new-refresh",
                    }),
                } as Response),
              100
            )
          )
      );

      // Start two refresh operations simultaneously
      const promise1 = tokenManager.refreshTokens();
      const promise2 = tokenManager.refreshTokens();

      // Advance timers to complete the requests
      vi.advanceTimersByTime(100);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      // Both should succeed with the same result
      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      // Fetch should only be called once due to deduplication
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    test("should enforce rate limiting", async () => {
      vi.mocked(AuthStorage.getRefreshToken).mockReturnValue("refresh-token");
      vi.mocked(AuthStorage.setAuthTokens).mockReturnValue(true);

      // Mock successful response for first refresh
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: "new-token",
            refresh_token: "new-refresh",
          }),
      } as Response);

      // First refresh
      await tokenManager.refreshTokens();

      // Second refresh immediately after (should be rate limited)
      vi.advanceTimersByTime(1000); // Less than MIN_REFRESH_INTERVAL (5000ms)

      const result = await tokenManager.refreshTokens();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Refresh rate limited");
        expect(result.error.status).toBe(429);
      }
    });

    test("should return error when no refresh token available", async () => {
      vi.mocked(AuthStorage.getRefreshToken).mockReturnValue(null);

      const result = await tokenManager.refreshTokens();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("No refresh token available");
        expect(result.error.status).toBe(401);
      }
    });
  });

  describe("clearTokens", () => {
    test("should clear all token data", () => {
      vi.mocked(AuthStorage.clearAuthData).mockReturnValue(true);

      tokenManager.clearTokens();

      expect(AuthStorage.clearAuthData).toHaveBeenCalledOnce();
    });
  });

  describe("hasTokens", () => {
    test("should return true when both tokens exist", () => {
      vi.mocked(AuthStorage.getAuthTokens).mockReturnValue({
        accessToken: "access-token",
        refreshToken: "refresh-token",
      });

      const result = tokenManager.hasTokens();

      expect(result).toBe(true);
    });

    test("should return false when tokens are missing", () => {
      vi.mocked(AuthStorage.getAuthTokens).mockReturnValue({
        accessToken: null,
        refreshToken: "refresh-token",
      });

      const result = tokenManager.hasTokens();

      expect(result).toBe(false);
    });
  });

  describe("getTokenStatus", () => {
    test("should return token status", () => {
      vi.mocked(AuthStorage.getAuthTokens).mockReturnValue({
        accessToken: "access-token",
        refreshToken: null,
      });

      const status = tokenManager.getTokenStatus();

      expect(status).toEqual({
        hasAccessToken: true,
        hasRefreshToken: false,
        refreshInProgress: false,
      });
    });
  });

  describe("handleAPIError", () => {
    test("should handle 401 errors by clearing tokens", () => {
      vi.mocked(AuthStorage.clearAuthData).mockReturnValue(true);

      const handled = tokenManager.handleAPIError(401, "Unauthorized");

      expect(handled).toBe(true);
      expect(AuthStorage.clearAuthData).toHaveBeenCalledOnce();
      expect(mockEventDispatcher.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: "authLogout" })
      );
    });

    test("should not handle non-401 errors", () => {
      const handled = tokenManager.handleAPIError(500, "Server Error");

      expect(handled).toBe(false);
      expect(AuthStorage.clearAuthData).not.toHaveBeenCalled();
    });
  });

  describe("token validation", () => {
    test("should detect when no tokens are available", () => {
      vi.mocked(AuthStorage.getAuthTokens).mockReturnValue({
        accessToken: null,
        refreshToken: null,
      });

      expect(tokenManager.hasTokens()).toBe(false);
    });

    test("should detect when tokens are available", () => {
      vi.mocked(AuthStorage.getAuthTokens).mockReturnValue({
        accessToken: "valid-access-token",
        refreshToken: "valid-refresh-token",
      });

      expect(tokenManager.hasTokens()).toBe(true);
    });
  });

  describe("JWT token expiration validation", () => {
    // Helper function to create JWT tokens for testing
    const createJWTToken = (payload: Record<string, unknown>) => {
      const header = { alg: "HS256", typ: "JWT" };
      const encodedHeader = btoa(JSON.stringify(header));
      const encodedPayload = btoa(JSON.stringify(payload));
      const signature = "mock-signature";
      return `${encodedHeader}.${encodedPayload}.${signature}`;
    };

    // Helper to call private isTokenExpired method
    const isTokenExpired = (token: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (tokenManager as any).isTokenExpired(token);
    };

    test("should return true for null or empty tokens", () => {
      expect(isTokenExpired("")).toBe(true);
      expect(isTokenExpired("   ")).toBe(true);
      expect(isTokenExpired("abc")).toBe(true); // too short
    });

    test("should return true for malformed JWT tokens", () => {
      expect(isTokenExpired("not.a.valid.jwt.token")).toBe(true);
      expect(isTokenExpired("onlyonepart")).toBe(true);
      expect(isTokenExpired("two.parts")).toBe(true);
      expect(isTokenExpired("invalid.jwt.format")).toBe(true);
    });

    test("should return true for JWT with invalid base64 payload", () => {
      const token = "header.invalid-base64!@#.signature";
      expect(isTokenExpired(token)).toBe(true);
    });

    test("should return false for valid unexpired JWT token", () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const payload = {
        sub: "user123",
        exp: futureTime,
        iat: Math.floor(Date.now() / 1000),
      };
      const token = createJWTToken(payload);

      expect(isTokenExpired(token)).toBe(false);
    });

    test("should return true for expired JWT token", () => {
      const pastTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const payload = {
        sub: "user123",
        exp: pastTime,
        iat: Math.floor(Date.now() / 1000) - 7200,
      };
      const token = createJWTToken(payload);

      expect(isTokenExpired(token)).toBe(true);
    });

    test("should return true for JWT token with future nbf (not before) claim", () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const payload = {
        sub: "user123",
        exp: Math.floor(Date.now() / 1000) + 7200, // 2 hours from now
        nbf: futureTime, // not valid until 1 hour from now
        iat: Math.floor(Date.now() / 1000),
      };
      const token = createJWTToken(payload);

      expect(isTokenExpired(token)).toBe(true);
    });

    test("should return false for JWT token with valid nbf claim", () => {
      const pastTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const payload = {
        sub: "user123",
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        nbf: pastTime, // valid since 1 hour ago
        iat: Math.floor(Date.now() / 1000) - 3600,
      };
      const token = createJWTToken(payload);

      expect(isTokenExpired(token)).toBe(false);
    });

    test("should return false for JWT token without exp claim", () => {
      const payload = {
        sub: "user123",
        iat: Math.floor(Date.now() / 1000),
      };
      const token = createJWTToken(payload);

      expect(isTokenExpired(token)).toBe(false);
    });

    test("should return false for JWT token without nbf claim", () => {
      const payload = {
        sub: "user123",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      };
      const token = createJWTToken(payload);

      expect(isTokenExpired(token)).toBe(false);
    });

    test("should handle edge case where exp equals current time", () => {
      const currentTime = Math.floor(Date.now() / 1000);
      const payload = {
        sub: "user123",
        exp: currentTime,
        iat: currentTime - 3600,
      };
      const token = createJWTToken(payload);

      expect(isTokenExpired(token)).toBe(true);
    });

    test("should handle edge case where nbf equals current time", () => {
      const currentTime = Math.floor(Date.now() / 1000);
      const payload = {
        sub: "user123",
        exp: currentTime + 3600,
        nbf: currentTime,
        iat: currentTime - 3600,
      };
      const token = createJWTToken(payload);

      expect(isTokenExpired(token)).toBe(false);
    });

    test("should return true for JSON parsing errors without logging", () => {
      // Create a token with invalid JSON in payload
      const invalidToken = "header.bm90LWpzb24=.signature"; // "not-json" in base64

      expect(isTokenExpired(invalidToken)).toBe(true);
    });
  });
});
