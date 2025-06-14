import { describe, test, expect, beforeEach, vi } from "vitest";
import { SecureStorage, AuthStorage, validators } from "../secure-storage";

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
  writable: true,
});

describe("SecureStorage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getItem", () => {
    test("should return item from localStorage", () => {
      mockLocalStorage.getItem.mockReturnValue("test-value");

      const result = SecureStorage.getItem("test-key");

      expect(result).toBe("test-value");
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith("test-key");
    });

    test("should return null when localStorage throws error", () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error("localStorage error");
      });

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const result = SecureStorage.getItem("test-key");

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to get item from localStorage: test-key",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    test("should return null in SSR environment", () => {
      const originalWindow = globalThis.window;
      // @ts-expect-error - Intentionally deleting window for SSR test
      delete globalThis.window;

      const result = SecureStorage.getItem("test-key");

      expect(result).toBeNull();

      globalThis.window = originalWindow;
    });
  });

  describe("setItem", () => {
    test("should set item in localStorage and return true", () => {
      mockLocalStorage.setItem.mockImplementation(() => {});

      const result = SecureStorage.setItem("test-key", "test-value");

      expect(result).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        "test-key",
        "test-value"
      );
    });

    test("should return false when localStorage throws error", () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error("localStorage error");
      });

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const result = SecureStorage.setItem("test-key", "test-value");

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to set item in localStorage: test-key",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe("getJSON", () => {
    test("should parse and return valid JSON", () => {
      const testData = { name: "test", value: 123 };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(testData));

      const result = SecureStorage.getJSON("test-key");

      expect(result).toEqual(testData);
    });

    test("should return null and remove corrupted data", () => {
      mockLocalStorage.getItem.mockReturnValue("invalid-json");
      mockLocalStorage.removeItem.mockImplementation(() => {});

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const result = SecureStorage.getJSON("test-key");

      expect(result).toBeNull();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("test-key");

      consoleSpy.mockRestore();
    });

    test("should validate data with provided validator", () => {
      const testData = { name: "test", value: 123 };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(testData));

      const validator = (value: unknown): value is typeof testData => {
        return typeof value === "object" && value !== null && "name" in value;
      };

      const result = SecureStorage.getJSON("test-key", validator);

      expect(result).toEqual(testData);
    });

    test("should return null and remove data that fails validation", () => {
      const testData = { invalid: "data" };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(testData));
      mockLocalStorage.removeItem.mockImplementation(() => {});

      const validator = (value: unknown): value is { name: string } => {
        return typeof value === "object" && value !== null && "name" in value;
      };

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const result = SecureStorage.getJSON("test-key", validator);

      expect(result).toBeNull();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("test-key");
      expect(consoleSpy).toHaveBeenCalledWith(
        "Invalid data format for key: test-key"
      );

      consoleSpy.mockRestore();
    });
  });

  describe("isAvailable", () => {
    test("should return true when localStorage is available", () => {
      mockLocalStorage.setItem.mockImplementation(() => {});
      mockLocalStorage.removeItem.mockImplementation(() => {});

      const result = SecureStorage.isAvailable();

      expect(result).toBe(true);
    });

    test("should return false when localStorage throws error", () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error("localStorage error");
      });

      const result = SecureStorage.isAvailable();

      expect(result).toBe(false);
    });
  });
});

describe("validators", () => {
  describe("user validator", () => {
    test("should validate correct user object", () => {
      const validUser = {
        id: 1,
        username: "testuser",
        email: "test@example.com",
        role: "user",
        is_approved: true,
      };

      expect(validators.user(validUser)).toBe(true);
    });

    test("should reject invalid user object", () => {
      const invalidUser = {
        id: "not-a-number",
        username: "testuser",
        email: "test@example.com",
      };

      expect(validators.user(invalidUser)).toBe(false);
    });

    test("should reject null or undefined", () => {
      expect(validators.user(null)).toBe(false);
      expect(validators.user(undefined)).toBe(false);
    });
  });

  describe("token validator", () => {
    test("should validate non-empty string", () => {
      expect(validators.token("valid-token")).toBe(true);
    });

    test("should reject empty string", () => {
      expect(validators.token("")).toBe(false);
    });

    test("should reject non-string values", () => {
      expect(validators.token(123)).toBe(false);
      expect(validators.token(null)).toBe(false);
      expect(validators.token(undefined)).toBe(false);
    });
  });
});

describe("AuthStorage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("token management", () => {
    test("should store and retrieve access token", () => {
      const token = "test-access-token";
      mockLocalStorage.setItem.mockImplementation(() => {});
      mockLocalStorage.getItem.mockReturnValue(token);

      const setResult = AuthStorage.setAccessToken(token);
      const getResult = AuthStorage.getAccessToken();

      expect(setResult).toBe(true);
      expect(getResult).toBe(token);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        "access_token",
        token
      );
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith("access_token");
    });

    test("should reject invalid token format", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = AuthStorage.setAccessToken("");

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith("Invalid access token format");

      consoleSpy.mockRestore();
    });
  });

  describe("user data management", () => {
    test("should store and retrieve valid user data", () => {
      const userData = {
        id: 1,
        username: "testuser",
        email: "test@example.com",
        role: "user",
        is_approved: true,
      };

      mockLocalStorage.setItem.mockImplementation(() => {});
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(userData));

      const setResult = AuthStorage.setUserData(userData);
      const getResult = AuthStorage.getUserData();

      expect(setResult).toBe(true);
      expect(getResult).toEqual(userData);
    });

    test("should reject invalid user data format", () => {
      const invalidUserData = { invalid: "data" };
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = AuthStorage.setUserData(invalidUserData as unknown);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith("Invalid user data format");

      consoleSpy.mockRestore();
    });
  });

  describe("clearAuthData", () => {
    test("should clear all auth-related data", () => {
      mockLocalStorage.removeItem.mockImplementation(() => {});

      const result = AuthStorage.clearAuthData();

      expect(result).toBe(true);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledTimes(3);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("access_token");
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("refresh_token");
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("user_data");
    });
  });

  describe("setAuthTokens", () => {
    test("should set both tokens successfully", () => {
      mockLocalStorage.setItem.mockImplementation(() => {});

      const result = AuthStorage.setAuthTokens("access-token", "refresh-token");

      expect(result).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        "access_token",
        "access-token"
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        "refresh_token",
        "refresh-token"
      );
    });

    test("should return false if either token is invalid", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = AuthStorage.setAuthTokens("", "valid-refresh-token");

      expect(result).toBe(false);

      consoleSpy.mockRestore();
    });
  });
});
