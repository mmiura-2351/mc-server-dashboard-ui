import { describe, test, expect } from "vitest";
import { formatDate, formatDateTime } from "../date-format";

describe("Date Formatting Utilities", () => {
  describe("formatDate", () => {
    test("should format valid date strings correctly", () => {
      const dateString = "2025-01-15T10:30:00Z";
      const result = formatDate(dateString, "en-US");

      // Should return a valid formatted date
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
      expect(result).not.toBe("Invalid Date");
      expect(result).not.toBe("Unknown");
    });

    test("should handle null date strings", () => {
      const result = formatDate(null, "en-US");
      expect(result).toBe("Unknown");
    });

    test("should handle undefined date strings", () => {
      const result = formatDate(undefined, "en-US");
      expect(result).toBe("Unknown");
    });

    test("should handle empty date strings", () => {
      const result = formatDate("", "en-US");
      expect(result).toBe("Unknown");
    });

    test("should handle invalid date strings", () => {
      const result = formatDate("not-a-date", "en-US");
      expect(result).toBe("Invalid Date");
    });

    test("should handle malformed date strings", () => {
      const result = formatDate("2025-13-45T99:99:99Z", "en-US");
      expect(result).toBe("Invalid Date");
    });

    test("should use default locale when none provided", () => {
      const dateString = "2025-01-15T10:30:00Z";
      const result = formatDate(dateString);

      // Should return a valid formatted date
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
      expect(result).not.toBe("Invalid Date");
      expect(result).not.toBe("Unknown");
    });

    test("should handle different locales", () => {
      const dateString = "2025-01-15T10:30:00Z";
      const resultEN = formatDate(dateString, "en-US");
      const resultJA = formatDate(dateString, "ja-JP");

      // Both should be valid but potentially different formats
      expect(resultEN).not.toBe("Invalid Date");
      expect(resultJA).not.toBe("Invalid Date");
      expect(resultEN).not.toBe("Unknown");
      expect(resultJA).not.toBe("Unknown");
    });
  });

  describe("formatDateTime", () => {
    test("should format valid date strings with time correctly", () => {
      const dateString = "2025-01-15T10:30:00Z";
      const result = formatDateTime(dateString, "en-US");

      // Should contain both date and time parts
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/); // Date part
      expect(result).toMatch(/\d{1,2}:\d{2}/); // Time part
      expect(result).not.toBe("Invalid Date");
      expect(result).not.toBe("Unknown");
    });

    test("should handle null date strings", () => {
      const result = formatDateTime(null, "en-US");
      expect(result).toBe("Unknown");
    });

    test("should handle undefined date strings", () => {
      const result = formatDateTime(undefined, "en-US");
      expect(result).toBe("Unknown");
    });

    test("should handle empty date strings", () => {
      const result = formatDateTime("", "en-US");
      expect(result).toBe("Unknown");
    });

    test("should handle invalid date strings", () => {
      const result = formatDateTime("not-a-date", "en-US");
      expect(result).toBe("Invalid Date");
    });

    test("should use default locale when none provided", () => {
      const dateString = "2025-01-15T10:30:00Z";
      const result = formatDateTime(dateString);

      // Should contain both date and time parts
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/); // Date part
      expect(result).toMatch(/\d{1,2}:\d{2}/); // Time part
      expect(result).not.toBe("Invalid Date");
      expect(result).not.toBe("Unknown");
    });
  });
});
