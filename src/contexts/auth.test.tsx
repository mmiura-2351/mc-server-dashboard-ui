import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { ok, err, type Result } from "neverthrow";
import { AuthProvider, useAuth } from "./auth";
import type {
  User,
  LoginRequest,
  UserCreate,
  AuthError,
  UserUpdate,
  PasswordUpdate,
  UserDelete,
  LoginResponse,
  UserWithToken,
} from "@/types/auth";
import { Role } from "@/types/auth";

// Mock all dependencies
vi.mock("@/services/auth");
vi.mock("@/utils/secure-storage");
vi.mock("@/utils/token-manager");
vi.mock("@/utils/input-sanitizer");

// Import mocked modules
import * as authService from "@/services/auth";
import { AuthStorage } from "@/utils/secure-storage";
import { tokenManager } from "@/utils/token-manager";
import { InputSanitizer } from "@/utils/input-sanitizer";

// Create mock implementations using vi.mocked
const mockAuthService = vi.mocked(authService);
const mockAuthStorage = vi.mocked(AuthStorage);
const mockTokenManager = vi.mocked(tokenManager);
const mockInputSanitizer = vi.mocked(InputSanitizer);

// Test data
const mockUser: User = {
  id: 1,
  username: "testuser",
  email: "test@example.com",
  is_active: true,
  is_approved: true,
  role: Role.USER,
};

const mockLoginRequest: LoginRequest = {
  username: "testuser",
  password: "TestPassword123!",
};

const mockLoginResponse: LoginResponse = {
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  token_type: "bearer",
};

const mockUserCreate: UserCreate = {
  username: "newuser",
  email: "new@example.com",
  password: "NewPassword123!",
};

const mockUserUpdate: UserUpdate = {
  username: "updateduser",
  email: "updated@example.com",
};

const mockPasswordUpdate: PasswordUpdate = {
  current_password: "CurrentPassword123!",
  new_password: "NewPassword123!",
};

const mockUserDelete: UserDelete = {
  password: "TestPassword123!",
};

const mockUserWithToken: UserWithToken = {
  user: mockUser,
  access_token: "new-access-token",
  refresh_token: "new-refresh-token",
  token_type: "bearer",
};

const mockAuthError: AuthError = {
  message: "Authentication failed",
  status: 401,
};

// Helper component to test hook outside provider
function TestComponent({ onError }: { onError: (error: Error) => void }) {
  try {
    useAuth();
    return <div>Success</div>;
  } catch (error) {
    onError(error as Error);
    return <div>Error</div>;
  }
}

// Helper component to test context provider
function TestAuthProvider({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

// Helper component to access auth context
function AuthTestComponent() {
  const auth = useAuth();
  return (
    <div>
      <div data-testid="user">{auth.user ? auth.user.username : "null"}</div>
      <div data-testid="isLoading">{auth.isLoading.toString()}</div>
      <div data-testid="isAuthenticated">{auth.isAuthenticated.toString()}</div>
      <button data-testid="login" onClick={() => auth.login(mockLoginRequest)}>
        Login
      </button>
      <button
        data-testid="register"
        onClick={() => auth.register(mockUserCreate)}
      >
        Register
      </button>
      <button data-testid="logout" onClick={() => auth.logout()}>
        Logout
      </button>
      <button
        data-testid="updateUserInfo"
        onClick={() => auth.updateUserInfo(mockUserUpdate)}
      >
        Update User Info
      </button>
      <button
        data-testid="updatePassword"
        onClick={() => auth.updatePassword(mockPasswordUpdate)}
      >
        Update Password
      </button>
      <button
        data-testid="deleteAccount"
        onClick={() => auth.deleteAccount(mockUserDelete)}
      >
        Delete Account
      </button>
      <button data-testid="refreshUser" onClick={() => auth.refreshUser()}>
        Refresh User
      </button>
    </div>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset all mocks to default behaviors
    mockAuthStorage.getAccessToken.mockReturnValue(null);
    mockAuthStorage.getUserData.mockReturnValue(null);
    mockAuthStorage.setAuthTokens.mockReturnValue(true);
    mockAuthStorage.setUserData.mockReturnValue(true);
    mockAuthStorage.setAccessToken.mockReturnValue(true);
    mockAuthStorage.setRefreshToken.mockReturnValue(true);
    mockAuthStorage.clearAuthData.mockReturnValue(true);

    mockTokenManager.getValidAccessToken.mockResolvedValue("valid-token");
    mockTokenManager.clearTokens.mockReturnValue(undefined);

    mockInputSanitizer.sanitizeUsername.mockImplementation(
      (input: string) => input?.trim().toLowerCase() || ""
    );
    mockInputSanitizer.sanitizeEmail.mockImplementation(
      (input: string) => input?.trim().toLowerCase() || ""
    );
    mockInputSanitizer.validatePassword.mockReturnValue({
      isValid: true,
      errors: [],
      sanitized: "ValidPassword123!",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("useAuth hook", () => {
    it("should throw error when used outside AuthProvider", () => {
      const onError = vi.fn();
      render(<TestComponent onError={onError} />);

      expect(onError).toHaveBeenCalledWith(
        new Error("useAuth must be used within an AuthProvider")
      );
    });

    it("should provide auth context when used within AuthProvider", () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: TestAuthProvider,
      });

      expect(result.current).toMatchObject({
        user: null,
        isLoading: expect.any(Boolean),
        isAuthenticated: false,
        login: expect.any(Function),
        register: expect.any(Function),
        logout: expect.any(Function),
        updateUserInfo: expect.any(Function),
        updatePassword: expect.any(Function),
        deleteAccount: expect.any(Function),
        refreshUser: expect.any(Function),
      });
    });
  });

  describe("AuthProvider initialization", () => {
    it("should initialize with no user and loading false when no token exists", async () => {
      mockAuthStorage.getAccessToken.mockReturnValue(null);
      mockAuthStorage.getUserData.mockReturnValue(null);

      render(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("user")).toHaveTextContent("null");
        expect(screen.getByTestId("isLoading")).toHaveTextContent("false");
        expect(screen.getByTestId("isAuthenticated")).toHaveTextContent(
          "false"
        );
      });
    });

    it("should restore user from cache and validate token on initialization", async () => {
      mockAuthStorage.getAccessToken.mockReturnValue("cached-token");
      mockAuthStorage.getUserData.mockReturnValue(mockUser);
      mockTokenManager.getValidAccessToken.mockResolvedValue("valid-token");
      mockAuthService.getCurrentUser.mockResolvedValue(ok(mockUser));

      render(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>
      );

      // Should initially show cached user
      expect(screen.getByTestId("user")).toHaveTextContent("testuser");

      await waitFor(() => {
        expect(screen.getByTestId("isLoading")).toHaveTextContent("false");
        expect(screen.getByTestId("isAuthenticated")).toHaveTextContent("true");
      });

      expect(mockTokenManager.getValidAccessToken).toHaveBeenCalled();
      expect(mockAuthService.getCurrentUser).toHaveBeenCalledWith(
        "valid-token"
      );
    });

    it("should clear auth data when token validation fails with 401", async () => {
      mockAuthStorage.getAccessToken.mockReturnValue("invalid-token");
      mockAuthStorage.getUserData.mockReturnValue(mockUser);
      mockTokenManager.getValidAccessToken.mockResolvedValue("invalid-token");
      mockAuthService.getCurrentUser.mockResolvedValue(
        err({ ...mockAuthError, status: 401 })
      );

      render(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("user")).toHaveTextContent("null");
        expect(screen.getByTestId("isAuthenticated")).toHaveTextContent(
          "false"
        );
      });

      expect(mockAuthStorage.clearAuthData).toHaveBeenCalled();
    });

    it("should handle token refresh events", async () => {
      mockAuthStorage.getAccessToken.mockReturnValue("initial-token");
      mockTokenManager.getValidAccessToken.mockResolvedValue("initial-token");
      mockAuthService.getCurrentUser.mockResolvedValue(ok(mockUser));

      render(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("isAuthenticated")).toHaveTextContent("true");
      });

      // Clear previous calls to getCurrentUser
      mockAuthService.getCurrentUser.mockClear();

      // Simulate token refresh event
      const refreshEvent = new CustomEvent("tokenRefresh", {
        detail: { access_token: "refreshed-token" },
      });

      await act(async () => {
        window.dispatchEvent(refreshEvent);
        // Wait a bit for the async handler to complete
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockAuthService.getCurrentUser).toHaveBeenCalledWith(
        "refreshed-token"
      );
    });

    it("should handle auth logout events", async () => {
      mockAuthStorage.getAccessToken.mockReturnValue("token");
      mockAuthStorage.getUserData.mockReturnValue(mockUser);
      mockTokenManager.getValidAccessToken.mockResolvedValue("token");
      mockAuthService.getCurrentUser.mockResolvedValue(ok(mockUser));

      render(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>
      );

      // With synchronous initialization, user should be immediately available
      expect(screen.getByTestId("user")).toHaveTextContent("testuser");
      expect(screen.getByTestId("isAuthenticated")).toHaveTextContent("true");

      // Simulate auth logout event
      const logoutEvent = new CustomEvent("authLogout");

      await act(async () => {
        window.dispatchEvent(logoutEvent);
      });

      await waitFor(() => {
        expect(screen.getByTestId("user")).toHaveTextContent("null");
        expect(screen.getByTestId("isAuthenticated")).toHaveTextContent(
          "false"
        );
      });
    });
  });

  describe("login function", () => {
    it("should successfully login with valid credentials", async () => {
      mockInputSanitizer.sanitizeUsername.mockReturnValue("testuser");
      mockAuthService.login.mockResolvedValue(ok(mockLoginResponse));
      mockAuthService.getCurrentUser.mockResolvedValue(ok(mockUser));

      render(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("isLoading")).toHaveTextContent("false");
      });

      act(() => {
        screen.getByTestId("login").click();
      });

      await waitFor(() => {
        expect(screen.getByTestId("user")).toHaveTextContent("testuser");
        expect(screen.getByTestId("isAuthenticated")).toHaveTextContent("true");
      });

      expect(mockInputSanitizer.sanitizeUsername).toHaveBeenCalledWith(
        "testuser"
      );
      expect(mockAuthService.login).toHaveBeenCalledWith({
        username: "testuser",
        password: "TestPassword123!",
      });
      expect(mockAuthStorage.setAuthTokens).toHaveBeenCalledWith(
        "mock-access-token",
        "mock-refresh-token"
      );
      expect(mockAuthStorage.setUserData).toHaveBeenCalledWith(mockUser);
    });

    it("should handle empty credentials", async () => {
      mockInputSanitizer.sanitizeUsername.mockReturnValue("");

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestAuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const loginResult = await act(async () => {
        return result.current.login({ username: "", password: "" });
      });

      expect(loginResult.isErr()).toBe(true);
      if (loginResult.isErr()) {
        expect(loginResult.error.message).toBe(
          "Username and password are required"
        );
      }
    });

    it("should handle login service failure", async () => {
      mockInputSanitizer.sanitizeUsername.mockReturnValue("testuser");
      mockAuthService.login.mockResolvedValue(err(mockAuthError));

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestAuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const loginResult = await act(async () => {
        return result.current.login(mockLoginRequest);
      });

      expect(loginResult.isErr()).toBe(true);
      if (loginResult.isErr()) {
        expect(loginResult.error).toEqual(mockAuthError);
      }
    });

    it("should handle token storage failure", async () => {
      mockInputSanitizer.sanitizeUsername.mockReturnValue("testuser");
      mockAuthService.login.mockResolvedValue(ok(mockLoginResponse));
      mockAuthStorage.setAuthTokens.mockReturnValue(false);

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestAuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const loginResult = await act(async () => {
        return result.current.login(mockLoginRequest);
      });

      expect(loginResult.isErr()).toBe(true);
      if (loginResult.isErr()) {
        expect(loginResult.error.message).toBe(
          "Failed to store authentication tokens"
        );
      }
    });

    it("should handle user data fetch failure", async () => {
      mockInputSanitizer.sanitizeUsername.mockReturnValue("testuser");
      mockAuthService.login.mockResolvedValue(ok(mockLoginResponse));
      mockAuthService.getCurrentUser.mockResolvedValue(err(mockAuthError));

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestAuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const loginResult = await act(async () => {
        return result.current.login(mockLoginRequest);
      });

      expect(loginResult.isErr()).toBe(true);
      if (loginResult.isErr()) {
        expect(loginResult.error).toEqual(mockAuthError);
      }
      expect(mockAuthStorage.clearAuthData).toHaveBeenCalled();
    });

    it("should handle user data storage failure", async () => {
      mockInputSanitizer.sanitizeUsername.mockReturnValue("testuser");
      mockAuthService.login.mockResolvedValue(ok(mockLoginResponse));
      mockAuthService.getCurrentUser.mockResolvedValue(ok(mockUser));
      mockAuthStorage.setUserData.mockReturnValue(false);

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestAuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const loginResult = await act(async () => {
        return result.current.login(mockLoginRequest);
      });

      expect(loginResult.isErr()).toBe(true);
      if (loginResult.isErr()) {
        expect(loginResult.error.message).toBe("Failed to store user data");
      }
      expect(mockAuthStorage.clearAuthData).toHaveBeenCalled();
    });
  });

  describe("register function", () => {
    it("should successfully register a new user", async () => {
      mockAuthService.register.mockResolvedValue(ok(mockUser));

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestAuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const registerResult = await act(async () => {
        return result.current.register(mockUserCreate);
      });

      expect(registerResult.isOk()).toBe(true);
      if (registerResult.isOk()) {
        expect(registerResult.value).toEqual(mockUser);
      }
      expect(mockAuthService.register).toHaveBeenCalledWith(mockUserCreate);
    });

    it("should handle registration failure", async () => {
      mockAuthService.register.mockResolvedValue(err(mockAuthError));

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestAuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const registerResult = await act(async () => {
        return result.current.register(mockUserCreate);
      });

      expect(registerResult.isErr()).toBe(true);
      if (registerResult.isErr()) {
        expect(registerResult.error).toEqual(mockAuthError);
      }
    });

    it("should set loading state during registration", async () => {
      let resolveRegister: (value: unknown) => void;
      const registerPromise = new Promise((resolve) => {
        resolveRegister = resolve;
      });
      mockAuthService.register.mockReturnValue(
        registerPromise as Promise<Result<User, AuthError>>
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestAuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.register(mockUserCreate);
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveRegister(ok(mockUser));
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("logout function", () => {
    it("should clear all auth data and user state", async () => {
      // Set up authenticated state
      mockAuthStorage.getAccessToken.mockReturnValue("token");
      mockAuthStorage.getUserData.mockReturnValue(mockUser);
      mockTokenManager.getValidAccessToken.mockResolvedValue("token");
      mockAuthService.getCurrentUser.mockResolvedValue(ok(mockUser));

      render(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>
      );

      // With synchronous initialization, user should be immediately available
      expect(screen.getByTestId("user")).toHaveTextContent("testuser");
      expect(screen.getByTestId("isAuthenticated")).toHaveTextContent("true");

      act(() => {
        screen.getByTestId("logout").click();
      });

      expect(screen.getByTestId("user")).toHaveTextContent("null");
      expect(screen.getByTestId("isAuthenticated")).toHaveTextContent("false");
      expect(mockAuthStorage.clearAuthData).toHaveBeenCalled();
      expect(mockTokenManager.clearTokens).toHaveBeenCalled();
    });
  });

  describe("updateUserInfo function", () => {
    it("should successfully update user info", async () => {
      mockTokenManager.getValidAccessToken.mockResolvedValue("valid-token");
      mockInputSanitizer.sanitizeUsername.mockReturnValue("updateduser");
      mockInputSanitizer.sanitizeEmail.mockReturnValue("updated@example.com");
      mockAuthService.updateUserInfo.mockResolvedValue(ok(mockUserWithToken));

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestAuthProvider,
      });

      const updateResult = await act(async () => {
        return result.current.updateUserInfo(mockUserUpdate);
      });

      expect(updateResult.isOk()).toBe(true);
      if (updateResult.isOk()) {
        expect(updateResult.value).toEqual(mockUser);
      }
      expect(mockInputSanitizer.sanitizeUsername).toHaveBeenCalledWith(
        "updateduser"
      );
      expect(mockInputSanitizer.sanitizeEmail).toHaveBeenCalledWith(
        "updated@example.com"
      );
      expect(mockAuthService.updateUserInfo).toHaveBeenCalledWith(
        "valid-token",
        {
          username: "updateduser",
          email: "updated@example.com",
        }
      );
      expect(mockAuthStorage.setUserData).toHaveBeenCalledWith(mockUser);
      expect(mockAuthStorage.setAccessToken).toHaveBeenCalledWith(
        "new-access-token"
      );
      expect(mockAuthStorage.setRefreshToken).toHaveBeenCalledWith(
        "new-refresh-token"
      );
    });

    it("should handle missing token", async () => {
      mockTokenManager.getValidAccessToken.mockResolvedValue(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestAuthProvider,
      });

      const updateResult = await act(async () => {
        return result.current.updateUserInfo(mockUserUpdate);
      });

      expect(updateResult.isErr()).toBe(true);
      if (updateResult.isErr()) {
        expect(updateResult.error.message).toBe(
          "No authentication token found"
        );
      }
    });

    it("should handle update service failure", async () => {
      mockTokenManager.getValidAccessToken.mockResolvedValue("valid-token");
      mockAuthService.updateUserInfo.mockResolvedValue(err(mockAuthError));

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestAuthProvider,
      });

      const updateResult = await act(async () => {
        return result.current.updateUserInfo(mockUserUpdate);
      });

      expect(updateResult.isErr()).toBe(true);
      if (updateResult.isErr()) {
        expect(updateResult.error).toEqual(mockAuthError);
      }
    });

    it("should handle empty token responses", async () => {
      mockTokenManager.getValidAccessToken.mockResolvedValue("valid-token");
      mockAuthService.updateUserInfo.mockResolvedValue(
        ok({
          ...mockUserWithToken,
          access_token: "",
          refresh_token: "",
        })
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestAuthProvider,
      });

      const updateResult = await act(async () => {
        return result.current.updateUserInfo(mockUserUpdate);
      });

      expect(updateResult.isOk()).toBe(true);
      expect(mockAuthStorage.setAccessToken).not.toHaveBeenCalled();
      expect(mockAuthStorage.setRefreshToken).not.toHaveBeenCalled();
    });
  });

  describe("updatePassword function", () => {
    it("should successfully update password", async () => {
      mockTokenManager.getValidAccessToken.mockResolvedValue("valid-token");
      mockInputSanitizer.validatePassword.mockReturnValue({
        isValid: true,
        errors: [],
        sanitized: "NewPassword123!",
      });
      mockAuthService.updatePassword.mockResolvedValue(ok(mockUserWithToken));

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestAuthProvider,
      });

      const updateResult = await act(async () => {
        return result.current.updatePassword(mockPasswordUpdate);
      });

      expect(updateResult.isOk()).toBe(true);
      if (updateResult.isOk()) {
        expect(updateResult.value).toEqual(mockUser);
      }
      expect(mockInputSanitizer.validatePassword).toHaveBeenCalledWith(
        "NewPassword123!"
      );
      expect(mockAuthService.updatePassword).toHaveBeenCalledWith(
        "valid-token",
        mockPasswordUpdate
      );
      expect(mockAuthStorage.setUserData).toHaveBeenCalledWith(mockUser);
    });

    it("should handle missing token", async () => {
      mockTokenManager.getValidAccessToken.mockResolvedValue(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestAuthProvider,
      });

      const updateResult = await act(async () => {
        return result.current.updatePassword(mockPasswordUpdate);
      });

      expect(updateResult.isErr()).toBe(true);
      if (updateResult.isErr()) {
        expect(updateResult.error.message).toBe(
          "No authentication token found"
        );
      }
    });

    it("should handle invalid password", async () => {
      mockTokenManager.getValidAccessToken.mockResolvedValue("valid-token");
      mockInputSanitizer.validatePassword.mockReturnValue({
        isValid: false,
        errors: [
          "Password must be at least 8 characters long",
          "Password must contain at least one uppercase letter",
        ],
        sanitized: "weak",
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestAuthProvider,
      });

      const updateResult = await act(async () => {
        return result.current.updatePassword(mockPasswordUpdate);
      });

      expect(updateResult.isErr()).toBe(true);
      if (updateResult.isErr()) {
        expect(updateResult.error.message).toBe(
          "Password must be at least 8 characters long, Password must contain at least one uppercase letter"
        );
      }
    });

    it("should handle password update service failure", async () => {
      mockTokenManager.getValidAccessToken.mockResolvedValue("valid-token");
      mockInputSanitizer.validatePassword.mockReturnValue({
        isValid: true,
        errors: [],
        sanitized: "NewPassword123!",
      });
      mockAuthService.updatePassword.mockResolvedValue(err(mockAuthError));

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestAuthProvider,
      });

      const updateResult = await act(async () => {
        return result.current.updatePassword(mockPasswordUpdate);
      });

      expect(updateResult.isErr()).toBe(true);
      if (updateResult.isErr()) {
        expect(updateResult.error).toEqual(mockAuthError);
      }
    });
  });

  describe("deleteAccount function", () => {
    it("should successfully delete account and logout", async () => {
      mockTokenManager.getValidAccessToken.mockResolvedValue("valid-token");
      mockAuthService.deleteAccount.mockResolvedValue(
        ok({ message: "Account deleted" })
      );

      // Set up authenticated state
      mockAuthStorage.getAccessToken.mockReturnValue("token");
      mockAuthStorage.getUserData.mockReturnValue(mockUser);
      mockAuthService.getCurrentUser.mockResolvedValue(ok(mockUser));

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestAuthProvider,
      });

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      const deleteResult = await act(async () => {
        return result.current.deleteAccount(mockUserDelete);
      });

      expect(deleteResult.isOk()).toBe(true);
      expect(mockAuthService.deleteAccount).toHaveBeenCalledWith(
        "valid-token",
        mockUserDelete
      );
      expect(mockAuthStorage.clearAuthData).toHaveBeenCalled();
      expect(mockTokenManager.clearTokens).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it("should handle missing token", async () => {
      mockTokenManager.getValidAccessToken.mockResolvedValue(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestAuthProvider,
      });

      const deleteResult = await act(async () => {
        return result.current.deleteAccount(mockUserDelete);
      });

      expect(deleteResult.isErr()).toBe(true);
      if (deleteResult.isErr()) {
        expect(deleteResult.error.message).toBe(
          "No authentication token found"
        );
      }
    });

    it("should handle delete service failure", async () => {
      mockTokenManager.getValidAccessToken.mockResolvedValue("valid-token");
      mockAuthService.deleteAccount.mockResolvedValue(err(mockAuthError));

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestAuthProvider,
      });

      const deleteResult = await act(async () => {
        return result.current.deleteAccount(mockUserDelete);
      });

      expect(deleteResult.isErr()).toBe(true);
      if (deleteResult.isErr()) {
        expect(deleteResult.error).toEqual(mockAuthError);
      }
      // Should not logout on delete failure
      expect(mockAuthStorage.clearAuthData).not.toHaveBeenCalled();
    });
  });

  describe("refreshUser function", () => {
    it("should successfully refresh user data", async () => {
      mockTokenManager.getValidAccessToken.mockResolvedValue("valid-token");
      mockAuthService.getCurrentUser.mockResolvedValue(ok(mockUser));

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestAuthProvider,
      });

      await act(async () => {
        await result.current.refreshUser();
      });

      expect(mockTokenManager.getValidAccessToken).toHaveBeenCalled();
      expect(mockAuthService.getCurrentUser).toHaveBeenCalledWith(
        "valid-token"
      );
      expect(mockAuthStorage.setUserData).toHaveBeenCalledWith(mockUser);
    });

    it("should handle missing token gracefully", async () => {
      mockTokenManager.getValidAccessToken.mockResolvedValue(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestAuthProvider,
      });

      await act(async () => {
        await result.current.refreshUser();
      });

      expect(mockAuthService.getCurrentUser).not.toHaveBeenCalled();
    });

    it("should handle refresh service failure gracefully", async () => {
      mockTokenManager.getValidAccessToken.mockResolvedValue("valid-token");
      mockAuthService.getCurrentUser.mockResolvedValue(err(mockAuthError));

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestAuthProvider,
      });

      await act(async () => {
        await result.current.refreshUser();
      });

      expect(mockAuthService.getCurrentUser).toHaveBeenCalledWith(
        "valid-token"
      );
      // Should not update user state on failure
      expect(mockAuthStorage.setUserData).not.toHaveBeenCalled();
    });
  });

  describe("event listeners", () => {
    it("should add and remove event listeners when token exists", async () => {
      const addEventListenerSpy = vi.spyOn(window, "addEventListener");
      const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

      // Set up mocks with token to trigger event listener setup
      mockAuthStorage.getAccessToken.mockReturnValue("existing-token");
      mockAuthStorage.getUserData.mockReturnValue(mockUser);
      mockTokenManager.getValidAccessToken.mockResolvedValue("existing-token");
      mockAuthService.getCurrentUser.mockResolvedValue(ok(mockUser));

      const { unmount } = render(
        <AuthProvider>
          <div>Test</div>
        </AuthProvider>
      );

      // Wait for the effect to complete
      await waitFor(() => {
        expect(addEventListenerSpy).toHaveBeenCalledWith(
          "tokenRefresh",
          expect.any(Function)
        );
      });

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "authLogout",
        expect.any(Function)
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "tokenRefresh",
        expect.any(Function)
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "authLogout",
        expect.any(Function)
      );
    });
  });

  describe("security and input sanitization", () => {
    it("should sanitize login credentials", async () => {
      mockInputSanitizer.sanitizeUsername.mockReturnValue("sanitized-user");
      mockAuthService.login.mockResolvedValue(ok(mockLoginResponse));
      mockAuthService.getCurrentUser.mockResolvedValue(ok(mockUser));

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestAuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const credentials = {
        username: "  MALICIOUS<script>  ",
        password: "  password123  ",
      };

      await act(async () => {
        await result.current.login(credentials);
      });

      expect(mockInputSanitizer.sanitizeUsername).toHaveBeenCalledWith(
        "  MALICIOUS<script>  "
      );
      expect(mockAuthService.login).toHaveBeenCalledWith({
        username: "sanitized-user",
        password: "password123", // Password should be trimmed but not over-sanitized
      });
    });

    it("should sanitize user update data", async () => {
      mockTokenManager.getValidAccessToken.mockResolvedValue("valid-token");
      mockInputSanitizer.sanitizeUsername.mockReturnValue("sanitized-user");
      mockInputSanitizer.sanitizeEmail.mockReturnValue("sanitized@example.com");
      mockAuthService.updateUserInfo.mockResolvedValue(ok(mockUserWithToken));

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestAuthProvider,
      });

      const userData = {
        username: "  MALICIOUS<script>  ",
        email: "  MALICIOUS@EXAMPLE.COM  ",
      };

      await act(async () => {
        await result.current.updateUserInfo(userData);
      });

      expect(mockInputSanitizer.sanitizeUsername).toHaveBeenCalledWith(
        "  MALICIOUS<script>  "
      );
      expect(mockInputSanitizer.sanitizeEmail).toHaveBeenCalledWith(
        "  MALICIOUS@EXAMPLE.COM  "
      );
      expect(mockAuthService.updateUserInfo).toHaveBeenCalledWith(
        "valid-token",
        {
          username: "sanitized-user",
          email: "sanitized@example.com",
        }
      );
    });

    it("should validate password strength", async () => {
      mockTokenManager.getValidAccessToken.mockResolvedValue("valid-token");
      mockInputSanitizer.validatePassword.mockReturnValue({
        isValid: false,
        errors: ["Password too weak"],
        sanitized: "weak",
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestAuthProvider,
      });

      const passwordData = {
        current_password: "current",
        new_password: "weak",
      };

      const updateResult = await act(async () => {
        return result.current.updatePassword(passwordData);
      });

      expect(updateResult.isErr()).toBe(true);
      if (updateResult.isErr()) {
        expect(updateResult.error.message).toBe("Password too weak");
      }
      expect(mockInputSanitizer.validatePassword).toHaveBeenCalledWith("weak");
      expect(mockAuthService.updatePassword).not.toHaveBeenCalled();
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle malformed cached user data", async () => {
      mockAuthStorage.getAccessToken.mockReturnValue("token");
      mockAuthStorage.getUserData.mockReturnValue(
        "invalid-json" as unknown as User
      );
      mockTokenManager.getValidAccessToken.mockResolvedValue("token");
      mockAuthService.getCurrentUser.mockResolvedValue(ok(mockUser));

      render(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("isLoading")).toHaveTextContent("false");
        expect(screen.getByTestId("user")).toHaveTextContent("testuser");
      });

      expect(mockAuthService.getCurrentUser).toHaveBeenCalledWith("token");
    });

    it("should handle network errors gracefully", async () => {
      mockInputSanitizer.sanitizeUsername.mockReturnValue("testuser");
      mockAuthService.login.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestAuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.login(mockLoginRequest);
        })
      ).rejects.toThrow("Network error");
    });
  });
});
