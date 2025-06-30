/**
 * Tests for the centralized error handler
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ErrorHandler } from "../error-handler";
import { ErrorSeverity } from "@/types/errors";

// Mock console methods
const consoleMock = {
  group: vi.fn(),
  groupEnd: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
};

// Mock global console
Object.assign(console, consoleMock);

describe("ErrorHandler", () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    ErrorHandler.clearErrorLog();

    // Reset configuration
    ErrorHandler.configure({
      enableConsoleLogging: true,
      enableErrorTracking: true,
    });
  });

  describe("Error Creation", () => {
    it("should create auth error with correct structure", () => {
      const error = ErrorHandler.createAuthError(
        "Authentication failed",
        "login",
        {
          status: 401,
          shouldLogout: true,
          retryable: false,
        }
      );

      expect(error).toMatchObject({
        message: "Authentication failed",
        code: "AUTH_ERROR",
        context: {
          operation: "login",
        },
        status: 401,
        shouldLogout: true,
        retryable: false,
      });
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.suggestions).toContain(
        "Please check your credentials and try again"
      );
    });

    it("should create file error with correct structure", () => {
      const error = ErrorHandler.createFileError(
        "File not found",
        "read_file",
        "read",
        {
          filePath: "/path/to/file.txt",
          retryable: false,
          expectedSize: 1024,
          actualSize: 0,
        }
      );

      expect(error).toMatchObject({
        message: "File not found",
        code: "FILE_ERROR",
        operationType: "read",
        filePath: "/path/to/file.txt",
        retryable: false,
        expectedSize: 1024,
        actualSize: 0,
      });
      expect(error.context.data).toMatchObject({
        filePath: "/path/to/file.txt",
      });
    });

    it("should create server error with correct structure", () => {
      const error = ErrorHandler.createServerError(
        "Server failed to start",
        "start_server",
        "start",
        {
          serverId: "server-123",
          serverStatus: "error",
          retryable: true,
        }
      );

      expect(error).toMatchObject({
        message: "Server failed to start",
        code: "SERVER_ERROR",
        operationType: "start",
        serverId: "server-123",
        serverStatus: "error",
        retryable: true,
      });
    });

    it("should create network error with correct structure", () => {
      const error = ErrorHandler.createNetworkError(
        "Connection timeout",
        "api_call",
        {
          status: 408,
          endpoint: "/api/v1/servers",
          method: "GET",
          retryable: true,
          retryCount: 1,
          maxRetries: 3,
        }
      );

      expect(error).toMatchObject({
        message: "Connection timeout",
        code: "NETWORK_ERROR",
        status: 408,
        endpoint: "/api/v1/servers",
        method: "GET",
        retryable: true,
        retryCount: 1,
        maxRetries: 3,
      });
    });

    it("should create validation error", () => {
      const error = ErrorHandler.createValidationError(
        "Invalid input",
        "form_validation",
        {
          field: "username",
          errors: [
            { field: "username", message: "Too short", code: "MIN_LENGTH" },
          ],
        }
      );

      expect(error).toMatchObject({
        message: "Invalid input",
        code: "VALIDATION_ERROR",
        field: "username",
      });
      expect(error.errors).toHaveLength(1);
    });

    it("should create app error", () => {
      const error = ErrorHandler.createAppError(
        "Component crashed",
        "component_render",
        true,
        {
          component: "ServerDashboard",
          fallbackAction: "refresh_page",
        }
      );

      expect(error).toMatchObject({
        message: "Component crashed",
        code: "APP_ERROR",
        component: "ServerDashboard",
        recoverable: true,
        fallbackAction: "refresh_page",
      });
    });
  });

  describe("Error Logging", () => {
    it("should log error to console when enabled", () => {
      const error = ErrorHandler.createAuthError(
        "Test error",
        "test_operation"
      );
      ErrorHandler.logError(error, ErrorSeverity.HIGH);

      expect(consoleMock.group).toHaveBeenCalledWith(
        "🚨 HIGH Error: AUTH_ERROR"
      );
      expect(consoleMock.error).toHaveBeenCalledWith("Message:", "Test error");
      expect(consoleMock.error).toHaveBeenCalledWith(
        "Operation:",
        "test_operation"
      );
      expect(consoleMock.groupEnd).toHaveBeenCalled();
    });

    it("should not log to console when disabled", () => {
      ErrorHandler.configure({ enableConsoleLogging: false });
      const error = ErrorHandler.createAuthError(
        "Test error",
        "test_operation"
      );
      ErrorHandler.logError(error);

      expect(consoleMock.group).not.toHaveBeenCalled();
    });

    it("should track errors when enabled", () => {
      const error = ErrorHandler.createAuthError(
        "Test error",
        "test_operation"
      );
      ErrorHandler.logError(error);

      const recentErrors = ErrorHandler.getRecentErrors(1);
      expect(recentErrors).toHaveLength(1);
      expect(recentErrors[0]).toMatchObject({
        message: "Test error",
        code: "AUTH_ERROR",
        severity: ErrorSeverity.MEDIUM,
      });
    });

    it("should not track errors when disabled", () => {
      ErrorHandler.configure({ enableErrorTracking: false });
      const error = ErrorHandler.createAuthError(
        "Test error",
        "test_operation"
      );
      ErrorHandler.logError(error);

      const recentErrors = ErrorHandler.getRecentErrors();
      expect(recentErrors).toHaveLength(0);
    });
  });

  describe("User-Friendly Messages", () => {
    it("should return message with suggestions", () => {
      const error = ErrorHandler.createAuthError("Login failed", "login", {
        suggestions: ["Check credentials", "Try again"],
      });

      const message = ErrorHandler.getUserFriendlyMessage(error);
      expect(message).toContain("Login failed");
      expect(message).toContain("Suggestions:");
      expect(message).toContain("• Check credentials");
      expect(message).toContain("• Try again");
    });

    it("should return plain message without suggestions", () => {
      const error = ErrorHandler.createAuthError("Login failed", "login", {
        suggestions: [],
      });
      const message = ErrorHandler.getUserFriendlyMessage(error);

      expect(message).toBe("Login failed");
    });
  });

  describe("Retry Logic", () => {
    it("should determine retry for auth errors", () => {
      const retryableError = ErrorHandler.createAuthError("Test", "test", {
        retryable: true,
      });
      const nonRetryableError = ErrorHandler.createAuthError("Test", "test", {
        retryable: false,
      });

      expect(ErrorHandler.shouldRetry(retryableError)).toBe(true);
      expect(ErrorHandler.shouldRetry(nonRetryableError)).toBe(false);
    });

    it("should determine retry for network errors", () => {
      const retryableError = ErrorHandler.createNetworkError("Test", "test", {
        retryable: true,
        retryCount: 1,
        maxRetries: 3,
      });

      const maxedOutError = ErrorHandler.createNetworkError("Test", "test", {
        retryable: true,
        retryCount: 3,
        maxRetries: 3,
      });

      expect(ErrorHandler.shouldRetry(retryableError)).toBe(true);
      expect(ErrorHandler.shouldRetry(maxedOutError)).toBe(false);
    });

    it("should determine retry for file errors", () => {
      const retryableError = ErrorHandler.createFileError(
        "Test",
        "test",
        "read",
        { retryable: true }
      );
      const nonRetryableError = ErrorHandler.createFileError(
        "Test",
        "test",
        "read",
        { retryable: false }
      );

      expect(ErrorHandler.shouldRetry(retryableError)).toBe(true);
      expect(ErrorHandler.shouldRetry(nonRetryableError)).toBe(false);
    });
  });

  describe("Recovery Strategy", () => {
    it("should provide recovery strategy for retryable errors", () => {
      const error = ErrorHandler.createNetworkError("Test", "test", {
        retryable: true,
        maxRetries: 3,
      });

      const strategy = ErrorHandler.getRecoveryStrategy(error);

      expect(strategy).toMatchObject({
        canRetry: true,
        maxRetries: 3,
        requiresUserAction: false,
      });
      expect(strategy.fallbackActions).toContain("Refresh the page");
    });

    it("should provide recovery strategy for validation errors", () => {
      const error = ErrorHandler.createValidationError(
        "Invalid input",
        "validation"
      );
      const strategy = ErrorHandler.getRecoveryStrategy(error);

      expect(strategy).toMatchObject({
        canRetry: false,
        requiresUserAction: true,
      });
    });
  });

  describe("Operation Wrapping", () => {
    it("should wrap successful operation", async () => {
      const operation = vi.fn().mockResolvedValue("success");

      const result = await ErrorHandler.wrapOperation(operation, {
        operationName: "test_operation",
      });

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBe("success");
      expect(operation).toHaveBeenCalled();
    });

    it("should wrap failed operation", async () => {
      const operation = vi
        .fn()
        .mockRejectedValue(new Error("Operation failed"));

      const result = await ErrorHandler.wrapOperation(operation, {
        operationName: "test_operation",
        component: "TestComponent",
      });

      expect(result.isErr()).toBe(true);
      const error = result._unsafeUnwrapErr();
      expect(error.message).toBe("Operation failed");
      expect(error.code).toBe("APP_ERROR");
      expect(error.context.operation).toBe("test_operation");
    });

    it("should call error callback on failure", async () => {
      const operation = vi.fn().mockRejectedValue(new Error("Test error"));
      const onError = vi.fn();

      await ErrorHandler.wrapOperation(operation, {
        operationName: "test_operation",
        onError,
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Test error",
          code: "APP_ERROR",
        })
      );
    });
  });

  describe("Error Result Creation", () => {
    it("should create error result and log error", () => {
      const error = ErrorHandler.createAuthError("Test error", "test");
      const result = ErrorHandler.createErrorResult(error, ErrorSeverity.HIGH);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBe(error);
      expect(consoleMock.group).toHaveBeenCalled();
    });
  });

  describe("Configuration", () => {
    it("should update configuration", () => {
      ErrorHandler.configure({
        enableConsoleLogging: false,
        defaultMaxRetries: 5,
      });

      // Test that configuration was applied
      const error = ErrorHandler.createNetworkError("Test", "test");
      ErrorHandler.logError(error);

      expect(consoleMock.group).not.toHaveBeenCalled();
    });
  });

  describe("Error Log Management", () => {
    it("should maintain error log size", () => {
      // Add multiple errors
      for (let i = 0; i < 15; i++) {
        const error = ErrorHandler.createAuthError(`Error ${i}`, "test");
        ErrorHandler.logError(error);
      }

      const recentErrors = ErrorHandler.getRecentErrors(10);
      expect(recentErrors).toHaveLength(10);

      // Should get the most recent ones
      expect(recentErrors[9]?.message).toBe("Error 14");
    });

    it("should clear error log", () => {
      const error = ErrorHandler.createAuthError("Test", "test");
      ErrorHandler.logError(error);

      expect(ErrorHandler.getRecentErrors()).toHaveLength(1);

      ErrorHandler.clearErrorLog();
      expect(ErrorHandler.getRecentErrors().length).toBe(0);
    });
  });
});
