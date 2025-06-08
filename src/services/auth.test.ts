import { describe, test, expect, beforeEach, vi } from "vitest";
import { login, register, updateUserInfo, updatePassword } from "./auth";
import type {
  LoginRequest,
  UserCreate,
  UserUpdate,
  PasswordUpdate,
} from "@/types/auth";

// Mock fetch
global.fetch = vi.fn();

describe("auth service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("login", () => {
    test("should return success result on successful login", async () => {
      const mockResponse = {
        access_token: "test-token",
        token_type: "bearer",
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const credentials: LoginRequest = {
        username: "testuser",
        password: "testpass",
      };

      const result = await login(credentials);

      if (result.isErr()) {
        throw new Error("unreachable");
      }

      expect(result.value).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8000/auth/token",
        expect.objectContaining({
          method: "POST",
          body: expect.any(FormData),
        })
      );
    });

    test("should return error result on failed login", async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () =>
          JSON.stringify({ detail: "Incorrect username or password" }),
      });

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

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      });

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
      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8000/users/register",
        expect.objectContaining({
          method: "POST",
          headers: expect.any(Headers),
          body: JSON.stringify(userData),
        })
      );

      // Verify headers content separately
      const call = (fetch as any).mock.calls[0];
      const headers = call[1].headers as Headers;
      expect(headers.get("Content-Type")).toBe("application/json");
    });

    test("should return error result on failed registration", async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ detail: "Username already exists" }),
      });

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

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const userData: UserUpdate = {
        username: "newusername",
      };

      const result = await updateUserInfo("test-token", userData);

      if (result.isErr()) {
        throw new Error("unreachable");
      }

      expect(result.value).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8000/users/me",
        expect.objectContaining({
          method: "PUT",
          headers: expect.any(Headers),
          body: JSON.stringify(userData),
        })
      );

      // Verify headers content separately
      const call = (fetch as any).mock.calls[0];
      const headers = call[1].headers as Headers;
      expect(headers.get("Authorization")).toBe("Bearer test-token");
      expect(headers.get("Content-Type")).toBe("application/json");
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

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const passwordData: PasswordUpdate = {
        current_password: "oldpass",
        new_password: "newpass",
      };

      const result = await updatePassword("test-token", passwordData);

      if (result.isErr()) {
        throw new Error("unreachable");
      }

      expect(result.value).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8000/users/me/password",
        expect.objectContaining({
          method: "PUT",
          headers: expect.any(Headers),
          body: JSON.stringify(passwordData),
        })
      );

      // Verify headers content separately
      const call = (fetch as any).mock.calls[0];
      const headers = call[1].headers as Headers;
      expect(headers.get("Authorization")).toBe("Bearer test-token");
      expect(headers.get("Content-Type")).toBe("application/json");
    });
  });
});
