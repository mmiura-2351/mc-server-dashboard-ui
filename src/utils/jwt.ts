/**
 * JWT utility functions for token validation and parsing
 */

/**
 * Check if a JWT token is expired or invalid
 */
export function isTokenExpired(token: string): boolean {
  try {
    if (!token || token.length < 10) {
      return true;
    }

    const parts = token.split(".");
    if (parts.length !== 3) {
      return true;
    }

    const payload = JSON.parse(atob(parts[1]!));
    const currentTime = Math.floor(Date.now() / 1000);

    // Check expiration (exp claim)
    if (payload.exp && currentTime >= payload.exp) {
      return true;
    }

    // Check not before (nbf claim)
    if (payload.nbf && currentTime < payload.nbf) {
      return true;
    }

    return false;
  } catch {
    return true;
  }
}
