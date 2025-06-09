import { describe, test, expect, beforeEach, vi } from "vitest";
import {
  login,
  register,
  updateUserInfo,
  updatePassword,
  refreshToken,
} from "./auth";
import type {
  LoginRequest,
  UserCreate,
  UserUpdate,
  PasswordUpdate,
  RefreshTokenRequest,
} from "@/types/auth";
import { ok, err } from "neverthrow";

// Mock the API functions
vi.mock("@/services/api", () => ({
  fetchJson: vi.fn(),
  fetchEmpty: vi.fn(),
  fetchWithErrorHandlingInternal: vi.fn(),
}));

import { fetchJson, fetchWithErrorHandlingInternal } from "@/services/api";

describe("auth service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("login", () => {
    test("should return success result on successful login", async () => {
      const mockResponse = {
        access_token: "test-token",
        refresh_token: "test-refresh-token",
        token_type: "bearer",
      };

      (
        fetchWithErrorHandlingInternal as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(ok(mockResponse));

      const credentials: LoginRequest = {
        username: "testuser",
        password: "testpass",
      };

      const result = await login(credentials);

      if (result.isErr()) {
        throw new Error("unreachable");
      }

      expect(result.value).toEqual(mockResponse);
    });

    test("should return error result on failed login", async () => {
      const errorResponse = {
        message: "Incorrect username or password",
        status: 401,
      };

      (
        fetchWithErrorHandlingInternal as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(err(errorResponse));

      const credentials: LoginRequest = {
        username: "wronguser",
        password: "wrongpass",
      };

      const result = await login(credentials);

      if (result.isOk()) {
        throw new Error("unreachable");
      }

      expect(result.error.message).toBe("Incorrect username or password");
      expect(result.error.status).toBe(401);
    });
  });

  describe("register", () => {
    test("should return success result on successful registration", async () => {
      const mockUser = {
        id: 1,
        username: "newuser",
        email: "newuser@example.com",
        is_active: true,
        is_approved: false,
      };

      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        ok(mockUser)
      );

      const userData: UserCreate = {
        username: "newuser",
        email: "newuser@example.com",
        password: "password123",
      };

      const result = await register(userData);

      if (result.isErr()) {
        throw new Error("unreachable");
      }

      expect(result.value).toEqual(mockUser);
    });

    test("should return error result on failed registration", async () => {
      const errorResponse = {
        message: "Username already exists",
        status: 400,
      };

      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        err(errorResponse)
      );

      const userData: UserCreate = {
        username: "existinguser",
        email: "existing@example.com",
        password: "password123",
      };

      const result = await register(userData);

      if (result.isOk()) {
        throw new Error("unreachable");
      }

      expect(result.error.message).toBe("Username already exists");
      expect(result.error.status).toBe(400);
    });
  });

  describe("updateUserInfo", () => {
    test("should return UserWithToken on successful update with username change", async () => {
      const mockResponse = {
        user: {
          id: 1,
          username: "newusername",
          email: "user@example.com",
          is_active: true,
          is_approved: true,
        },
        access_token: "new-token",
        token_type: "bearer",
      };

      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        ok(mockResponse)
      );

      const userData: UserUpdate = {
        username: "newusername",
      };

      const result = await updateUserInfo("test-token", userData);

      if (result.isErr()) {
        throw new Error("unreachable");
      }

      expect(result.value).toEqual(mockResponse);
    });
  });

  describe("updatePassword", () => {
    test("should return UserWithToken on successful password update", async () => {
      const mockResponse = {
        user: {
          id: 1,
          username: "testuser",
          email: "user@example.com",
          is_active: true,
          is_approved: true,
        },
        access_token: "new-token",
        token_type: "bearer",
      };

      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        ok(mockResponse)
      );

      const passwordData: PasswordUpdate = {
        current_password: "oldpass",
        new_password: "newpass",
      };

      const result = await updatePassword("test-token", passwordData);

      if (result.isErr()) {
        throw new Error("unreachable");
      }

      expect(result.value).toEqual(mockResponse);
    });
  });

  describe("refreshToken", () => {
    test("should return success result on successful token refresh", async () => {
      const mockResponse = {
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
        token_type: "bearer",
      };

      (
        fetchWithErrorHandlingInternal as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(ok(mockResponse));

      const refreshData: RefreshTokenRequest = {
        refresh_token: "old-refresh-token",
      };

      const result = await refreshToken(refreshData);

      if (result.isErr()) {
        throw new Error("unreachable");
      }

      expect(result.value).toEqual(mockResponse);
    });

    test("should return error result on failed token refresh", async () => {
      const errorResponse = {
        message: "Invalid refresh token",
        status: 401,
      };

      (
        fetchWithErrorHandlingInternal as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(err(errorResponse));

      const refreshData: RefreshTokenRequest = {
        refresh_token: "invalid-refresh-token",
      };

      const result = await refreshToken(refreshData);

      if (result.isOk()) {
        throw new Error("unreachable");
      }

      expect(result.error.message).toBe("Invalid refresh token");
      expect(result.error.status).toBe(401);
    });
  });
});
