import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dashboard } from "./dashboard";

// Mock functions
const mockLogout = vi.fn();
const mockPush = vi.fn();

// Create mock auth context
let mockAuthContext: {
  user: {
    id: number;
    username: string;
    email: string;
    is_active: boolean;
    is_approved: boolean;
    role: string;
  } | null;
  login: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
  register: ReturnType<typeof vi.fn>;
  updateUserInfo: ReturnType<typeof vi.fn>;
  updatePassword: ReturnType<typeof vi.fn>;
  deleteAccount: ReturnType<typeof vi.fn>;
  isLoading: boolean;
} = {
  user: {
    id: 1,
    username: "testuser",
    email: "test@example.com",
    is_active: true,
    is_approved: true,
    role: "user",
  },
  login: vi.fn(),
  logout: mockLogout,
  register: vi.fn(),
  updateUserInfo: vi.fn(),
  updatePassword: vi.fn(),
  deleteAccount: vi.fn(),
  isLoading: false,
};

// Translation mock
const translations: Record<string, string> = {
  "dashboard.title": "MC Server Dashboard",
  "dashboard.welcome": "Welcome, {username}",
  "dashboard.overview": "Overview",
  "dashboard.accountSettings": "Account Settings",
  "dashboard.accountStatus": "Account Status",
  "dashboard.quickActions": "Quick Actions",
  "dashboard.manageUsers": "Manage Users",
  "dashboard.manageServers": "Manage Servers",
  "dashboard.accountPendingApproval": "Account Pending Approval",
  "dashboard.accountPendingDescription":
    "Your account is currently pending approval by an administrator. You will be able to access all features once your account has been approved.",
  "dashboard.accountPendingNote":
    "If you have any questions, please contact your system administrator.",
  "dashboard.fields.username": "Username:",
  "dashboard.fields.email": "Email:",
  "dashboard.fields.role": "Role:",
  "dashboard.fields.active": "Active:",
  "dashboard.fields.approved": "Approved:",
  "common.logout": "Logout",
  "common.yes": "Yes",
  "common.no": "No",
  "common.pending": "Pending",
};

const mockT = vi.fn((key: string, params?: Record<string, string>) => {
  let translation = translations[key] || key;
  if (params) {
    Object.entries(params).forEach(([paramKey, paramValue]) => {
      translation = translation.replace(`{${paramKey}}`, paramValue);
    });
  }
  return translation;
});

// Mock modules
vi.mock("@/contexts/auth", () => ({
  useAuth: () => mockAuthContext,
}));

vi.mock("@/contexts/language", () => ({
  useTranslation: () => ({ t: mockT, locale: "en" }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("Dashboard", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to approved user
    mockAuthContext = {
      user: {
        id: 1,
        username: "testuser",
        email: "test@example.com",
        is_active: true,
        is_approved: true,
        role: "user",
      },
      login: vi.fn(),
      logout: mockLogout,
      register: vi.fn(),
      updateUserInfo: vi.fn(),
      updatePassword: vi.fn(),
      deleteAccount: vi.fn(),
      isLoading: false,
    };
  });

  test("renders dashboard for approved user", () => {
    render(<Dashboard />);

    expect(screen.getByText("MC Server Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Welcome, testuser")).toBeInTheDocument();
    expect(screen.getByText("Account Status")).toBeInTheDocument();
    expect(screen.getByText("testuser")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();

    // より具体的なセレクターを使用
    const yesElements = screen.getAllByText("Yes");
    expect(yesElements).toHaveLength(2); // is_active と is_approved の両方
  });

  test("calls logout and redirects when logout button is clicked", async () => {
    render(<Dashboard />);

    const logoutButton = screen.getByRole("button", { name: "Logout" });
    await user.click(logoutButton);

    expect(mockLogout).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  test("does not show pending notice for approved user", () => {
    render(<Dashboard />);

    expect(
      screen.queryByText("Account Pending Approval")
    ).not.toBeInTheDocument();
  });

  test("shows pending approval notice for unapproved user", () => {
    // Change mock to unapproved user
    mockAuthContext.user = {
      id: 2,
      username: "unapproveduser",
      email: "unapproved@example.com",
      is_active: true,
      is_approved: false,
      role: "user",
    };

    render(<Dashboard />);

    expect(screen.getByText("Account Pending Approval")).toBeInTheDocument();
    expect(
      screen.getByText(/Your account is currently pending approval/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/contact your system administrator/)
    ).toBeInTheDocument();
  });

  test("renders nothing when no user", () => {
    // Change mock to no user
    mockAuthContext.user = null;

    const { container } = render(<Dashboard />);

    expect(container.firstChild).toBeNull();
  });
});
