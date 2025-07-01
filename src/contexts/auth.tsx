"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { ok, err, type Result } from "neverthrow";
import type {
  User,
  LoginRequest,
  UserCreate,
  AuthError,
  UserUpdate,
  PasswordUpdate,
  UserDelete,
} from "@/types/auth";
import * as authService from "@/services/auth";
import { AuthStorage } from "@/utils/secure-storage";
import { tokenManager } from "@/utils/token-manager";
import { InputSanitizer } from "@/utils/input-sanitizer";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<Result<void, AuthError>>;
  register: (userData: UserCreate) => Promise<Result<User, AuthError>>;
  logout: () => void;
  isAuthenticated: boolean;
  updateUserInfo: (userData: UserUpdate) => Promise<Result<User, AuthError>>;
  updatePassword: (
    passwordData: PasswordUpdate
  ) => Promise<Result<User, AuthError>>;
  deleteAccount: (deleteData: UserDelete) => Promise<Result<void, AuthError>>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Initialize user state from localStorage synchronously for immediate auth check
  const [user, setUser] = useState<User | null>(() => {
    const cachedUserData = AuthStorage.getUserData();
    const token = AuthStorage.getAccessToken();
    // Only return cached user if both user data and token exist
    return cachedUserData && token ? (cachedUserData as User) : null;
  });

  // Start with false loading if we have cached auth data
  const [isLoading, setIsLoading] = useState(() => {
    const cachedUserData = AuthStorage.getUserData();
    const token = AuthStorage.getAccessToken();
    // If we have both cached user and token, we can start with authenticated state
    return !(cachedUserData && token);
  });

  const isAuthenticated = user !== null;

  // Listen for automatic token refresh events from token manager
  const handleTokenRefresh = useCallback((event: CustomEvent) => {
    const { access_token } = event.detail;
    // Refresh user data with new token
    authService.getCurrentUser(access_token).then((result) => {
      if (result.isOk()) {
        setUser(result.value);
        AuthStorage.setUserData(result.value);
      }
    });
  }, []);

  // Listen for automatic logout events from token manager
  const handleAuthLogout = useCallback(() => {
    setUser(null);
  }, []);

  useEffect(() => {
    const token = AuthStorage.getAccessToken();
    const cachedUserData = AuthStorage.getUserData();

    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    // If we already have cached user data and started authenticated, skip showing loading
    if (cachedUserData && user) {
      setIsLoading(false);
    }

    const loadUser = async () => {
      // Use token manager for secure token handling
      const validToken = await tokenManager.getValidAccessToken();
      if (!validToken) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const result = await authService.getCurrentUser(validToken);
      if (result.isOk()) {
        setUser(result.value);
        AuthStorage.setUserData(result.value);
      } else {
        // Token manager will handle refresh and logout events
        if (result.error.status === 401) {
          AuthStorage.clearAuthData();
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    loadUser();

    window.addEventListener(
      "tokenRefresh",
      handleTokenRefresh as EventListener
    );
    window.addEventListener("authLogout", handleAuthLogout);

    return () => {
      window.removeEventListener(
        "tokenRefresh",
        handleTokenRefresh as EventListener
      );
      window.removeEventListener("authLogout", handleAuthLogout);
    };
  }, [handleTokenRefresh, handleAuthLogout]);

  const login = async (
    credentials: LoginRequest
  ): Promise<Result<void, AuthError>> => {
    // Sanitize input credentials
    const sanitizedCredentials = {
      username: InputSanitizer.sanitizeUsername(credentials.username),
      password: credentials.password.trim(), // Don't over-sanitize passwords
    };

    // Validate sanitized credentials
    if (!sanitizedCredentials.username || !sanitizedCredentials.password) {
      return err({ message: "Username and password are required" });
    }

    const loginResult = await authService.login(sanitizedCredentials);
    if (loginResult.isErr()) {
      return err(loginResult.error);
    }

    setIsLoading(true);
    const { access_token, refresh_token } = loginResult.value;

    // Use secure storage for token storage
    const tokenStored = AuthStorage.setAuthTokens(access_token, refresh_token);
    if (!tokenStored) {
      setIsLoading(false);
      return err({ message: "Failed to store authentication tokens" });
    }

    const userResult = await authService.getCurrentUser(access_token);
    if (userResult.isErr()) {
      AuthStorage.clearAuthData();
      setIsLoading(false);
      return err(userResult.error);
    }

    const userStored = AuthStorage.setUserData(userResult.value);
    if (!userStored) {
      AuthStorage.clearAuthData();
      setIsLoading(false);
      return err({ message: "Failed to store user data" });
    }

    setUser(userResult.value);
    setIsLoading(false);
    return ok(undefined);
  };

  const register = async (
    userData: UserCreate
  ): Promise<Result<User, AuthError>> => {
    setIsLoading(true);

    const result = await authService.register(userData);
    setIsLoading(false);

    return result;
  };

  const logout = useCallback(() => {
    AuthStorage.clearAuthData();
    tokenManager.clearTokens();
    setUser(null);
  }, []);

  const updateUserInfo = async (
    userData: UserUpdate
  ): Promise<Result<User, AuthError>> => {
    const token = await tokenManager.getValidAccessToken();
    if (!token) {
      return err({ message: "No authentication token found" });
    }

    // Sanitize user data
    const sanitizedUserData = {
      ...userData,
      username: userData.username
        ? InputSanitizer.sanitizeUsername(userData.username)
        : undefined,
      email: userData.email
        ? InputSanitizer.sanitizeEmail(userData.email)
        : undefined,
    };

    const result = await authService.updateUserInfo(token, sanitizedUserData);
    if (result.isOk()) {
      const { user, access_token, refresh_token } = result.value;
      setUser(user);
      AuthStorage.setUserData(user);

      // Update tokens if provided
      if (access_token && access_token !== "") {
        AuthStorage.setAccessToken(access_token);
      }
      if (refresh_token && refresh_token !== "") {
        AuthStorage.setRefreshToken(refresh_token);
      }

      return ok(user);
    }
    return err(result.error);
  };

  const updatePassword = async (
    passwordData: PasswordUpdate
  ): Promise<Result<User, AuthError>> => {
    const token = await tokenManager.getValidAccessToken();
    if (!token) {
      return err({ message: "No authentication token found" });
    }

    // Validate password strength
    const passwordValidation = InputSanitizer.validatePassword(
      passwordData.new_password
    );
    if (!passwordValidation.isValid) {
      return err({ message: passwordValidation.errors.join(", ") });
    }

    const result = await authService.updatePassword(token, passwordData);
    if (result.isOk()) {
      const { user, access_token, refresh_token } = result.value;
      setUser(user);
      AuthStorage.setUserData(user);

      // Update tokens after password change
      if (access_token && access_token !== "") {
        AuthStorage.setAccessToken(access_token);
      }
      if (refresh_token && refresh_token !== "") {
        AuthStorage.setRefreshToken(refresh_token);
      }

      return ok(user);
    }
    return err(result.error);
  };

  const deleteAccount = async (
    deleteData: UserDelete
  ): Promise<Result<void, AuthError>> => {
    const token = await tokenManager.getValidAccessToken();
    if (!token) {
      return err({ message: "No authentication token found" });
    }

    const result = await authService.deleteAccount(token, deleteData);
    if (result.isOk()) {
      logout();
      return ok(undefined);
    }
    return err(result.error);
  };

  const refreshUser = async (): Promise<void> => {
    const token = await tokenManager.getValidAccessToken();
    if (!token) return;

    const result = await authService.getCurrentUser(token);
    if (result.isOk()) {
      setUser(result.value);
      AuthStorage.setUserData(result.value);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    register,
    logout,
    isAuthenticated,
    updateUserInfo,
    updatePassword,
    deleteAccount,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
