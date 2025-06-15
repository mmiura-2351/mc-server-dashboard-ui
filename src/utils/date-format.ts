/**
 * Utility functions for date formatting that handle null/undefined dates gracefully
 */

/**
 * Formats a date string to a localized date string, handling null/undefined values
 * @param dateString - The date string to format (can be null/undefined)
 * @param locale - The locale to use for formatting (defaults to 'en-US')
 * @returns Formatted date string or fallback text for invalid dates
 */
export function formatDate(
  dateString: string | null | undefined,
  locale: string = "en-US"
): string {
  if (!dateString) {
    return "Unknown";
  }

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }
    return date.toLocaleDateString(locale);
  } catch {
    return "Invalid Date";
  }
}

/**
 * Formats a date string to a localized date and time string, handling null/undefined values
 * @param dateString - The date string to format (can be null/undefined)
 * @param locale - The locale to use for formatting (defaults to 'en-US')
 * @returns Formatted date and time string or fallback text for invalid dates
 */
export function formatDateTime(
  dateString: string | null | undefined,
  locale: string = "en-US"
): string {
  if (!dateString) {
    return "Unknown";
  }

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }
    return (
      date.toLocaleDateString(locale) + " " + date.toLocaleTimeString(locale)
    );
  } catch {
    return "Invalid Date";
  }
}

/**
 * Formats a date string to yyyy/mm/dd format, handling null/undefined values
 * @param dateString - The date string to format (can be null/undefined)
 * @returns Formatted date string in yyyy/mm/dd format or fallback text for invalid dates
 */
export function formatDateSimple(
  dateString: string | null | undefined
): string {
  if (!dateString) {
    return "Unknown";
  }

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}/${month}/${day}`;
  } catch {
    return "Invalid Date";
  }
}
