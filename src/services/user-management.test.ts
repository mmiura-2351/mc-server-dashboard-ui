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

// Mock the API functions
vi.mock("@/services/api", () => ({
  fetchJson: vi.fn(),
  fetchEmpty: vi.fn(),
  fetchWithErrorHandlingInternal: vi.fn(),
}));

import { fetchJson } from "@/services/api";

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

      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValue(ok(mockUser));

      const result = await authService.updateUserInfo(mockToken, userData);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(mockUser);
      }
    });

    it("returns error when update fails", async () => {
      const userData: UserUpdate = {
        username: "existinguser",
      };

      const errorResponse = {
        message: "Username already exists",
        status: 400,
      };

      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValue(
        err(errorResponse)
      );

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

      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValue(ok(mockUser));

      const result = await authService.updatePassword(mockToken, passwordData);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(mockUser);
      }
    });

    it("returns error when current password is incorrect", async () => {
      const passwordData: PasswordUpdate = {
        current_password: "wrongpass",
        new_password: "newpass123",
      };

      const errorResponse = {
        message: "Current password is incorrect",
        status: 400,
      };

      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValue(
        err(errorResponse)
      );

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

      const mockResponse = { message: "Account deleted successfully" };

      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValue(
        ok(mockResponse)
      );

      const result = await authService.deleteAccount(mockToken, deleteData);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.message).toBe("Account deleted successfully");
      }
    });

    it("returns error when password is incorrect", async () => {
      const deleteData: UserDelete = {
        password: "wrongpass",
      };

      const errorResponse = {
        message: "Password is incorrect",
        status: 400,
      };

      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValue(
        err(errorResponse)
      );

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

      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValue(ok(users));

      const result = await authService.getAllUsers(mockToken);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(users);
      }
    });

    it("returns error when user is not admin", async () => {
      const errorResponse = {
        message: "Only admin can perform this action",
        status: 403,
      };

      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValue(
        err(errorResponse)
      );

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
      const mockResponse = { message: "User deleted successfully" };

      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValue(
        ok(mockResponse)
      );

      const result = await authService.deleteUserByAdmin(mockToken, userId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.message).toBe("User deleted successfully");
      }
    });

    it("returns error when user not found", async () => {
      const userId = 999;
      const errorResponse = {
        message: "User not found",
        status: 404,
      };

      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValue(
        err(errorResponse)
      );

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

      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValue(
        ok(approvedUser)
      );

      const result = await authService.approveUser(mockToken, userId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(approvedUser);
      }
    });
  });

  describe("updateUserRole", () => {
    it("updates user role successfully", async () => {
      const userId = 2;
      const roleData: RoleUpdate = { role: Role.ADMIN };
      const updatedUser = { ...mockUser, id: userId, role: Role.ADMIN };

      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValue(
        ok(updatedUser)
      );

      const result = await authService.updateUserRole(
        mockToken,
        userId,
        roleData
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(updatedUser);
      }
    });

    it("returns error when user is not admin", async () => {
      const userId = 2;
      const roleData: RoleUpdate = { role: Role.ADMIN };
      const errorResponse = {
        message: "Only admin can perform this action",
        status: 403,
      };

      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValue(
        err(errorResponse)
      );

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
      const errorResponse = {
        message: "Network error",
      };

      (fetchJson as ReturnType<typeof vi.fn>).mockResolvedValue(
        err(errorResponse)
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
