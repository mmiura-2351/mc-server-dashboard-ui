import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getEnvironmentMode, type Environment } from "../environment";

describe("getEnvironmentMode", () => {
  let originalNEXT_RUNTIME_ENV: string | undefined;
  let originalNODE_ENV: string | undefined;

  beforeEach(() => {
    // Store original environment variables
    originalNEXT_RUNTIME_ENV = process.env.NEXT_RUNTIME_ENV;
    originalNODE_ENV = process.env.NODE_ENV;
  });

  afterEach(() => {
    // Restore original environment variables
    if (originalNEXT_RUNTIME_ENV !== undefined) {
      process.env.NEXT_RUNTIME_ENV = originalNEXT_RUNTIME_ENV;
    } else {
      delete process.env.NEXT_RUNTIME_ENV;
    }

    if (originalNODE_ENV !== undefined) {
      Object.assign(process.env, { NODE_ENV: originalNODE_ENV });
    } else {
      const env = process.env as Record<string, string | undefined>;
      delete env.NODE_ENV;
    }
  });

  describe("NEXT_RUNTIME_ENV priority", () => {
    it("should use NEXT_RUNTIME_ENV when set to development", () => {
      process.env.NEXT_RUNTIME_ENV = "development";
      Object.assign(process.env, { NODE_ENV: "production" });

      const result = getEnvironmentMode();

      expect(result.isDevelopment).toBe(true);
      expect(result.isProduction).toBe(false);
      expect(result.isTest).toBe(false);
    });

    it("should use NEXT_RUNTIME_ENV when set to production", () => {
      process.env.NEXT_RUNTIME_ENV = "production";
      Object.assign(process.env, { NODE_ENV: "development" });

      const result = getEnvironmentMode();

      expect(result.isProduction).toBe(true);
      expect(result.isDevelopment).toBe(false);
      expect(result.isTest).toBe(false);
    });

    it("should use NEXT_RUNTIME_ENV when set to test", () => {
      process.env.NEXT_RUNTIME_ENV = "test";
      Object.assign(process.env, { NODE_ENV: "production" });

      const result = getEnvironmentMode();

      expect(result.isTest).toBe(true);
      expect(result.isProduction).toBe(false);
      expect(result.isDevelopment).toBe(false);
    });
  });

  describe("NODE_ENV fallback", () => {
    it("should fallback to NODE_ENV when NEXT_RUNTIME_ENV is not set", () => {
      delete process.env.NEXT_RUNTIME_ENV;
      Object.assign(process.env, { NODE_ENV: "production" });

      const result = getEnvironmentMode();

      expect(result.isProduction).toBe(true);
      expect(result.isDevelopment).toBe(false);
      expect(result.isTest).toBe(false);
    });

    it("should fallback to NODE_ENV development", () => {
      delete process.env.NEXT_RUNTIME_ENV;
      Object.assign(process.env, { NODE_ENV: "development" });

      const result = getEnvironmentMode();

      expect(result.isDevelopment).toBe(true);
      expect(result.isProduction).toBe(false);
      expect(result.isTest).toBe(false);
    });

    it("should fallback to NODE_ENV test", () => {
      delete process.env.NEXT_RUNTIME_ENV;
      Object.assign(process.env, { NODE_ENV: "test" });

      const result = getEnvironmentMode();

      expect(result.isTest).toBe(true);
      expect(result.isProduction).toBe(false);
      expect(result.isDevelopment).toBe(false);
    });
  });

  describe("Default behavior", () => {
    it("should default to development when both environment variables are undefined", () => {
      delete process.env.NEXT_RUNTIME_ENV;
      const env = process.env as Record<string, string | undefined>;
      delete env.NODE_ENV;

      const result = getEnvironmentMode();

      expect(result.isDevelopment).toBe(true);
      expect(result.isProduction).toBe(false);
      expect(result.isTest).toBe(false);
    });

    it("should default to development when both environment variables are empty strings", () => {
      process.env.NEXT_RUNTIME_ENV = "";
      Object.assign(process.env, { NODE_ENV: "" });

      const result = getEnvironmentMode();

      expect(result.isDevelopment).toBe(true);
      expect(result.isProduction).toBe(false);
      expect(result.isTest).toBe(false);
    });
  });

  describe("Edge cases", () => {
    it("should handle invalid environment values gracefully", () => {
      process.env.NEXT_RUNTIME_ENV = "invalid" as Environment;

      const result = getEnvironmentMode();

      // Should return false for all known environments when value is invalid
      expect(result.isDevelopment).toBe(false);
      expect(result.isProduction).toBe(false);
      expect(result.isTest).toBe(false);
    });

    it("should fallback to NODE_ENV when NEXT_RUNTIME_ENV is an empty string", () => {
      process.env.NEXT_RUNTIME_ENV = "";
      Object.assign(process.env, { NODE_ENV: "production" });

      const result = getEnvironmentMode();

      // Should fall back to NODE_ENV when NEXT_RUNTIME_ENV is empty
      expect(result.isProduction).toBe(true);
      expect(result.isDevelopment).toBe(false);
      expect(result.isTest).toBe(false);
    });
  });

  describe("Return value structure", () => {
    it("should return an object with all boolean properties", () => {
      const result = getEnvironmentMode();

      expect(typeof result).toBe("object");
      expect(typeof result.isDevelopment).toBe("boolean");
      expect(typeof result.isProduction).toBe("boolean");
      expect(typeof result.isTest).toBe("boolean");
    });

    it("should ensure only one environment flag is true at a time", () => {
      const environments: Environment[] = ["development", "production", "test"];

      environments.forEach((env) => {
        process.env.NEXT_RUNTIME_ENV = env;
        const result = getEnvironmentMode();

        // Count how many flags are true
        const trueCount = [
          result.isDevelopment,
          result.isProduction,
          result.isTest,
        ].filter(Boolean).length;

        expect(trueCount).toBe(1);
      });
    });
  });
});
