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
  "backups.restore": "Restore",
  "backups.restoreConfirmation":
    "Are you sure you want to restore backup '{name}'? This will replace your current world data.",
  "backups.errors.backupNameRequired": "Backup name is required",
  "errors.failedToLoadBackups": "Failed to load backups",
  "errors.operationFailed": "Failed to {action}",
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
      id: "backup-1",
      serverId: "1",
      name: "Test Backup",
      size: 1024000,
      createdAt: "2024-01-01T00:00:00Z",
      isAutomatic: false,
    },
    {
      id: "backup-2",
      serverId: "1",
      name: "Auto Backup",
      size: 2048000,
      createdAt: "2024-01-02T00:00:00Z",
      isAutomatic: true,
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
        id: "new-backup",
        serverId: "1",
        name: "New Backup",
        size: 512000,
        createdAt: "2024-01-03T00:00:00Z",
        isAutomatic: false,
      })
    );
    vi.mocked(serverService.restoreBackup).mockResolvedValue(ok(undefined));
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

  it("handles backup settings changes with save button", async () => {
    render(<ServerBackups serverId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Backups")).toBeInTheDocument();
    });

    const enableCheckbox = screen.getByRole("checkbox");
    fireEvent.click(enableCheckbox);

    // Save button should appear after making changes
    await waitFor(() => {
      expect(screen.getByText("Save")).toBeInTheDocument();
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
  });

  it("shows cancel button when settings are changed", async () => {
    render(<ServerBackups serverId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Backups")).toBeInTheDocument();
    });

    const enableCheckbox = screen.getByRole("checkbox");
    fireEvent.click(enableCheckbox);

    // Both save and cancel buttons should appear
    await waitFor(() => {
      expect(screen.getByText("Save")).toBeInTheDocument();
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    // Buttons should disappear after canceling
    await waitFor(() => {
      expect(screen.queryByText("Save")).not.toBeInTheDocument();
      expect(screen.queryByText("Cancel")).not.toBeInTheDocument();
    });

    // Settings should not have been saved
    expect(serverService.updateBackupSettings).not.toHaveBeenCalled();
  });

  it("handles backup restoration with confirmation", async () => {
    vi.mocked(window.confirm).mockReturnValue(true);

    render(<ServerBackups serverId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Test Backup")).toBeInTheDocument();
    });

    const restoreButtons = screen.getAllByText("Restore");
    fireEvent.click(restoreButtons[0]);

    expect(window.confirm).toHaveBeenCalledWith(
      "Are you sure you want to restore backup 'Test Backup'? This will replace your current world data."
    );

    await waitFor(() => {
      expect(serverService.restoreBackup).toHaveBeenCalledWith("backup-1");
    });
  });

  it("cancels backup restoration when not confirmed", async () => {
    vi.mocked(window.confirm).mockReturnValue(false);

    render(<ServerBackups serverId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Test Backup")).toBeInTheDocument();
    });

    const restoreButtons = screen.getAllByText("Restore");
    fireEvent.click(restoreButtons[0]);

    expect(window.confirm).toHaveBeenCalled();
    expect(serverService.restoreBackup).not.toHaveBeenCalled();
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
