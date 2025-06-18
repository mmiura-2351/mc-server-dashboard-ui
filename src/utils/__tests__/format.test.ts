import { formatFileSize, formatDate, formatDateTime } from "../format";

describe("formatFileSize", () => {
  it("formats bytes correctly", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(1024)).toBe("1 KB");
    expect(formatFileSize(1024000)).toBe("1000 KB");
    expect(formatFileSize(1048576)).toBe("1 MB");
    expect(formatFileSize(2048000)).toBe("1.95 MB");
    expect(formatFileSize(1073741824)).toBe("1 GB");
  });

  it("handles string inputs", () => {
    expect(formatFileSize("0")).toBe("0 B");
    expect(formatFileSize("1024")).toBe("1 KB");
    expect(formatFileSize("1024000")).toBe("1000 KB");
    expect(formatFileSize("2048000")).toBe("1.95 MB");
  });

  it("handles null and undefined", () => {
    expect(formatFileSize(null)).toBe("0 B");
    expect(formatFileSize(undefined)).toBe("0 B");
  });

  it("handles invalid strings", () => {
    expect(formatFileSize("")).toBe("0 B");
    expect(formatFileSize("invalid")).toBe("0 B");
    expect(formatFileSize("abc123")).toBe("0 B");
  });

  it("handles edge cases", () => {
    expect(formatFileSize(-1)).toBe("0 B");
    expect(formatFileSize(0.5)).toBe("0.5 B"); // Fractional bytes are displayed as-is
  });
});

describe("formatDate", () => {
  // Mock a specific date for consistent testing
  const testDate = "2024-01-01T12:30:45Z";

  it("formats valid date strings in yyyy/mm/dd format", () => {
    const result = formatDate(testDate);
    expect(result).toBe("2024/01/01");
  });

  it("handles null and undefined", () => {
    expect(formatDate(null)).toBe("Unknown");
    expect(formatDate(undefined)).toBe("Unknown");
  });

  it("handles invalid date strings", () => {
    expect(formatDate("")).toBe("Unknown");
    expect(formatDate("invalid")).toBe("Unknown");
    expect(formatDate("2024-13-45")).toBe("Unknown");
  });

  it("ignores locale parameter (for backwards compatibility)", () => {
    const result = formatDate(testDate, "en-US");
    expect(result).toBe("2024/01/01");
  });
});

describe("formatDateTime", () => {
  // Mock a specific date for consistent testing
  const testDate = "2024-01-01T12:30:45Z";

  it("formats valid date strings in yyyy/mm/dd HH:MM format", () => {
    const result = formatDateTime(testDate);
    expect(result).toMatch(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/);
    expect(result).toContain("2024/01/01");
  });

  it("handles null and undefined", () => {
    expect(formatDateTime(null)).toBe("Unknown");
    expect(formatDateTime(undefined)).toBe("Unknown");
  });

  it("handles invalid date strings", () => {
    expect(formatDateTime("")).toBe("Unknown");
    expect(formatDateTime("invalid")).toBe("Unknown");
    expect(formatDateTime("2024-13-45")).toBe("Unknown");
  });

  it("formats different times correctly", () => {
    const result1 = formatDateTime("2024-12-25T09:05:30Z");
    const result2 = formatDateTime("2024-12-25T15:30:00Z");

    expect(result1).toMatch(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/);
    expect(result2).toMatch(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/);

    // Check that both results are valid formatted strings
    expect(result1.split(" ")).toHaveLength(2);
    expect(result2.split(" ")).toHaveLength(2);

    // Check that the date parts are formatted correctly
    expect(result1.split(" ")[0]).toMatch(/^\d{4}\/\d{2}\/\d{2}$/);
    expect(result2.split(" ")[0]).toMatch(/^\d{4}\/\d{2}\/\d{2}$/);

    // Check that the time parts are formatted correctly
    expect(result1.split(" ")[1]).toMatch(/^\d{2}:\d{2}$/);
    expect(result2.split(" ")[1]).toMatch(/^\d{2}:\d{2}$/);
  });
});
