import { describe, test, expect, beforeEach, vi } from "vitest";
import { fetchJson, fetchEmpty } from "./api";

// Simple test for the new API functions
describe("API service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("fetchJson", () => {
    test("should be a function", () => {
      expect(typeof fetchJson).toBe("function");
    });
  });

  describe("fetchEmpty", () => {
    test("should be a function", () => {
      expect(typeof fetchEmpty).toBe("function");
    });
  });

  describe("module exports", () => {
    test("should export the expected functions", () => {
      expect(fetchJson).toBeDefined();
      expect(fetchEmpty).toBeDefined();
    });
  });
});
