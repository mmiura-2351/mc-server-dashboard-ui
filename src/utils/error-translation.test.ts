import { describe, it, expect, vi } from "vitest";
import { translateError } from "./error-translation";
interface TestError {
  message: string;
  status?: number;
}

// Mock the translation function
const mockT = vi.fn((key: string, params?: Record<string, string>) => {
  const translations: Record<string, string> = {
    "errors.unauthorized": "Unauthorized access",
    "errors.forbidden": "Access forbidden",
    "errors.notFound": "Resource not found",
    "errors.conflict": "Resource conflict",
    "errors.serverError": "Server error occurred",
    "errors.network": "Network error",
    "errors.timeout": "Request timeout",
    "errors.validation": "Validation error",
    "errors.generic": "An error occurred",
    "errors.operationFailed": "Failed to {action}",
    "errors.pendingApproval": "Your account is pending approval",
    "errors.invalidCredentials": "Invalid username or password",
    "errors.tooManyAttempts": "Too many login attempts",
    "servers.create.errors.failedToLoadVersions": "Failed to load versions",
    "servers.create.errors.versionLoadTimeout": "Version loading timeout",
  };

  let translation = translations[key] || key;
  if (params) {
    Object.entries(params).forEach(([paramKey, paramValue]) => {
      translation = translation.replace(`{${paramKey}}`, paramValue);
    });
  }
  return translation;
});

describe("translateError", () => {
  it("should translate 401 status code to unauthorized message", () => {
    const error: TestError = {
      status: 401,
      message: "Unauthorized",
    };

    const result = translateError(error, mockT);
    expect(result).toBe("Unauthorized access");
    expect(mockT).toHaveBeenCalledWith("errors.unauthorized");
  });

  it("should translate 401 status code to invalid credentials in auth context", () => {
    const error: TestError = {
      status: 401,
      message: "Unauthorized",
    };

    const result = translateError(error, mockT, { context: "auth" });
    expect(result).toBe("Invalid username or password");
    expect(mockT).toHaveBeenCalledWith("errors.invalidCredentials");
  });

  it("should translate 429 status code to too many attempts message", () => {
    const error: TestError = {
      status: 429,
      message: "Too Many Requests",
    };

    const result = translateError(error, mockT);
    expect(result).toBe("Too many login attempts");
    expect(mockT).toHaveBeenCalledWith("errors.tooManyAttempts");
  });

  it("should translate 403 status code to forbidden message", () => {
    const error: TestError = {
      status: 403,
      message: "Forbidden",
    };

    const result = translateError(error, mockT);
    expect(result).toBe("Access forbidden");
    expect(mockT).toHaveBeenCalledWith("errors.forbidden");
  });

  it("should translate 404 status code to not found message", () => {
    const error: TestError = {
      status: 404,
      message: "Not found",
    };

    const result = translateError(error, mockT);
    expect(result).toBe("Resource not found");
    expect(mockT).toHaveBeenCalledWith("errors.notFound");
  });

  it("should translate 409 status code to conflict message", () => {
    const error: TestError = {
      status: 409,
      message: "Conflict",
    };

    const result = translateError(error, mockT);
    expect(result).toBe("Resource conflict");
    expect(mockT).toHaveBeenCalledWith("errors.conflict");
  });

  it("should translate 408 or timeout message to timeout error", () => {
    const timeoutError1: TestError = {
      status: 408,
      message: "Request timeout",
    };

    const result1 = translateError(timeoutError1, mockT);
    expect(result1).toBe("Request timeout");
    expect(mockT).toHaveBeenCalledWith("errors.timeout");

    mockT.mockClear();

    const timeoutError2: TestError = {
      status: 500,
      message: "Operation timeout exceeded",
    };

    const result2 = translateError(timeoutError2, mockT);
    expect(result2).toBe("Request timeout");
    expect(mockT).toHaveBeenCalledWith("errors.timeout");
  });

  it("should translate 500 status code to server error message", () => {
    const error: TestError = {
      status: 500,
      message: "Internal server error",
    };

    const result = translateError(error, mockT);
    expect(result).toBe("Server error occurred");
    expect(mockT).toHaveBeenCalledWith("errors.serverError");
  });

  it("should translate network errors", () => {
    const error: TestError = {
      status: 0,
      message: "Network error",
    };

    const result = translateError(error, mockT);
    expect(result).toBe("Network error");
    expect(mockT).toHaveBeenCalledWith("errors.network");
  });

  it("should handle pending approval message", () => {
    const error: TestError = {
      status: 403,
      message: "User account is pending approval",
    };

    const result = translateError(error, mockT);
    expect(result).toBe("Your account is pending approval");
    expect(mockT).toHaveBeenCalledWith("errors.pendingApproval");
  });

  it("should handle version loading specific errors", () => {
    const error: TestError = {
      status: 500,
      message: "Failed to fetch supported versions",
    };

    const result = translateError(error, mockT, { context: "version-loading" });
    expect(result).toBe("Failed to load versions");
    expect(mockT).toHaveBeenCalledWith(
      "servers.create.errors.failedToLoadVersions"
    );
  });

  it("should handle validation errors", () => {
    const error: TestError = {
      status: 422,
      message: "Validation failed",
    };

    const result = translateError(error, mockT);
    expect(result).toBe("Validation error");
    expect(mockT).toHaveBeenCalledWith("errors.validation");
  });

  it("should handle operation failed with action parameter", () => {
    const error: TestError = {
      status: 500,
      message: "Operation failed",
    };

    const result = translateError(error, mockT, { action: "start server" });
    expect(result).toBe("Failed to start server");
    expect(mockT).toHaveBeenCalledWith("errors.operationFailed", {
      action: "start server",
    });
  });

  it("should use generic error for unknown errors", () => {
    const error: TestError = {
      status: 418, // I'm a teapot
      message: "Unknown error",
    };

    const result = translateError(error, mockT);
    expect(result).toBe("An error occurred");
    expect(mockT).toHaveBeenCalledWith("errors.generic");
  });

  it("should handle error without status code", () => {
    const error: TestError = {
      message: "Something went wrong",
    };

    const result = translateError(error, mockT);
    expect(result).toBe("An error occurred");
    expect(mockT).toHaveBeenCalledWith("errors.generic");
  });

  it("should handle string errors", () => {
    const error = "Simple error message";

    const result = translateError(error, mockT);
    expect(result).toBe("An error occurred");
    expect(mockT).toHaveBeenCalledWith("errors.generic");
  });

  it("should prioritize specific message patterns over status codes", () => {
    const error: TestError = {
      status: 500,
      message: "pending approval from administrator",
    };

    const result = translateError(error, mockT);
    expect(result).toBe("Your account is pending approval");
    expect(mockT).toHaveBeenCalledWith("errors.pendingApproval");
  });
});
