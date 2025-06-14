import { formatFileSize, formatDate } from "../format";

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

  it("formats valid date strings", () => {
    const result = formatDate(testDate);
    expect(result).not.toBe("Unknown");
    expect(result).toContain("2024");
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

  it("uses provided locale", () => {
    const result = formatDate(testDate, "en-US");
    expect(result).not.toBe("Unknown");
    expect(result).toContain("2024");
  });
});
