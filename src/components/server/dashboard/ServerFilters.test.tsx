import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ServerFilters } from "./ServerFilters";
import { ServerType, ServerStatus } from "@/types/server";
import type { ServerFilters as ServerFiltersType } from "../hooks/useServerFilters";

// Mock translation with parameter handling
const translations: Record<string, string> = {
  "servers.filters.totalCount": "Total: {count} servers",
  "servers.filters.filteredCount": "Showing {filtered} of {total}",
  "servers.filters.toggle": "Toggle Filters",
  "servers.filters.search": "Search",
  "servers.filters.searchPlaceholder": "Search servers...",
  "servers.filters.type": "Type",
  "servers.filters.allTypes": "All Types",
  "servers.filters.status": "Status",
  "servers.filters.allStatuses": "All Statuses",
  "servers.filters.version": "Version",
  "servers.filters.allVersions": "All Versions",
  "servers.filters.sortBy": "Sort By",
  "servers.filters.sortOrder": "Sort Order",
  "servers.filters.reset": "Reset Filters",
  "servers.types.vanilla": "Vanilla",
  "servers.types.paper": "Paper",
  "servers.types.forge": "Forge",
  "servers.status.running": "Running",
  "servers.status.stopped": "Stopped",
  "servers.status.starting": "Starting",
  "servers.status.stopping": "Stopping",
  "servers.status.error": "Error",
  "servers.sort.status": "Status",
  "servers.sort.name": "Name",
  "servers.sort.created": "Created",
  "servers.sort.version": "Version",
  "servers.sort.asc": "Ascending",
  "servers.sort.desc": "Descending",
};

const mockT = vi.fn((key: string, params?: Record<string, string | number>) => {
  let translation = translations[key] || key;
  if (params) {
    Object.entries(params).forEach(([paramKey, paramValue]) => {
      translation = translation.replace(`{${paramKey}}`, String(paramValue));
    });
  }
  return translation;
});

vi.mock("@/contexts/language", () => ({
  useTranslation: () => ({
    t: mockT,
  }),
}));

const mockFilters: ServerFiltersType = {
  serverType: "all",
  serverStatus: "all",
  minecraftVersion: "all",
  searchQuery: "",
  sortBy: "status",
  sortOrder: "desc",
};

const mockAvailableVersions = ["1.21.6", "1.21.5", "1.21.4"];

const mockProps = {
  filters: mockFilters,
  availableVersions: mockAvailableVersions,
  hasActiveFilters: false,
  onFilterChange: vi.fn(),
  onResetFilters: vi.fn(),
  showFilters: false,
  onToggleFilters: vi.fn(),
  serverCount: 5,
  filteredCount: 5,
};

describe("ServerFilters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render filter toggle button", () => {
    render(<ServerFilters {...mockProps} />);

    expect(screen.getByRole("button", { name: /filter/i })).toBeInTheDocument();
  });

  it("should show server count", () => {
    render(<ServerFilters {...mockProps} />);

    expect(screen.getByText("Total: 5 servers")).toBeInTheDocument();
  });

  it("should toggle filter visibility", () => {
    render(<ServerFilters {...mockProps} />);

    const toggleButton = screen.getByRole("button", { name: /filter/i });
    fireEvent.click(toggleButton);

    expect(mockProps.onToggleFilters).toHaveBeenCalled();
  });

  it("should show filters when expanded", () => {
    render(<ServerFilters {...mockProps} showFilters={true} />);

    expect(
      screen.getByPlaceholderText("Search servers...")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Type")).toBeInTheDocument(); // Server type dropdown
  });

  it("should handle search input change", () => {
    render(<ServerFilters {...mockProps} showFilters={true} />);

    const searchInput = screen.getByPlaceholderText("Search servers...");
    fireEvent.change(searchInput, { target: { value: "test server" } });

    expect(mockProps.onFilterChange).toHaveBeenCalledWith({
      searchQuery: "test server",
    });
  });

  it("should handle server type filter change", () => {
    render(<ServerFilters {...mockProps} showFilters={true} />);

    const typeSelect = screen.getByLabelText("Type");
    fireEvent.change(typeSelect, { target: { value: ServerType.PAPER } });

    expect(mockProps.onFilterChange).toHaveBeenCalledWith({
      serverType: ServerType.PAPER,
    });
  });

  it("should handle server status filter change", () => {
    render(<ServerFilters {...mockProps} showFilters={true} />);

    const statusSelect = screen.getByLabelText("Status");
    fireEvent.change(statusSelect, { target: { value: ServerStatus.RUNNING } });

    expect(mockProps.onFilterChange).toHaveBeenCalledWith({
      serverStatus: ServerStatus.RUNNING,
    });
  });

  it("should handle minecraft version filter change", () => {
    render(<ServerFilters {...mockProps} showFilters={true} />);

    const versionSelect = screen.getByLabelText("Version");
    fireEvent.change(versionSelect, { target: { value: "1.21.6" } });

    expect(mockProps.onFilterChange).toHaveBeenCalledWith({
      minecraftVersion: "1.21.6",
    });
  });

  it("should handle sort by change", () => {
    render(<ServerFilters {...mockProps} showFilters={true} />);

    const sortSelect = screen.getByLabelText("Sort By");
    fireEvent.change(sortSelect, { target: { value: "name" } });

    expect(mockProps.onFilterChange).toHaveBeenCalledWith({
      sortBy: "name",
    });
  });

  it("should handle sort order toggle", () => {
    render(<ServerFilters {...mockProps} showFilters={true} />);

    const sortOrderButton = screen.getByRole("button", { name: /descending/i });
    fireEvent.click(sortOrderButton);

    expect(mockProps.onFilterChange).toHaveBeenCalledWith({
      sortOrder: "asc",
    });
  });

  it("should show reset button when filters are active", () => {
    render(
      <ServerFilters
        {...mockProps}
        hasActiveFilters={true}
        showFilters={true}
      />
    );

    const resetButton = screen.getByRole("button", { name: "Reset Filters" });
    expect(resetButton).toBeInTheDocument();

    fireEvent.click(resetButton);
    expect(mockProps.onResetFilters).toHaveBeenCalled();
  });

  it("should not show reset button when no filters are active", () => {
    render(<ServerFilters {...mockProps} showFilters={true} />);

    expect(
      screen.queryByRole("button", { name: "Reset Filters" })
    ).not.toBeInTheDocument();
  });

  it("should show filtered count when different from total", () => {
    render(<ServerFilters {...mockProps} filteredCount={3} />);

    expect(screen.getByText("Showing 3 of 5")).toBeInTheDocument();
  });

  it("should render available minecraft versions in dropdown", () => {
    render(<ServerFilters {...mockProps} showFilters={true} />);

    // Check that all versions are available as options
    mockAvailableVersions.forEach((version) => {
      expect(screen.getByRole("option", { name: version })).toBeInTheDocument();
    });
  });

  it("should render server type options correctly", () => {
    render(<ServerFilters {...mockProps} showFilters={true} />);

    // Check that server type options are available
    expect(screen.getByRole("option", { name: "Vanilla" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Paper" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Forge" })).toBeInTheDocument();
  });

  it("should render server status options correctly", () => {
    render(<ServerFilters {...mockProps} showFilters={true} />);

    // Check that status options are available
    expect(screen.getByRole("option", { name: "Running" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Stopped" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Error" })).toBeInTheDocument();
  });

  it("should show filter indicator when filters are active", () => {
    render(<ServerFilters {...mockProps} hasActiveFilters={true} />);

    // Should show some indicator that filters are active (badge, icon, etc.)
    expect(screen.getByTestId("filter-indicator")).toBeInTheDocument();
  });
});
