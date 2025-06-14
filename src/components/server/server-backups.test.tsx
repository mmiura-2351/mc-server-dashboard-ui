import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { ServerBackups } from "./server-backups";
import * as serverService from "@/services/server";
import { ok, err } from "neverthrow";

// Mock the server service
vi.mock("@/services/server", () => ({
  getServerBackups: vi.fn(),
  getBackupSettings: vi.fn(),
  createBackup: vi.fn(),
  restoreBackup: vi.fn(),
  advancedRestoreBackup: vi.fn(),
  downloadBackup: vi.fn(),
  deleteBackup: vi.fn(),
  updateBackupSettings: vi.fn(),
}));

// Mock useTranslation
const translations: Record<string, string> = {
  "common.loading": "Loading...",
  "common.save": "Save",
  "common.saving": "Saving...",
  "common.cancel": "Cancel",
  "servers.backups": "Backups",
  "backups.description": "Manage your server backups",
  "backups.settings.title": "Backup Settings",
  "backups.settings.enableAutoBackup": "Enable Automatic Backups",
  "backups.settings.interval": "Backup Interval",
  "backups.settings.maxBackups": "Maximum Backups to Keep",
  "backups.intervals.6hours": "Every 6 hours",
  "backups.intervals.12hours": "Every 12 hours",
  "backups.intervals.24hours": "Every 24 hours",
  "backups.intervals.48hours": "Every 48 hours",
  "backups.intervals.weekly": "Weekly",
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
  "backups.settings.edit": "Edit Settings",
  "backups.settings.status": "Status",
  "backups.settings.enabled": "Enabled",
  "backups.settings.disabled": "Disabled",
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

  const mockBackupSettings = {
    enabled: true,
    interval: 24,
    maxBackups: 7,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(serverService.getServerBackups).mockResolvedValue(
      ok(mockBackups)
    );
    vi.mocked(serverService.getBackupSettings).mockResolvedValue(
      ok(mockBackupSettings)
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
    vi.mocked(serverService.updateBackupSettings).mockResolvedValue(
      ok(undefined)
    );
  });

  it("renders backup interface correctly", async () => {
    render(<ServerBackups serverId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Backups")).toBeInTheDocument();
    });

    expect(screen.getByText("Backup Settings")).toBeInTheDocument();
    expect(screen.getByText("Create New Backup")).toBeInTheDocument();
    expect(screen.getByText("Existing Backups")).toBeInTheDocument();
  });

  it("displays loading state initially", () => {
    render(<ServerBackups serverId={1} />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("displays backup list after loading", async () => {
    render(<ServerBackups serverId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Test Backup")).toBeInTheDocument();
    });

    expect(screen.getByText("Auto Backup")).toBeInTheDocument();
    expect(screen.getByText("Auto")).toBeInTheDocument(); // automatic badge
    expect(screen.getAllByText("Actions")).toHaveLength(2); // action dropdown buttons for both backups
    expect(screen.getByText("Edit Settings")).toBeInTheDocument(); // edit button in readonly mode
  });

  it("handles backup creation", async () => {
    render(<ServerBackups serverId={1} />);

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
    render(<ServerBackups serverId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Backups")).toBeInTheDocument();
    });

    const createButton = screen.getByText("Create Backup");
    expect(createButton).toBeDisabled();
  });

  it("displays readonly mode initially and switches to edit mode", async () => {
    render(<ServerBackups serverId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Backups")).toBeInTheDocument();
    });

    // Should show readonly view initially
    expect(screen.getByText("Edit Settings")).toBeInTheDocument();
    expect(screen.getByText("Enabled")).toBeInTheDocument(); // shows enabled status

    // Should not show form controls initially
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();

    // Click edit button
    const editButton = screen.getByText("Edit Settings");
    fireEvent.click(editButton);

    // Should now show edit form and action buttons
    await waitFor(() => {
      expect(screen.getByRole("checkbox")).toBeInTheDocument();
      expect(screen.getByText("Cancel")).toBeInTheDocument();
      expect(screen.getByText("Save")).toBeInTheDocument();
    });

    // Edit button should be hidden
    expect(screen.queryByText("Edit Settings")).not.toBeInTheDocument();

    // Save button should be disabled initially (no changes)
    expect(screen.getByText("Save")).toBeDisabled();
  });

  it("handles backup settings changes with save button", async () => {
    render(<ServerBackups serverId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Backups")).toBeInTheDocument();
    });

    // Enter edit mode
    const editButton = screen.getByText("Edit Settings");
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByRole("checkbox")).toBeInTheDocument();
    });

    // Save button should be disabled initially
    expect(screen.getByText("Save")).toBeDisabled();

    const enableCheckbox = screen.getByRole("checkbox");
    fireEvent.click(enableCheckbox);

    // Save button should be enabled after making changes
    await waitFor(() => {
      expect(screen.getByText("Save")).not.toBeDisabled();
    });

    const saveButton = screen.getByText("Save");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(serverService.updateBackupSettings).toHaveBeenCalledWith(1, {
        enabled: false, // toggled from true to false
        interval: 24,
        maxBackups: 7,
      });
    });

    // Should return to readonly mode after save
    await waitFor(() => {
      expect(screen.getByText("Edit Settings")).toBeInTheDocument();
    });
  });

  it("shows cancel button when settings are changed", async () => {
    render(<ServerBackups serverId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Backups")).toBeInTheDocument();
    });

    // Enter edit mode
    const editButton = screen.getByText("Edit Settings");
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByRole("checkbox")).toBeInTheDocument();
    });

    // Both save and cancel buttons should be visible in edit mode
    expect(screen.getByText("Save")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();

    // Save should be disabled initially
    expect(screen.getByText("Save")).toBeDisabled();

    const enableCheckbox = screen.getByRole("checkbox");
    fireEvent.click(enableCheckbox);

    // Save button should be enabled after making changes
    await waitFor(() => {
      expect(screen.getByText("Save")).not.toBeDisabled();
    });

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    // Should return to readonly mode after cancel
    await waitFor(() => {
      expect(screen.getByText("Edit Settings")).toBeInTheDocument();
    });

    // Buttons should disappear after canceling
    expect(screen.queryByText("Save")).not.toBeInTheDocument();
    expect(screen.queryByText("Cancel")).not.toBeInTheDocument();

    // Settings should not have been saved
    expect(serverService.updateBackupSettings).not.toHaveBeenCalled();
  });

  it("handles backup restoration with confirmation", async () => {
    vi.mocked(window.confirm).mockReturnValue(true);

    render(<ServerBackups serverId={1} />);

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

    render(<ServerBackups serverId={1} />);

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

    render(<ServerBackups serverId={1} />);

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

    render(<ServerBackups serverId={1} />);

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

    render(<ServerBackups serverId={1} />);

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

    render(<ServerBackups serverId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load backups")).toBeInTheDocument();
    });
  });

  it("displays error when backup deletion fails", async () => {
    vi.mocked(serverService.deleteBackup).mockResolvedValue(
      err({ message: "Backup deletion failed" })
    );
    vi.mocked(window.confirm).mockReturnValue(true);

    render(<ServerBackups serverId={1} />);

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

    render(<ServerBackups serverId={1} />);

    await waitFor(() => {
      expect(
        screen.getByText(
          "No backups found. Create your first backup to get started!"
        )
      ).toBeInTheDocument();
    });
  });
});
