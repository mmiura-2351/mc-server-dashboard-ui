/**
 * Secure localStorage utility with error handling and validation
 * Provides safe methods for storing and retrieving data from localStorage
 */
export class SecureStorage {
  /**
   * Safely get an item from localStorage with error handling
   */
  static getItem(key: string): string | null {
    try {
      if (typeof window === "undefined") return null;
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  /**
   * Safely set an item in localStorage with error handling
   */
  static setItem(key: string, value: string): boolean {
    try {
      if (typeof window === "undefined") return false;
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Safely remove an item from localStorage with error handling
   */
  static removeItem(key: string): boolean {
    try {
      if (typeof window === "undefined") return false;
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Safely clear all localStorage with error handling
   */
  static clear(): boolean {
    try {
      if (typeof window === "undefined") return false;
      localStorage.clear();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get and parse JSON from localStorage with validation
   */
  static getJSON<T>(
    key: string,
    validator?: (value: unknown) => value is T
  ): T | null {
    try {
      const item = this.getItem(key);
      if (!item) return null;

      const parsed = JSON.parse(item);

      // If validator provided, use it to validate the parsed data
      if (validator && !validator(parsed)) {
        this.removeItem(key); // Remove invalid data
        return null;
      }

      return parsed as T;
    } catch {
      this.removeItem(key); // Remove corrupted data
      return null;
    }
  }

  /**
   * Set JSON data in localStorage with serialization error handling
   */
  static setJSON<T>(key: string, value: T): boolean {
    try {
      const serialized = JSON.stringify(value);
      return this.setItem(key, serialized);
    } catch {
      return false;
    }
  }

  /**
   * Check if localStorage is available and working
   */
  static isAvailable(): boolean {
    try {
      if (typeof window === "undefined") return false;

      const testKey = "__test_localStorage__";
      localStorage.setItem(testKey, "test");
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get multiple items at once with error handling
   */
  static getMultiple(keys: string[]): Record<string, string | null> {
    const result: Record<string, string | null> = {};
    keys.forEach((key) => {
      result[key] = this.getItem(key);
    });
    return result;
  }

  /**
   * Remove multiple items at once with error handling
   */
  static removeMultiple(keys: string[]): boolean {
    let success = true;
    keys.forEach((key) => {
      if (!this.removeItem(key)) {
        success = false;
      }
    });
    return success;
  }
}

/**
 * Type validators for common data types
 */
export const validators = {
  user: (
    value: unknown
  ): value is {
    id: number;
    username: string;
    email: string;
    role: string;
    is_approved: boolean;
  } => {
    if (typeof value !== "object" || value === null) return false;

    const obj = value as Record<string, unknown>;
    return (
      "id" in obj &&
      "username" in obj &&
      "email" in obj &&
      "role" in obj &&
      "is_approved" in obj &&
      typeof obj.id === "number" &&
      typeof obj.username === "string" &&
      typeof obj.email === "string" &&
      typeof obj.role === "string" &&
      typeof obj.is_approved === "boolean"
    );
  },

  token: (value: unknown): value is string => {
    return typeof value === "string" && value.length > 0;
  },
};

/**
 * Specific methods for auth-related storage
 */
export class AuthStorage {
  private static readonly ACCESS_TOKEN_KEY = "access_token";
  private static readonly REFRESH_TOKEN_KEY = "refresh_token";
  private static readonly USER_DATA_KEY = "user_data";

  static getAccessToken(): string | null {
    const token = SecureStorage.getItem(this.ACCESS_TOKEN_KEY);
    return token && validators.token(token) ? token : null;
  }

  static setAccessToken(token: string): boolean {
    if (!validators.token(token)) {
      return false;
    }
    return SecureStorage.setItem(this.ACCESS_TOKEN_KEY, token);
  }

  static getRefreshToken(): string | null {
    const token = SecureStorage.getItem(this.REFRESH_TOKEN_KEY);
    return token && validators.token(token) ? token : null;
  }

  static setRefreshToken(token: string): boolean {
    if (!validators.token(token)) {
      return false;
    }
    return SecureStorage.setItem(this.REFRESH_TOKEN_KEY, token);
  }

  static getUserData(): unknown | null {
    return SecureStorage.getJSON(this.USER_DATA_KEY, validators.user);
  }

  static setUserData(user: unknown): boolean {
    if (!validators.user(user)) {
      return false;
    }
    return SecureStorage.setJSON(this.USER_DATA_KEY, user);
  }

  static clearAuthData(): boolean {
    return SecureStorage.removeMultiple([
      this.ACCESS_TOKEN_KEY,
      this.REFRESH_TOKEN_KEY,
      this.USER_DATA_KEY,
    ]);
  }

  static getAuthTokens(): {
    accessToken: string | null;
    refreshToken: string | null;
  } {
    return {
      accessToken: this.getAccessToken(),
      refreshToken: this.getRefreshToken(),
    };
  }

  static setAuthTokens(accessToken: string, refreshToken: string): boolean {
    const accessSuccess = this.setAccessToken(accessToken);
    const refreshSuccess = this.setRefreshToken(refreshToken);
    return accessSuccess && refreshSuccess;
  }
}
