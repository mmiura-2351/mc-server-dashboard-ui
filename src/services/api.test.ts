import { describe, test, expect, beforeEach, vi, afterEach } from "vitest";
import { fetchWithErrorHandling } from "./api";

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
Object.defineProperty(window, "localStorage", {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
  writable: true,
});

// Mock window.dispatchEvent
Object.defineProperty(window, "dispatchEvent", {
  value: vi.fn(),
  writable: true,
});

describe("API service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    // Clear any pending refresh promises
    vi.clearAllTimers();
  });

  describe("fetchWithErrorHandling", () => {
    test("should make request with auth token", async () => {
      const mockResponse = { data: "test" };
      
      vi.mocked(localStorage.getItem).mockReturnValue("test-token");
      
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await fetchWithErrorHandling("/test");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(mockResponse);
      }

      // Check that fetch was called
      expect(fetch).toHaveBeenCalledTimes(1);
      const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call[0]).toBe("/test");
      
      // Check Authorization header in Headers object
      const headers = call[1].headers as Headers;
      expect(headers.get("Authorization")).toBe("Bearer test-token");
    });

    test("should automatically refresh token on 401 error", async () => {
      const mockTokens = {
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
        token_type: "bearer",
      };

      const mockSuccessResponse = { data: "success" };

      vi.mocked(localStorage.getItem).mockImplementation((key) => {
        if (key === "access_token") return "expired-token";
        if (key === "refresh_token") return "valid-refresh-token";
        return null;
      });

      // First call fails with 401
      (fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: async () => JSON.stringify({ detail: "Token expired" }),
        })
        // Refresh token call succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokens,
        })
        // Retry with new token succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSuccessResponse,
        });

      const result = await fetchWithErrorHandling("http://localhost:8000/test");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(mockSuccessResponse);
      }

      // Should update localStorage with new tokens
      expect(localStorage.setItem).toHaveBeenCalledWith(
        "access_token",
        "new-access-token"
      );
      expect(localStorage.setItem).toHaveBeenCalledWith(
        "refresh_token",
        "new-refresh-token"
      );

      // Should dispatch tokenRefresh event
      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "tokenRefresh",
          detail: {
            access_token: "new-access-token",
            refresh_token: "new-refresh-token",
          },
        })
      );
    });

    test("should handle refresh token failure by clearing tokens and dispatching logout", async () => {
      vi.mocked(localStorage.getItem).mockImplementation((key) => {
        if (key === "access_token") return "expired-token";
        if (key === "refresh_token") return "invalid-refresh-token";
        return null;
      });

      // First call fails with 401
      (fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: async () => JSON.stringify({ detail: "Token expired" }),
        })
        // Refresh token call fails
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: async () => JSON.stringify({ detail: "Invalid refresh token" }),
        });

      const result = await fetchWithErrorHandling("http://localhost:8000/test");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Token expired");
      }

      // Should clear localStorage
      expect(localStorage.removeItem).toHaveBeenCalledWith("access_token");
      expect(localStorage.removeItem).toHaveBeenCalledWith("refresh_token");
      expect(localStorage.removeItem).toHaveBeenCalledWith("user_data");

      // Should dispatch authLogout event
      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "authLogout",
        })
      );
    });

    test("should prevent multiple simultaneous refresh attempts", async () => {
      const mockTokens = {
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
        token_type: "bearer",
      };

      // Setup localStorage mocks to return values sequentially
      vi.mocked(localStorage.getItem).mockImplementation((key) => {
        if (key === "access_token") return "expired-token";
        if (key === "refresh_token") return "valid-refresh-token";
        return null;
      });

      // Setup fetch responses in order:
      // 1. First API call fails (401)
      // 2. Second API call fails (401) 
      // 3. Refresh token call succeeds
      // 4. Retry first call succeeds
      // 5. Retry second call succeeds
      (fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: async () => JSON.stringify({ detail: "Token expired" }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: async () => JSON.stringify({ detail: "Token expired" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokens,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: "success1" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: "success2" }),
        });

      // Make two simultaneous requests
      const promise1 = fetchWithErrorHandling("http://localhost:8000/test1");
      const promise2 = fetchWithErrorHandling("http://localhost:8000/test2");

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      // Should only call refresh endpoint once
      const refreshCalls = (fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
        (call) => call[0].includes("/auth/refresh")
      );
      expect(refreshCalls).toHaveLength(1);
    });

    test("should skip auto-refresh when skipAutoRefresh is true", async () => {
      vi.mocked(localStorage.getItem).mockReturnValue("expired-token");

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ detail: "Token expired" }),
      });

      const result = await fetchWithErrorHandling("http://localhost:8000/test", {}, true);

      expect(result.isErr()).toBe(true);

      // Should not attempt refresh
      const refreshCalls = (fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
        (call) => call[0].includes("/auth/refresh")
      );
      expect(refreshCalls).toHaveLength(0);
    });
  });
});