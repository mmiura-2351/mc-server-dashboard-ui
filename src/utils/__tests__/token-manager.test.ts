import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { tokenManager } from '../token-manager';
import { AuthStorage } from '../secure-storage';

// Mock AuthStorage
vi.mock('../secure-storage', () => ({
  AuthStorage: {
    getAccessToken: vi.fn(),
    getRefreshToken: vi.fn(),
    setAuthTokens: vi.fn(),
    clearAuthData: vi.fn(),
    getAuthTokens: vi.fn(),
  },
}));

// Mock fetch
global.fetch = vi.fn();

// Mock window events
const mockEventDispatcher = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
};

Object.defineProperty(global, 'window', {
  value: mockEventDispatcher,
  writable: true,
});

describe('TokenManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Reset token manager state by clearing tokens
    tokenManager.clearTokens();
    // Advance time to reset rate limiting
    vi.advanceTimersByTime(10000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getValidAccessToken', () => {
    test('should return valid token if available', async () => {
      const mockToken = 'valid-access-token';
      vi.mocked(AuthStorage.getAccessToken).mockReturnValue(mockToken);
      
      const result = await tokenManager.getValidAccessToken();
      
      expect(result).toBe(mockToken);
      expect(AuthStorage.getAccessToken).toHaveBeenCalledOnce();
    });

    test('should return null if no token available', async () => {
      vi.mocked(AuthStorage.getAccessToken).mockReturnValue(null);
      
      const result = await tokenManager.getValidAccessToken();
      
      expect(result).toBeNull();
    });

    test('should return token when available', async () => {
      const validToken = 'valid-access-token';
      
      vi.mocked(AuthStorage.getAccessToken).mockReturnValue(validToken);
      
      const result = await tokenManager.getValidAccessToken();
      
      expect(result).toBe(validToken);
    });
  });

  describe('refreshTokens', () => {
    test('should refresh tokens successfully', async () => {
      const refreshToken = 'valid-refresh-token';
      const newAccessToken = 'new-access-token';
      const newRefreshToken = 'new-refresh-token';
      
      vi.mocked(AuthStorage.getRefreshToken).mockReturnValue(refreshToken);
      vi.mocked(AuthStorage.setAuthTokens).mockReturnValue(true);
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: newAccessToken,
          refresh_token: newRefreshToken,
        }),
      } as Response);

      const result = await tokenManager.refreshTokens();
      
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.access_token).toBe(newAccessToken);
        expect(result.value.refresh_token).toBe(newRefreshToken);
      }
      expect(AuthStorage.setAuthTokens).toHaveBeenCalledWith(newAccessToken, newRefreshToken);
      expect(mockEventDispatcher.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'tokenRefresh',
          detail: { access_token: newAccessToken, refresh_token: newRefreshToken },
        })
      );
    });

    test('should handle refresh failure', async () => {
      const refreshToken = 'invalid-refresh-token';
      
      vi.mocked(AuthStorage.getRefreshToken).mockReturnValue(refreshToken);
      vi.mocked(AuthStorage.clearAuthData).mockReturnValue(true);
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      } as Response);

      const result = await tokenManager.refreshTokens();
      
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Unauthorized');
        expect(result.error.status).toBe(401);
      }
      expect(AuthStorage.clearAuthData).toHaveBeenCalledOnce();
      expect(mockEventDispatcher.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'authLogout' })
      );
    });

    test('should handle network errors', async () => {
      const refreshToken = 'valid-refresh-token';
      
      vi.mocked(AuthStorage.getRefreshToken).mockReturnValue(refreshToken);
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const result = await tokenManager.refreshTokens();
      
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Network error');
        expect(result.error.status).toBe(0);
      }
    });

    test('should prevent concurrent refresh requests', async () => {
      const refreshToken = 'valid-refresh-token';
      
      vi.mocked(AuthStorage.getRefreshToken).mockReturnValue(refreshToken);
      vi.mocked(fetch).mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({
              access_token: 'new-token',
              refresh_token: 'new-refresh',
            }),
          } as Response), 100)
        )
      );

      // Start two refresh operations simultaneously
      const promise1 = tokenManager.refreshTokens();
      const promise2 = tokenManager.refreshTokens();
      
      // Advance timers to complete the requests
      vi.advanceTimersByTime(100);
      
      const [result1, result2] = await Promise.all([promise1, promise2]);
      
      // Both should succeed with the same result
      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      
      // Fetch should only be called once due to deduplication
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    test('should enforce rate limiting', async () => {
      vi.mocked(AuthStorage.getRefreshToken).mockReturnValue('refresh-token');
      
      // First refresh
      await tokenManager.refreshTokens();
      
      // Second refresh immediately after (should be rate limited)
      vi.advanceTimersByTime(1000); // Less than MIN_REFRESH_INTERVAL (5000ms)
      
      const result = await tokenManager.refreshTokens();
      
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Refresh rate limited');
        expect(result.error.status).toBe(429);
      }
    });

    test('should return error when no refresh token available', async () => {
      vi.mocked(AuthStorage.getRefreshToken).mockReturnValue(null);
      
      const result = await tokenManager.refreshTokens();
      
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('No refresh token available');
        expect(result.error.status).toBe(401);
      }
    });
  });

  describe('clearTokens', () => {
    test('should clear all token data', () => {
      vi.mocked(AuthStorage.clearAuthData).mockReturnValue(true);
      
      tokenManager.clearTokens();
      
      expect(AuthStorage.clearAuthData).toHaveBeenCalledOnce();
    });
  });

  describe('hasTokens', () => {
    test('should return true when both tokens exist', () => {
      vi.mocked(AuthStorage.getAuthTokens).mockReturnValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      
      const result = tokenManager.hasTokens();
      
      expect(result).toBe(true);
    });

    test('should return false when tokens are missing', () => {
      vi.mocked(AuthStorage.getAuthTokens).mockReturnValue({
        accessToken: null,
        refreshToken: 'refresh-token',
      });
      
      const result = tokenManager.hasTokens();
      
      expect(result).toBe(false);
    });
  });

  describe('getTokenStatus', () => {
    test('should return token status', () => {
      vi.mocked(AuthStorage.getAuthTokens).mockReturnValue({
        accessToken: 'access-token',
        refreshToken: null,
      });
      
      const status = tokenManager.getTokenStatus();
      
      expect(status).toEqual({
        hasAccessToken: true,
        hasRefreshToken: false,
        refreshInProgress: false,
      });
    });
  });

  describe('handleAPIError', () => {
    test('should handle 401 errors by clearing tokens', () => {
      vi.mocked(AuthStorage.clearAuthData).mockReturnValue(true);
      
      const handled = tokenManager.handleAPIError(401, 'Unauthorized');
      
      expect(handled).toBe(true);
      expect(AuthStorage.clearAuthData).toHaveBeenCalledOnce();
      expect(mockEventDispatcher.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'authLogout' })
      );
    });

    test('should not handle non-401 errors', () => {
      const handled = tokenManager.handleAPIError(500, 'Server Error');
      
      expect(handled).toBe(false);
      expect(AuthStorage.clearAuthData).not.toHaveBeenCalled();
    });
  });

  describe('token validation', () => {
    test('should detect when no tokens are available', () => {
      vi.mocked(AuthStorage.getAuthTokens).mockReturnValue({
        accessToken: null,
        refreshToken: null,
      });
      
      expect(tokenManager.hasTokens()).toBe(false);
    });

    test('should detect when tokens are available', () => {
      vi.mocked(AuthStorage.getAuthTokens).mockReturnValue({
        accessToken: 'valid-access-token',
        refreshToken: 'valid-refresh-token',
      });
      
      expect(tokenManager.hasTokens()).toBe(true);
    });
  });
});