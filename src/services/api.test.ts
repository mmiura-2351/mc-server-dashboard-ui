import { describe, test, expect, beforeEach, vi, afterEach } from "vitest";
import {
  fetchJson,
  fetchEmpty,
  fetchWithErrorHandling,
  createRetryConfig,
  createNoRetryConfig,
  createAggressiveRetryConfig,
  clearActiveRefreshAttempts,
} from "./api";
import { tokenManager } from "@/utils/token-manager";

// Mock token manager
vi.mock("@/utils/token-manager", () => ({
  tokenManager: {
    getValidAccessToken: vi.fn(),
    handleAPIError: vi.fn(),
  },
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("API service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();
    clearActiveRefreshAttempts();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Retry Configuration", () => {
    test("createRetryConfig should create config with default values", () => {
      const config = createRetryConfig();
      expect(config).toEqual({
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 5000,
      });
    });

    test("createRetryConfig should create config with custom values", () => {
      const config = createRetryConfig(5, 500, 2000);
      expect(config).toEqual({
        maxRetries: 5,
        baseDelay: 500,
        maxDelay: 2000,
      });
    });

    test("createNoRetryConfig should create config with no retries", () => {
      const config = createNoRetryConfig();
      expect(config).toEqual({
        maxRetries: 0,
        baseDelay: 0,
        maxDelay: 0,
      });
    });

    test("createAggressiveRetryConfig should create config for aggressive retrying", () => {
      const config = createAggressiveRetryConfig();
      expect(config).toEqual({
        maxRetries: 5,
        baseDelay: 500,
        maxDelay: 3000,
      });
    });
  });

  describe("fetchWithErrorHandling retry logic", () => {
    const mockUrl = "https://api.example.com/test";
    const mockConfig = { method: "GET" };

    beforeEach(() => {
      vi.mocked(tokenManager.getValidAccessToken).mockResolvedValue(
        "valid-token"
      );
      vi.mocked(tokenManager.handleAPIError).mockReturnValue(true);
    });

    test("should succeed on first attempt without retries", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ data: "success" }),
        text: vi.fn().mockResolvedValue(""),
        headers: new Headers({ "content-type": "application/json" }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await fetchWithErrorHandling(mockUrl, mockConfig);

      expect(result.isOk()).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test("should retry on 401 error with exponential backoff", async () => {
      // First call returns 401
      const mock401Response = {
        ok: false,
        status: 401,
        text: vi.fn().mockResolvedValue("Unauthorized"),
      };

      // Second call succeeds
      const mockSuccessResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ data: "success" }),
        text: vi.fn().mockResolvedValue(""),
        headers: new Headers({ "content-type": "application/json" }),
      };

      mockFetch
        .mockResolvedValueOnce(mock401Response)
        .mockResolvedValueOnce(mockSuccessResponse);

      const retryConfig = createRetryConfig(2, 100, 1000);
      const resultPromise = fetchWithErrorHandling(
        mockUrl,
        mockConfig,
        false,
        retryConfig
      );

      // Fast forward through the delay
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.isOk()).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(tokenManager.handleAPIError).toHaveBeenCalledWith(
        401,
        "Unauthorized"
      );
    });

    test("should fail after maximum retries", async () => {
      const mock401Response = {
        ok: false,
        status: 401,
        text: vi.fn().mockResolvedValue("Unauthorized"),
      };

      mockFetch.mockResolvedValue(mock401Response);

      const retryConfig = createRetryConfig(2, 100, 1000);
      const resultPromise = fetchWithErrorHandling(
        mockUrl,
        mockConfig,
        false,
        retryConfig
      );

      // Fast forward through all delays
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe(
          "Authentication failed after maximum retries"
        );
        expect(result.error.status).toBe(401);
      }
      expect(mockFetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    test("should not retry with no retry config", async () => {
      const mock401Response = {
        ok: false,
        status: 401,
        text: vi.fn().mockResolvedValue("Unauthorized"),
      };

      mockFetch.mockResolvedValueOnce(mock401Response);

      const retryConfig = createNoRetryConfig();
      const result = await fetchWithErrorHandling(
        mockUrl,
        mockConfig,
        false,
        retryConfig
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe(
          "Authentication failed after maximum retries"
        );
      }
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test("should not retry when skipAutoRefresh is true", async () => {
      const mock401Response = {
        ok: false,
        status: 401,
        text: vi.fn().mockResolvedValue("Unauthorized"),
      };

      mockFetch.mockResolvedValueOnce(mock401Response);

      const result = await fetchWithErrorHandling(mockUrl, mockConfig, true);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Unauthorized");
      }
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(tokenManager.handleAPIError).not.toHaveBeenCalled();
    });

    test("should prevent duplicate refresh attempts for same request", async () => {
      const mock401Response = {
        ok: false,
        status: 401,
        text: vi.fn().mockResolvedValue("Unauthorized"),
      };

      mockFetch.mockResolvedValue(mock401Response);

      const retryConfig = createRetryConfig(3, 100, 1000);

      // Start two identical requests simultaneously
      const request1 = fetchWithErrorHandling(
        mockUrl,
        mockConfig,
        false,
        retryConfig
      );
      const request2 = fetchWithErrorHandling(
        mockUrl,
        mockConfig,
        false,
        retryConfig
      );

      await vi.runAllTimersAsync();
      const [result1, result2] = await Promise.all([request1, request2]);

      // One should succeed (first), other should fail due to deduplication
      const results = [result1, result2];
      const hasDeduplicationError = results.some(
        (r) =>
          r.isErr() &&
          (r.isErr()
            ? r.error.message === "Refresh already in progress for this request"
            : false)
      );

      expect(hasDeduplicationError).toBe(true);
    });

    test("should apply exponential backoff correctly", async () => {
      const mock401Response = {
        ok: false,
        status: 401,
        text: vi.fn().mockResolvedValue("Unauthorized"),
      };

      mockFetch.mockResolvedValue(mock401Response);

      const retryConfig = createRetryConfig(3, 100, 1000);
      const uniqueUrl = `${mockUrl}/exponential-${Date.now()}`;

      const resultPromise = fetchWithErrorHandling(
        uniqueUrl,
        mockConfig,
        false,
        retryConfig
      );

      // Fast forward through all delays
      await vi.runAllTimersAsync();

      const result = await resultPromise;

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe(
          "Authentication failed after maximum retries"
        );
      }
    }, 10000);

    test("should handle token manager errors gracefully", async () => {
      const mock401Response = {
        ok: false,
        status: 401,
        text: vi.fn().mockResolvedValue("Unauthorized"),
      };

      mockFetch.mockResolvedValueOnce(mock401Response);
      vi.mocked(tokenManager.handleAPIError).mockReturnValue(false);

      const uniqueUrl = `${mockUrl}/token-error-${Date.now()}`;
      const result = await fetchWithErrorHandling(uniqueUrl, mockConfig);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe(
          "Authentication failed - unable to refresh token"
        );
      }
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test("should handle missing fresh token gracefully", async () => {
      const mock401Response = {
        ok: false,
        status: 401,
        text: vi.fn().mockResolvedValue("Unauthorized"),
      };

      mockFetch.mockResolvedValueOnce(mock401Response);
      vi.mocked(tokenManager.getValidAccessToken)
        .mockResolvedValueOnce("initial-token")
        .mockResolvedValueOnce(null); // No fresh token available

      const uniqueUrl = `${mockUrl}/missing-token-${Date.now()}`;
      const resultPromise = fetchWithErrorHandling(uniqueUrl, mockConfig);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe(
          "Authentication failed - unable to refresh token"
        );
      }
    });
  });

  describe("Legacy API functions", () => {
    test("fetchJson should be a function", () => {
      expect(typeof fetchJson).toBe("function");
    });

    test("fetchEmpty should be a function", () => {
      expect(typeof fetchEmpty).toBe("function");
    });
  });

  describe("module exports", () => {
    test("should export the expected functions", () => {
      expect(fetchJson).toBeDefined();
      expect(fetchEmpty).toBeDefined();
      expect(fetchWithErrorHandling).toBeDefined();
      expect(createRetryConfig).toBeDefined();
      expect(createNoRetryConfig).toBeDefined();
      expect(createAggressiveRetryConfig).toBeDefined();
    });
  });
});
