import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { MainLayout } from "./main-layout";
import { Role } from "@/types/auth";

// Mock Next.js navigation
const mockPush = vi.fn();
let mockPathname = "/";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
}));

// Mock auth context
const mockLogout = vi.fn();
const mockUser = {
  id: 1,
  username: "testuser",
  role: Role.USER,
  is_approved: true,
};

const mockUseAuth = vi.fn().mockReturnValue({
  user: mockUser,
  logout: mockLogout,
});

vi.mock("@/contexts/auth", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock language context
const mockT = vi.fn((key: string) => {
  const translations: Record<string, string> = {
    "navigation.servers": "Servers",
    "navigation.groups": "Groups",
    "navigation.docs": "Documentation",
    "navigation.account": "Account",
    "navigation.users": "Users",
    "navigation.management": "Management",
    "navigation.resources": "Resources",
    "layout.brandTitle": "MC Server Dashboard",
    "layout.brandSubtitle": "Minecraft Server Management",
    "layout.toggleMenu": "Toggle Menu",
    "layout.closeMenu": "Close Menu",
    "layout.pendingApproval": "Pending Approval",
    "layout.accountPendingApproval": "Account Pending Approval",
    "layout.accountPendingApprovalDescription":
      "Your account is pending approval.",
    "layout.accountPendingApprovalNote": "Please wait for admin approval.",
    "common.logout": "Logout",
  };

  return translations[key] || key;
});

vi.mock("@/contexts/language", () => ({
  useTranslation: () => ({ t: mockT }),
}));

// Mock DOM methods
Object.defineProperty(window, "scrollY", {
  writable: true,
  value: 0,
});

Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: vi.fn(),
});

describe("MainLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/";
    mockUseAuth.mockReturnValue({
      user: mockUser,
      logout: mockLogout,
    });

    // Reset document body styles
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";
    document.body.style.overflowY = "";
    document.body.removeAttribute("data-scroll-locked");
  });

  describe("Basic Rendering", () => {
    it("should render when user is authenticated", () => {
      render(
        <MainLayout>
          <div>Test Content</div>
        </MainLayout>
      );

      expect(screen.getByText("MC Server Dashboard")).toBeInTheDocument();
      expect(
        screen.getByText("Minecraft Server Management")
      ).toBeInTheDocument();
      expect(screen.getByText("Test Content")).toBeInTheDocument();
    });

    it("should not render when user is not authenticated", () => {
      mockUseAuth.mockReturnValue({
        user: null,
        logout: mockLogout,
      });

      const { container } = render(
        <MainLayout>
          <div>Test Content</div>
        </MainLayout>
      );

      expect(container.firstChild).toBeNull();
    });

    it("should display user information", () => {
      render(
        <MainLayout>
          <div>Test Content</div>
        </MainLayout>
      );

      expect(screen.getAllByText("testuser")).toHaveLength(2); // Desktop and mobile
      expect(screen.getAllByText("user")).toHaveLength(2); // Desktop and mobile
    });

    it("should show pending approval message for unapproved users", () => {
      mockUseAuth.mockReturnValue({
        user: { ...mockUser, is_approved: false },
        logout: mockLogout,
      });

      render(
        <MainLayout>
          <div>Test Content</div>
        </MainLayout>
      );

      expect(screen.getAllByText("Pending Approval")).toHaveLength(2); // Desktop and mobile
    });

    it("should show admin-specific navigation items for admin users", () => {
      mockUseAuth.mockReturnValue({
        user: { ...mockUser, role: Role.ADMIN },
        logout: mockLogout,
      });

      render(
        <MainLayout>
          <div>Test Content</div>
        </MainLayout>
      );

      expect(screen.getAllByText("Users")).toHaveLength(2); // Desktop and mobile
    });
  });

  describe("Navigation", () => {
    it("should show active state for groups path", () => {
      mockPathname = "/groups";

      render(
        <MainLayout>
          <div>Test Content</div>
        </MainLayout>
      );

      const groupsButtons = screen.getAllByText("Groups");
      expect(groupsButtons[0]?.closest("button")).toHaveClass("navItemActive");
    });

    it("should disable navigation items for unapproved users except home", () => {
      mockUseAuth.mockReturnValue({
        user: { ...mockUser, is_approved: false },
        logout: mockLogout,
      });

      render(
        <MainLayout>
          <div>Test Content</div>
        </MainLayout>
      );

      const groupsButtons = screen.getAllByText("Groups");
      expect(groupsButtons[0]).toBeDisabled();

      const serversButtons = screen.getAllByText("Servers");
      expect(serversButtons[0]).not.toBeDisabled(); // Home is always enabled
    });

    it("should handle docs path correctly", () => {
      mockPathname = "/docs/getting-started";

      render(
        <MainLayout>
          <div>Test Content</div>
        </MainLayout>
      );

      const docsButtons = screen.getAllByText("Documentation");
      expect(docsButtons[0]?.closest("button")).toHaveClass("navItemActive");
    });
  });

  describe("Approval Status", () => {
    it("should show approval notice instead of children for unapproved users", () => {
      mockUseAuth.mockReturnValue({
        user: { ...mockUser, is_approved: false },
        logout: mockLogout,
      });

      render(
        <MainLayout>
          <div>Test Content</div>
        </MainLayout>
      );

      expect(screen.getByText("Account Pending Approval")).toBeInTheDocument();
      expect(
        screen.getByText("Your account is pending approval.")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Please wait for admin approval.")
      ).toBeInTheDocument();
      expect(screen.queryByText("Test Content")).not.toBeInTheDocument();
    });

    it("should show children content for approved users", () => {
      render(
        <MainLayout>
          <div>Test Content</div>
        </MainLayout>
      );

      expect(screen.getByText("Test Content")).toBeInTheDocument();
      expect(
        screen.queryByText("Account Pending Approval")
      ).not.toBeInTheDocument();
    });
  });
});
