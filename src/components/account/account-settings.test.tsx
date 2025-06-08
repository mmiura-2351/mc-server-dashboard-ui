import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { ok, err } from "neverthrow";
import { AccountSettings } from "./account-settings";
import { useAuth } from "@/contexts/auth";
import { LanguageProvider } from "@/contexts/language";
import type {
  User,
  UserUpdate,
  PasswordUpdate,
  UserDelete,
} from "@/types/auth";
import { Role } from "@/types/auth";

// Mock the auth context
vi.mock("@/contexts/auth");

const mockUser: User = {
  id: 1,
  username: "testuser",
  email: "test@example.com",
  is_active: true,
  is_approved: true,
  role: Role.USER,
};

const mockUpdateUserInfo = vi.fn();
const mockUpdatePassword = vi.fn();
const mockDeleteAccount = vi.fn();

const mockAuthContext = {
  user: mockUser,
  updateUserInfo: mockUpdateUserInfo,
  updatePassword: mockUpdatePassword,
  deleteAccount: mockDeleteAccount,
  isLoading: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  isAuthenticated: true,
  refreshUser: vi.fn(),
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <LanguageProvider>{children}</LanguageProvider>
);

describe("AccountSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(mockAuthContext);
  });

  it("renders account settings with user information", () => {
    render(
      <TestWrapper>
        <AccountSettings />
      </TestWrapper>
    );

    expect(screen.getByText("account.title")).toBeInTheDocument();
    expect(screen.getByText("account.profile")).toBeInTheDocument();
    expect(screen.getByText("auth.password")).toBeInTheDocument();
    expect(screen.getByText("language.switchLanguage")).toBeInTheDocument();
    expect(screen.getByText("account.dangerZone")).toBeInTheDocument();
  });

  it("displays profile tab by default", () => {
    render(
      <TestWrapper>
        <AccountSettings />
      </TestWrapper>
    );

    expect(screen.getByText("account.profileInformation")).toBeInTheDocument();
    expect(screen.getByDisplayValue("testuser")).toBeInTheDocument();
    expect(screen.getByDisplayValue("test@example.com")).toBeInTheDocument();
  });

  it("switches to password tab when clicked", () => {
    render(
      <TestWrapper>
        <AccountSettings />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText("auth.password"));

    expect(screen.getByText("account.changePassword")).toBeInTheDocument();
    expect(screen.getByLabelText("auth.currentPassword")).toBeInTheDocument();
    expect(screen.getByLabelText("auth.newPassword")).toBeInTheDocument();
    expect(
      screen.getByLabelText("auth.confirmNewPassword")
    ).toBeInTheDocument();
  });

  it("switches to language tab when clicked", () => {
    render(
      <TestWrapper>
        <AccountSettings />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText("language.switchLanguage"));

    expect(
      screen.getByText("language.languageDescription")
    ).toBeInTheDocument();
    expect(screen.getByText("language.english")).toBeInTheDocument();
    expect(screen.getByText("language.japanese")).toBeInTheDocument();
  });

  it("switches to danger zone tab when clicked", () => {
    render(
      <TestWrapper>
        <AccountSettings />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText("account.dangerZone"));

    expect(
      screen.getByRole("heading", { name: "account.deleteAccount" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("account.onceYouDeleteYourAccount")
    ).toBeInTheDocument();
  });

  it("updates profile information successfully", async () => {
    mockUpdateUserInfo.mockResolvedValue(
      ok({ ...mockUser, username: "newusername" })
    );

    render(
      <TestWrapper>
        <AccountSettings />
      </TestWrapper>
    );

    const usernameInput = screen.getByDisplayValue("testuser");
    fireEvent.change(usernameInput, { target: { value: "newusername" } });

    fireEvent.click(screen.getByText("account.updateProfile"));

    await waitFor(() => {
      expect(mockUpdateUserInfo).toHaveBeenCalledWith({
        username: "newusername",
        email: "test@example.com",
      });
    });

    await waitFor(() => {
      expect(
        screen.getByText("account.profileUpdatedSuccessfully")
      ).toBeInTheDocument();
    });
  });

  it("shows error when profile update fails", async () => {
    mockUpdateUserInfo.mockResolvedValue(
      err({ message: "Username already exists" })
    );

    render(
      <TestWrapper>
        <AccountSettings />
      </TestWrapper>
    );

    const usernameInput = screen.getByDisplayValue("testuser");
    fireEvent.change(usernameInput, { target: { value: "existinguser" } });

    fireEvent.click(screen.getByText("account.updateProfile"));

    await waitFor(() => {
      expect(screen.getByText("Username already exists")).toBeInTheDocument();
    });
  });

  it("updates password successfully", async () => {
    mockUpdatePassword.mockResolvedValue(ok(mockUser));

    render(
      <TestWrapper>
        <AccountSettings />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText("auth.password"));

    fireEvent.change(screen.getByLabelText("auth.currentPassword"), {
      target: { value: "currentpass" },
    });
    fireEvent.change(screen.getByLabelText("auth.newPassword"), {
      target: { value: "newpass123" },
    });
    fireEvent.change(screen.getByLabelText("auth.confirmNewPassword"), {
      target: { value: "newpass123" },
    });

    fireEvent.click(screen.getByText("account.updatePassword"));

    await waitFor(() => {
      expect(mockUpdatePassword).toHaveBeenCalledWith({
        current_password: "currentpass",
        new_password: "newpass123",
      });
    });

    await waitFor(() => {
      expect(
        screen.getByText("account.passwordUpdatedSuccessfully")
      ).toBeInTheDocument();
    });
  });

  it("shows error when passwords don't match", async () => {
    render(
      <TestWrapper>
        <AccountSettings />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText("auth.password"));

    fireEvent.change(screen.getByLabelText("auth.currentPassword"), {
      target: { value: "currentpass" },
    });
    fireEvent.change(screen.getByLabelText("auth.newPassword"), {
      target: { value: "newpass123" },
    });
    fireEvent.change(screen.getByLabelText("auth.confirmNewPassword"), {
      target: { value: "differentpass" },
    });

    fireEvent.click(screen.getByText("account.updatePassword"));

    await waitFor(() => {
      expect(
        screen.getByText("account.newPasswordsDoNotMatch")
      ).toBeInTheDocument();
    });

    expect(mockUpdatePassword).not.toHaveBeenCalled();
  });

  it("deletes account successfully", async () => {
    mockDeleteAccount.mockResolvedValue(ok(undefined));

    render(
      <TestWrapper>
        <AccountSettings />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText("account.dangerZone"));

    fireEvent.change(screen.getByLabelText("auth.password"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText(/account.typeDeleteToConfirm/), {
      target: { value: "DELETE" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: "account.deleteAccount" })
    );

    await waitFor(() => {
      expect(mockDeleteAccount).toHaveBeenCalledWith({
        password: "password123",
      });
    });
  });

  it("shows error when delete confirmation is incorrect", async () => {
    render(
      <TestWrapper>
        <AccountSettings />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText("account.dangerZone"));

    fireEvent.change(screen.getByLabelText("auth.password"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText(/account.typeDeleteToConfirm/), {
      target: { value: "delete" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: "account.deleteAccount" })
    );

    await waitFor(() => {
      expect(
        screen.getByText("account.pleaseTypeDeleteToConfirm")
      ).toBeInTheDocument();
    });

    expect(mockDeleteAccount).not.toHaveBeenCalled();
  });

  it("returns null when user is not available", () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      ...mockAuthContext,
      user: null,
    });

    const { container } = render(
      <TestWrapper>
        <AccountSettings />
      </TestWrapper>
    );
    expect(container.firstChild).toBeNull();
  });
});
