import { describe, it, expect, beforeEach, vi } from "vitest";
import { ok, err } from "neverthrow";
import * as authService from "./auth";
import { Role } from "@/types/auth";
import type {
  UserUpdate,
  PasswordUpdate,
  UserDelete,
  RoleUpdate,
  User,
} from "@/types/auth";

// Mock fetch globally
global.fetch = vi.fn();

const mockUser: User = {
  id: 1,
  username: "testuser",
  email: "test@example.com",
  is_active: true,
  is_approved: true,
  role: Role.USER,
};

const mockToken = "mock-jwt-token";

describe("User Management Auth Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("updateUserInfo", () => {
    it("updates user info successfully", async () => {
      const userData: UserUpdate = {
        username: "newusername",
        email: "newemail@example.com",
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockUser),
      });

      const result = await authService.updateUserInfo(mockToken, userData);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(mockUser);
      }

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
      expect(headers.get("Authorization")).toBe(`Bearer ${mockToken}`);
      expect(headers.get("Content-Type")).toBe("application/json");
    });

    it("returns error when update fails", async () => {
      const userData: UserUpdate = {
        username: "existinguser",
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 400,
        text: () =>
          Promise.resolve(
            JSON.stringify({ detail: "Username already exists" })
          ),
      });

      const result = await authService.updateUserInfo(mockToken, userData);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Username already exists");
        expect(result.error.status).toBe(400);
      }
    });
  });

  describe("updatePassword", () => {
    it("updates password successfully", async () => {
      const passwordData: PasswordUpdate = {
        current_password: "oldpass",
        new_password: "newpass123",
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockUser),
      });

      const result = await authService.updatePassword(mockToken, passwordData);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(mockUser);
      }

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
      expect(headers.get("Authorization")).toBe(`Bearer ${mockToken}`);
      expect(headers.get("Content-Type")).toBe("application/json");
    });

    it("returns error when current password is incorrect", async () => {
      const passwordData: PasswordUpdate = {
        current_password: "wrongpass",
        new_password: "newpass123",
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 400,
        text: () =>
          Promise.resolve(
            JSON.stringify({ detail: "Current password is incorrect" })
          ),
      });

      const result = await authService.updatePassword(mockToken, passwordData);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Current password is incorrect");
      }
    });
  });

  describe("deleteAccount", () => {
    it("deletes account successfully", async () => {
      const deleteData: UserDelete = {
        password: "password123",
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ message: "Account deleted successfully" }),
      });

      const result = await authService.deleteAccount(mockToken, deleteData);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.message).toBe("Account deleted successfully");
      }

      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8000/users/me",
        expect.objectContaining({
          method: "DELETE",
          headers: expect.any(Headers),
          body: JSON.stringify(deleteData),
        })
      );

      // Verify headers content separately
      const call = (fetch as any).mock.calls[0];
      const headers = call[1].headers as Headers;
      expect(headers.get("Authorization")).toBe(`Bearer ${mockToken}`);
      expect(headers.get("Content-Type")).toBe("application/json");
    });

    it("returns error when password is incorrect", async () => {
      const deleteData: UserDelete = {
        password: "wrongpass",
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 400,
        text: () =>
          Promise.resolve(JSON.stringify({ detail: "Password is incorrect" })),
      });

      const result = await authService.deleteAccount(mockToken, deleteData);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Password is incorrect");
      }
    });
  });

  describe("getAllUsers", () => {
    it("gets all users successfully", async () => {
      const users: User[] = [mockUser];

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(users),
      });

      const result = await authService.getAllUsers(mockToken);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(users);
      }

      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8000/users/",
        expect.objectContaining({
          method: "GET",
          headers: expect.any(Headers),
        })
      );

      // Verify headers content separately
      const call = (fetch as any).mock.calls[0];
      const headers = call[1].headers as Headers;
      expect(headers.get("Authorization")).toBe(`Bearer ${mockToken}`);
    });

    it("returns error when user is not admin", async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 403,
        text: () =>
          Promise.resolve(
            JSON.stringify({ detail: "Only admin can perform this action" })
          ),
      });

      const result = await authService.getAllUsers(mockToken);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Only admin can perform this action");
        expect(result.error.status).toBe(403);
      }
    });
  });

  describe("deleteUserByAdmin", () => {
    it("deletes user by admin successfully", async () => {
      const userId = 2;

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ message: "User deleted successfully" }),
      });

      const result = await authService.deleteUserByAdmin(mockToken, userId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.message).toBe("User deleted successfully");
      }

      expect(fetch).toHaveBeenCalledWith(
        `http://localhost:8000/users/${userId}`,
        expect.objectContaining({
          method: "DELETE",
          headers: expect.any(Headers),
        })
      );

      // Verify headers content separately
      const call = (fetch as any).mock.calls[0];
      const headers = call[1].headers as Headers;
      expect(headers.get("Authorization")).toBe(`Bearer ${mockToken}`);
    });

    it("returns error when user not found", async () => {
      const userId = 999;

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 404,
        text: () =>
          Promise.resolve(JSON.stringify({ detail: "User not found" })),
      });

      const result = await authService.deleteUserByAdmin(mockToken, userId);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("User not found");
        expect(result.error.status).toBe(404);
      }
    });
  });

  describe("approveUser", () => {
    it("approves user successfully", async () => {
      const userId = 2;
      const approvedUser = { ...mockUser, id: userId, is_approved: true };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(approvedUser),
      });

      const result = await authService.approveUser(mockToken, userId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(approvedUser);
      }

      expect(fetch).toHaveBeenCalledWith(
        `http://localhost:8000/users/approve/${userId}`,
        expect.objectContaining({
          method: "POST",
          headers: expect.any(Headers),
        })
      );

      // Verify headers content separately
      const call = (fetch as any).mock.calls[0];
      const headers = call[1].headers as Headers;
      expect(headers.get("Authorization")).toBe(`Bearer ${mockToken}`);
    });
  });

  describe("updateUserRole", () => {
    it("updates user role successfully", async () => {
      const userId = 2;
      const roleData: RoleUpdate = { role: Role.ADMIN };
      const updatedUser = { ...mockUser, id: userId, role: Role.ADMIN };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(updatedUser),
      });

      const result = await authService.updateUserRole(
        mockToken,
        userId,
        roleData
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(updatedUser);
      }

      expect(fetch).toHaveBeenCalledWith(
        `http://localhost:8000/users/role/${userId}`,
        expect.objectContaining({
          method: "PUT",
          headers: expect.any(Headers),
          body: JSON.stringify(roleData),
        })
      );

      // Verify headers content separately
      const call = (fetch as any).mock.calls[0];
      const headers = call[1].headers as Headers;
      expect(headers.get("Authorization")).toBe(`Bearer ${mockToken}`);
      expect(headers.get("Content-Type")).toBe("application/json");
    });

    it("returns error when user is not admin", async () => {
      const userId = 2;
      const roleData: RoleUpdate = { role: Role.ADMIN };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 403,
        text: () =>
          Promise.resolve(
            JSON.stringify({ detail: "Only admin can perform this action" })
          ),
      });

      const result = await authService.updateUserRole(
        mockToken,
        userId,
        roleData
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Only admin can perform this action");
        expect(result.error.status).toBe(403);
      }
    });
  });

  describe("network error handling", () => {
    it("handles network errors gracefully", async () => {
      (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Network error")
      );

      const result = await authService.updateUserInfo(mockToken, {
        username: "test",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Network error");
      }
    });
  });
});
