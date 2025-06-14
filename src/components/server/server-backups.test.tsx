import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { vi } from "vitest";
import { ServerBackups } from "./server-backups";
import * as serverService from "@/services/server";
import { ok, err } from "neverthrow";

// Mock the server service
vi.mock("@/services/server", () => ({
  getServerBackups: vi.fn(),
  createBackup: vi.fn(),
  restoreBackup: vi.fn(),
  advancedRestoreBackup: vi.fn(),
  downloadBackup: vi.fn(),
  deleteBackup: vi.fn(),
}));

// Mock useTranslation
const translations: Record<string, string> = {
  "common.loading": "Loading...",
  "common.save": "Save",
  "common.saving": "Saving...",
  "common.cancel": "Cancel",
  "servers.backups": "Backups",
  "backups.description": "Manage your server backups",
  "backups.createBackup": "Create New Backup",
  "backups.backupNamePlaceholder": "Enter backup name...",
  "backups.create": "Create Backup",
  "backups.creating": "Creating...",
  "backups.existingBackups": "Existing Backups",
  "backups.noBackupsFound":
    "No backups found. Create your first backup to get started!",
  "backups.automatic": "Auto",
  "backups.download": "Download",
  "backups.downloading": "Downloading...",
  "backups.actions": "Actions",
  "backups.restore": "Restore",
  "backups.restoring": "Restoring...",
  "backups.advancedRestore": "Advanced Restore",
  "backups.delete": "Delete",
  "backups.restoreConfirmation":
    "Are you sure you want to restore backup '{name}'? This will replace your current world data.",
  "backups.advancedRestoreConfirmation":
    "Restore backup '{name}' with advanced options? This will preserve player data and settings while restoring the world.",
  "backups.deleteConfirmation":
    "Are you sure you want to delete backup '{name}'? This action cannot be undone.",
  "backups.errors.backupNameRequired": "Backup name is required",
  "errors.failedToLoadBackups": "Failed to load backups",
  "errors.operationFailed": "Failed to {action}",
  "common.unknown": "Unknown",
  "backups.creatingDescription":
    "Please wait while your backup is being created. This may take a few minutes depending on your world size.",
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

vi.mock("@/contexts/language", () => ({
  useTranslation: () => ({ t: mockT, locale: "en" }),
}));

// Mock window.confirm
Object.defineProperty(window, "confirm", {
  writable: true,
  value: vi.fn(),
});

describe("ServerBackups", () => {
  const mockBackups = [
    {
      id: 1,
      server_id: 1,
      name: "Test Backup",
      description: "Test backup description",
      size_bytes: 1024000,
      created_at: "2024-01-01T00:00:00Z",
      backup_type: "manual" as const,
      file_path: "/backups/backup-1.tar.gz",
    },
    {
      id: 2,
      server_id: 1,
      name: "Auto Backup",
      description: "Scheduled backup",
      size_bytes: 2048000,
      created_at: "2024-01-02T00:00:00Z",
      backup_type: "scheduled" as const,
      file_path: "/backups/backup-2.tar.gz",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(serverService.getServerBackups).mockResolvedValue(
      ok(mockBackups)
    );
    vi.mocked(serverService.createBackup).mockResolvedValue(
      ok({
        id: 3,
        server_id: 1,
        name: "New Backup",
        description: "Newly created backup",
        size_bytes: 512000,
        created_at: "2024-01-03T00:00:00Z",
        backup_type: "manual" as const,
        file_path: "/backups/new-backup.tar.gz",
      })
    );
    vi.mocked(serverService.restoreBackup).mockResolvedValue(ok(undefined));
    vi.mocked(serverService.deleteBackup).mockResolvedValue(ok(undefined));
  });

  it("renders backup interface correctly", async () => {
    await act(async () => {
      render(<ServerBackups serverId={1} />);
    });

    await waitFor(() => {
      expect(screen.getByText("Backups")).toBeInTheDocument();
    });

    expect(screen.getByText("Create New Backup")).toBeInTheDocument();
    expect(screen.getByText("Existing Backups")).toBeInTheDocument();
  });

  it("displays loading state initially", async () => {
    act(() => {
      render(<ServerBackups serverId={1} />);
    });
    expect(screen.getByText("Loading...")).toBeInTheDocument();

    // Wait for loading to complete to prevent act warnings
    await waitFor(() => {
      expect(screen.getByText("Backups")).toBeInTheDocument();
    });
  });

  it("displays backup list after loading", async () => {
    await act(async () => {
      render(<ServerBackups serverId={1} />);
    });

    await waitFor(() => {
      expect(screen.getByText("Test Backup")).toBeInTheDocument();
    });

    expect(screen.getByText("Auto Backup")).toBeInTheDocument();
    expect(screen.getByText("Auto")).toBeInTheDocument(); // automatic badge
    expect(screen.getAllByText("Actions")).toHaveLength(2); // action dropdown buttons for both backups

    // Check that backup sizes are displayed correctly
    expect(screen.getByText("1000 KB")).toBeInTheDocument(); // First backup: 1024000 bytes
    expect(screen.getByText("1.95 MB")).toBeInTheDocument(); // Second backup: 2048000 bytes
  });

  it("handles backup creation", async () => {
    await act(async () => {
      render(<ServerBackups serverId={1} />);
    });

    await waitFor(() => {
      expect(screen.getByText("Backups")).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText("Enter backup name...");
    const createButton = screen.getByText("Create Backup");

    fireEvent.change(nameInput, { target: { value: "New Test Backup" } });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(serverService.createBackup).toHaveBeenCalledWith(
        1,
        "New Test Backup"
      );
    });
  });

  it("prevents backup creation with empty name", async () => {
    await act(async () => {
      render(<ServerBackups serverId={1} />);
    });

    await waitFor(() => {
      expect(screen.getByText("Backups")).toBeInTheDocument();
    });

    const createButton = screen.getByText("Create Backup");
    expect(createButton).toBeDisabled();
  });

  it("handles backup restoration with confirmation", async () => {
    vi.mocked(window.confirm).mockReturnValue(true);

    await act(async () => {
      render(<ServerBackups serverId={1} />);
    });

    await waitFor(() => {
      expect(screen.getByText("Test Backup")).toBeInTheDocument();
    });

    const actionButtons = screen.getAllByText("Actions");
    fireEvent.click(actionButtons[0]!);

    await waitFor(() => {
      expect(screen.getByText("Restore")).toBeInTheDocument();
    });

    const restoreButton = screen.getByText("Restore");
    fireEvent.click(restoreButton);

    expect(window.confirm).toHaveBeenCalledWith(
      "Are you sure you want to restore backup 'Test Backup'? This will replace your current world data."
    );

    await waitFor(() => {
      expect(serverService.restoreBackup).toHaveBeenCalledWith(1);
    });
  });

  it("cancels backup restoration when not confirmed", async () => {
    vi.mocked(window.confirm).mockReturnValue(false);

    await act(async () => {
      render(<ServerBackups serverId={1} />);
    });

    await waitFor(() => {
      expect(screen.getByText("Test Backup")).toBeInTheDocument();
    });

    const actionButtons = screen.getAllByText("Actions");
    fireEvent.click(actionButtons[0]!);

    await waitFor(() => {
      expect(screen.getByText("Restore")).toBeInTheDocument();
    });

    const restoreButton = screen.getByText("Restore");
    fireEvent.click(restoreButton);

    expect(window.confirm).toHaveBeenCalled();
    expect(serverService.restoreBackup).not.toHaveBeenCalled();
  });

  it("handles backup deletion with confirmation", async () => {
    vi.mocked(window.confirm).mockReturnValue(true);

    await act(async () => {
      render(<ServerBackups serverId={1} />);
    });

    await waitFor(() => {
      expect(screen.getByText("Test Backup")).toBeInTheDocument();
    });

    const actionButtons = screen.getAllByText("Actions");
    fireEvent.click(actionButtons[0]!);

    await waitFor(() => {
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    const deleteButton = screen.getByText("Delete");
    fireEvent.click(deleteButton);

    expect(window.confirm).toHaveBeenCalledWith(
      "Are you sure you want to delete backup 'Test Backup'? This action cannot be undone."
    );

    await waitFor(() => {
      expect(serverService.deleteBackup).toHaveBeenCalledWith(1);
    });
  });

  it("cancels backup deletion when not confirmed", async () => {
    vi.mocked(window.confirm).mockReturnValue(false);

    await act(async () => {
      render(<ServerBackups serverId={1} />);
    });

    await waitFor(() => {
      expect(screen.getByText("Test Backup")).toBeInTheDocument();
    });

    const actionButtons = screen.getAllByText("Actions");
    fireEvent.click(actionButtons[0]!);

    await waitFor(() => {
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    const deleteButton = screen.getByText("Delete");
    fireEvent.click(deleteButton);

    expect(window.confirm).toHaveBeenCalled();
    expect(serverService.deleteBackup).not.toHaveBeenCalled();
  });

  it("displays error when backup creation fails", async () => {
    vi.mocked(serverService.createBackup).mockResolvedValue(
      err({ message: "Backup creation failed" })
    );

    await act(async () => {
      render(<ServerBackups serverId={1} />);
    });

    await waitFor(() => {
      expect(screen.getByText("Backups")).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText("Enter backup name...");
    const createButton = screen.getByText("Create Backup");

    fireEvent.change(nameInput, { target: { value: "Failed Backup" } });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText("Backup creation failed")).toBeInTheDocument();
    });
  });

  it("displays error when loading fails", async () => {
    vi.mocked(serverService.getServerBackups).mockResolvedValue(
      err({ message: "Failed to load backups" })
    );

    await act(async () => {
      render(<ServerBackups serverId={1} />);
    });

    await waitFor(() => {
      expect(screen.getByText("Failed to load backups")).toBeInTheDocument();
    });
  });

  it("displays error when backup deletion fails", async () => {
    vi.mocked(serverService.deleteBackup).mockResolvedValue(
      err({ message: "Backup deletion failed" })
    );
    vi.mocked(window.confirm).mockReturnValue(true);

    await act(async () => {
      render(<ServerBackups serverId={1} />);
    });

    await waitFor(() => {
      expect(screen.getByText("Test Backup")).toBeInTheDocument();
    });

    const actionButtons = screen.getAllByText("Actions");
    fireEvent.click(actionButtons[0]!);

    await waitFor(() => {
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    const deleteButton = screen.getByText("Delete");
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText("Backup deletion failed")).toBeInTheDocument();
    });
  });

  it("shows no backups message when list is empty", async () => {
    vi.mocked(serverService.getServerBackups).mockResolvedValue(ok([]));

    await act(async () => {
      render(<ServerBackups serverId={1} />);
    });

    await waitFor(() => {
      expect(
        screen.getByText(
          "No backups found. Create your first backup to get started!"
        )
      ).toBeInTheDocument();
    });
  });

  it("displays 0 B for backups with zero or null size", async () => {
    const backupsWithZeroSize = [
      {
        id: 1,
        server_id: 1,
        name: "Zero Size Backup",
        description: "Backup with zero size",
        size_bytes: 0,
        created_at: "2024-01-01T00:00:00Z",
        backup_type: "manual" as const,
        file_path: "/backups/zero-size.tar.gz",
      },
      {
        id: 2,
        server_id: 1,
        name: "Null Size Backup",
        description: "Backup with null size",
        size_bytes: null as unknown as number,
        created_at: "2024-01-02T00:00:00Z",
        backup_type: "manual" as const,
        file_path: "/backups/null-size.tar.gz",
      },
    ];

    vi.mocked(serverService.getServerBackups).mockResolvedValue(
      ok(backupsWithZeroSize)
    );

    await act(async () => {
      render(<ServerBackups serverId={1} />);
    });

    await waitFor(() => {
      expect(screen.getByText("Zero Size Backup")).toBeInTheDocument();
    });

    expect(screen.getByText("Null Size Backup")).toBeInTheDocument();
    expect(screen.getAllByText("0 B")).toHaveLength(2); // Both backups should show "0 B"
  });

  it("handles backend returning string size_bytes", async () => {
    const backupsWithStringSize = [
      {
        id: 1,
        server_id: 1,
        name: "String Size Backup",
        description: "Backup with string size",
        size_bytes: "1024000", // Backend might return as string
        created_at: "2024-01-01T00:00:00Z",
        backup_type: "manual" as const,
        file_path: "/backups/string-size.tar.gz",
      },
    ];

    vi.mocked(serverService.getServerBackups).mockResolvedValue(
      ok(backupsWithStringSize)
    );

    await act(async () => {
      render(<ServerBackups serverId={1} />);
    });

    await waitFor(() => {
      expect(screen.getByText("String Size Backup")).toBeInTheDocument();
    });

    // Should still display formatted size even if backend returns string
    expect(screen.getByText("1000 KB")).toBeInTheDocument();
  });

  it("handles edge cases for size_bytes values", async () => {
    const backupsWithEdgeCases = [
      {
        id: 1,
        server_id: 1,
        name: "Empty String Backup",
        description: "Backup with empty string size",
        size_bytes: "",
        created_at: "2024-01-01T00:00:00Z",
        backup_type: "manual" as const,
        file_path: "/backups/empty-string.tar.gz",
      },
      {
        id: 2,
        server_id: 1,
        name: "Invalid String Backup",
        description: "Backup with invalid string size",
        size_bytes: "invalid",
        created_at: "2024-01-02T00:00:00Z",
        backup_type: "manual" as const,
        file_path: "/backups/invalid-string.tar.gz",
      },
      {
        id: 3,
        server_id: 1,
        name: "Undefined Backup",
        description: "Backup with undefined size",
        size_bytes: undefined as unknown as number,
        created_at: "2024-01-03T00:00:00Z",
        backup_type: "manual" as const,
        file_path: "/backups/undefined.tar.gz",
      },
    ];

    vi.mocked(serverService.getServerBackups).mockResolvedValue(
      ok(backupsWithEdgeCases)
    );

    await act(async () => {
      render(<ServerBackups serverId={1} />);
    });

    await waitFor(() => {
      expect(screen.getByText("Empty String Backup")).toBeInTheDocument();
    });

    expect(screen.getByText("Invalid String Backup")).toBeInTheDocument();
    expect(screen.getByText("Undefined Backup")).toBeInTheDocument();
    expect(screen.getAllByText("0 B")).toHaveLength(3); // All should show "0 B"
  });
});
