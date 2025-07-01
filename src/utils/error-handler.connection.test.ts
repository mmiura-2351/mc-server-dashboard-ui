/**
 * Tests for ConnectionError handling in ErrorHandler
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ErrorHandler } from "./error-handler";

describe("ErrorHandler - Connection Error Handling", () => {
  beforeEach(() => {
    ErrorHandler.clearErrorLog();
  });

  describe("createConnectionError", () => {
    it("should create a connection error with required fields", () => {
      const error = ErrorHandler.createConnectionError(
        "Backend connection failed",
        "health_check",
        "failed"
      );

      expect(error.code).toBe("CONNECTION_ERROR");
      expect(error.message).toBe("Backend connection failed");
      expect(error.connectionStatus).toBe("failed");
      expect(error.context.operation).toBe("health_check");
      expect(error.retryable).toBe(true);
      expect(error.retryCount).toBe(0);
      expect(error.suggestions).toContain("Backend server may be down");
    });

    it("should create a connection error with all optional fields", () => {
      const lastConnection = new Date();
      const error = ErrorHandler.createConnectionError(
        "Connection timeout",
        "api_request",
        "timeout",
        {
          endpoint: "/api/v1/health",
          retryCount: 2,
          maxRetries: 5,
          lastSuccessfulConnection: lastConnection,
          downtime: 30000,
          suggestions: ["Custom suggestion"],
        }
      );

      expect(error.connectionStatus).toBe("timeout");
      expect(error.endpoint).toBe("/api/v1/health");
      expect(error.retryCount).toBe(2);
      expect(error.maxRetries).toBe(5);
      expect(error.lastSuccessfulConnection).toBe(lastConnection);
      expect(error.downtime).toBe(30000);
      expect(error.suggestions).toContain("Custom suggestion");
    });

    it("should generate appropriate suggestions for different connection statuses", () => {
      const checkingError = ErrorHandler.createConnectionError(
        "Checking connection",
        "health_check",
        "checking"
      );
      expect(checkingError.suggestions).toContain(
        "Connection check in progress"
      );

      const failedError = ErrorHandler.createConnectionError(
        "Connection failed",
        "health_check",
        "failed"
      );
      expect(failedError.suggestions).toContain("Backend server may be down");

      const timeoutError = ErrorHandler.createConnectionError(
        "Connection timeout",
        "health_check",
        "timeout"
      );
      expect(timeoutError.suggestions).toContain("Connection timed out");

      const degradedError = ErrorHandler.createConnectionError(
        "Connection degraded",
        "health_check",
        "degraded"
      );
      expect(degradedError.suggestions).toContain("Connection is unstable");
    });
  });

  describe("shouldRetry", () => {
    it("should return true for retryable connection errors within retry limit", () => {
      const error = ErrorHandler.createConnectionError(
        "Connection failed",
        "health_check",
        "failed",
        { retryCount: 1, maxRetries: 3 }
      );

      expect(ErrorHandler.shouldRetry(error)).toBe(true);
    });

    it("should return false for connection errors that exceed retry limit", () => {
      const error = ErrorHandler.createConnectionError(
        "Connection failed",
        "health_check",
        "failed",
        { retryCount: 3, maxRetries: 3 }
      );

      expect(ErrorHandler.shouldRetry(error)).toBe(false);
    });

    it("should return false for non-retryable connection errors", () => {
      const error = ErrorHandler.createConnectionError(
        "Connection failed",
        "health_check",
        "failed",
        { retryable: false }
      );

      expect(ErrorHandler.shouldRetry(error)).toBe(false);
    });
  });

  describe("getRecoveryStrategy", () => {
    it("should provide recovery strategy for connection errors", () => {
      const error = ErrorHandler.createConnectionError(
        "Connection failed",
        "health_check",
        "failed",
        { retryCount: 1, maxRetries: 3 }
      );

      const strategy = ErrorHandler.getRecoveryStrategy(error);

      expect(strategy.canRetry).toBe(true);
      expect(strategy.maxRetries).toBe(3);
      expect(strategy.requiresUserAction).toBe(false);
      expect(strategy.fallbackActions).toContain("Refresh the page");
    });
  });

  describe("getUserFriendlyMessage", () => {
    it("should return user-friendly message with suggestions", () => {
      const error = ErrorHandler.createConnectionError(
        "Backend connection failed",
        "health_check",
        "failed"
      );

      const message = ErrorHandler.getUserFriendlyMessage(error);

      expect(message).toContain("Backend connection failed");
      expect(message).toContain("Suggestions:");
      expect(message).toContain("Backend server may be down");
    });
  });

  describe("logError", () => {
    it("should log connection errors correctly", () => {
      const error = ErrorHandler.createConnectionError(
        "Connection failed",
        "health_check",
        "failed"
      );

      ErrorHandler.logError(error);

      const recentErrors = ErrorHandler.getRecentErrors(1);
      expect(recentErrors).toHaveLength(1);
      expect(recentErrors[0]?.code).toBe("CONNECTION_ERROR");
    });
  });
});
