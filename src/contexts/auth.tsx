"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
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
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = user !== null;

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const refreshToken = localStorage.getItem("refresh_token");
    
    if (!token) {
      setIsLoading(false);
      return;
    }

    const loadUser = async () => {
      const result = await authService.getCurrentUser(token);
      if (result.isOk()) {
        setUser(result.value);
      } else if (result.error.status === 401 && refreshToken) {
        // Try to refresh the token
        const refreshResult = await authService.refreshToken({ refresh_token: refreshToken });
        if (refreshResult.isOk()) {
          const { access_token, refresh_token: newRefreshToken } = refreshResult.value;
          localStorage.setItem("access_token", access_token);
          localStorage.setItem("refresh_token", newRefreshToken);
          
          // Try to get user with new token
          const userResult = await authService.getCurrentUser(access_token);
          if (userResult.isOk()) {
            setUser(userResult.value);
          } else {
            // Clear all tokens if still failed
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            localStorage.removeItem("user_data");
          }
        } else {
          // Refresh failed, clear all tokens
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("user_data");
        }
      } else {
        // Other error, clear tokens
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user_data");
      }
      setIsLoading(false);
    };

    loadUser();
  }, []);

  const login = async (
    credentials: LoginRequest
  ): Promise<Result<void, AuthError>> => {
    const loginResult = await authService.login(credentials);
    if (loginResult.isErr()) {
      return err(loginResult.error);
    }

    setIsLoading(true);
    const { access_token, refresh_token } = loginResult.value;
    localStorage.setItem("access_token", access_token);
    localStorage.setItem("refresh_token", refresh_token);

    const userResult = await authService.getCurrentUser(access_token);
    if (userResult.isErr()) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      setIsLoading(false);
      return err(userResult.error);
    }

    localStorage.setItem("user_data", JSON.stringify(userResult.value));
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

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_data");
    setUser(null);
  };

  const updateUserInfo = async (
    userData: UserUpdate
  ): Promise<Result<User, AuthError>> => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      return err({ message: "No authentication token found" });
    }

    const result = await authService.updateUserInfo(token, userData);
    if (result.isOk()) {
      const { user, access_token, refresh_token } = result.value;
      setUser(user);
      localStorage.setItem("user_data", JSON.stringify(user));

      // 新しいトークンが提供された場合は更新
      if (access_token && access_token !== "") {
        localStorage.setItem("access_token", access_token);
      }
      if (refresh_token && refresh_token !== "") {
        localStorage.setItem("refresh_token", refresh_token);
      }

      return ok(user);
    }
    return err(result.error);
  };

  const updatePassword = async (
    passwordData: PasswordUpdate
  ): Promise<Result<User, AuthError>> => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      return err({ message: "No authentication token found" });
    }

    const result = await authService.updatePassword(token, passwordData);
    if (result.isOk()) {
      const { user, access_token, refresh_token } = result.value;
      setUser(user);
      localStorage.setItem("user_data", JSON.stringify(user));

      // パスワード変更時は常に新しいトークンが提供される
      if (access_token && access_token !== "") {
        localStorage.setItem("access_token", access_token);
      }
      if (refresh_token && refresh_token !== "") {
        localStorage.setItem("refresh_token", refresh_token);
      }

      return ok(user);
    }
    return err(result.error);
  };

  const deleteAccount = async (
    deleteData: UserDelete
  ): Promise<Result<void, AuthError>> => {
    const token = localStorage.getItem("access_token");
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
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const result = await authService.getCurrentUser(token);
    if (result.isOk()) {
      setUser(result.value);
      localStorage.setItem("user_data", JSON.stringify(result.value));
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
