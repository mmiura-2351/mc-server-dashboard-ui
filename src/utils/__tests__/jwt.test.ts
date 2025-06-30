import { describe, test, expect } from "vitest";
import { isTokenExpired } from "../jwt";

describe("JWT Utilities", () => {
  describe("isTokenExpired", () => {
    // Helper function to create JWT tokens for testing
    const createJWTToken = (payload: Record<string, unknown>) => {
      const header = { alg: "HS256", typ: "JWT" };
      const encodedHeader = btoa(JSON.stringify(header));
      const encodedPayload = btoa(JSON.stringify(payload));
      const signature = "mock-signature";
      return `${encodedHeader}.${encodedPayload}.${signature}`;
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
