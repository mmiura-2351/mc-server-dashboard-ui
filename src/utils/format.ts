/**
 * Formats bytes into human-readable file size
 * @param bytes - The size in bytes (can be number, string, null, or undefined)
 * @returns Formatted size string (e.g., "1.5 MB", "0 B")
 */
export function formatFileSize(
  bytes: number | string | undefined | null
): string {
  // Convert to number if it's a string
  const numBytes = typeof bytes === "string" ? parseInt(bytes, 10) : bytes;

  // Handle null, undefined, 0, invalid numbers, or negative numbers
  if (!numBytes || numBytes <= 0 || isNaN(numBytes) || !isFinite(numBytes)) {
    return "0 B";
  }

  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(numBytes) / Math.log(1024));

  // Ensure index is within valid bounds (0 to sizes.length - 1)
  const sizeIndex = Math.max(0, Math.min(i, sizes.length - 1));
  const size = Math.round((numBytes / Math.pow(1024, sizeIndex)) * 100) / 100;

  return `${size} ${sizes[sizeIndex]}`;
}

/**
 * Formats a date string into a localized date/time string
 * @param dateString - ISO date string
 * @param locale - Locale for formatting (default: current locale)
 * @returns Formatted date string or "Unknown" if invalid
 */
export function formatDate(
  dateString: string | undefined | null,
  _locale?: string
): string {
  if (!dateString) return "Unknown";

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Unknown";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}/${month}/${day}`;
  } catch {
    return "Unknown";
  }
}
