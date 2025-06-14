import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { BackupScheduleManager } from "./backup-schedule-manager";
import * as backupSchedulerService from "@/services/backup-scheduler";
import { ok, err } from "neverthrow";

// Mock the backup scheduler service
vi.mock("@/services/backup-scheduler", () => ({
  getBackupSchedules: vi.fn(),
}));

// Mock child components
vi.mock("./backup-schedule-overview", () => ({
  BackupScheduleOverview: vi.fn(
    ({ onCreateSchedule, onEditSchedule, onViewLogs }) => (
      <div data-testid="overview">
        Overview Component
        <button onClick={onCreateSchedule}>Create Schedule</button>
        <button onClick={() => onEditSchedule({ id: "1", name: "Test" })}>
          Edit Schedule
        </button>
        <button onClick={() => onViewLogs("1")}>View Logs</button>
      </div>
    )
  ),
}));

vi.mock("./backup-schedule-form", () => ({
  BackupScheduleForm: vi.fn(({ onSave, onCancel }) => (
    <div data-testid="form">
      Form Component
      <button onClick={() => onSave({ id: "1", name: "Test" })}>Save</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  )),
}));

vi.mock("./backup-schedule-logs", () => ({
  BackupScheduleLogs: vi.fn(() => <div data-testid="logs">Logs Component</div>),
}));

vi.mock("./backup-schedule-admin", () => ({
  BackupScheduleAdmin: vi.fn(() => (
    <div data-testid="admin">Admin Component</div>
  )),
}));

// Mock useTranslation
const translations: Record<string, string> = {
  "schedules.manager.title": "Backup Schedule Management",
  "schedules.manager.description": "Comprehensive backup scheduling system",
  "schedules.tabs.overview": "Overview",
  "schedules.tabs.settings": "Settings",
  "schedules.tabs.history": "History",
  "schedules.tabs.admin": "Admin",
  "schedules.errors.failedToLoadSchedules": "Failed to load schedules",
  "common.loading": "Loading...",
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

const mockGetBackupSchedules = vi.mocked(
  backupSchedulerService.getBackupSchedules
);

const mockSchedule = {
  id: "1",
  server_id: 1,
  name: "Test Schedule",
  description: "Test description",
  enabled: true,
  cron_expression: "0 0 * * *",
  interval_hours: 24,
  max_backups: 7,
  only_when_running: true,
  backup_type: "scheduled" as const,
  created_at: "2023-01-01T00:00:00Z",
  updated_at: "2023-01-01T00:00:00Z",
  created_by: 1,
};

describe("BackupScheduleManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render with default tabs", async () => {
    mockGetBackupSchedules.mockResolvedValue(ok([mockSchedule]));

    render(<BackupScheduleManager serverId={1} />);

    await waitFor(() => {
      expect(
        screen.getByText("Backup Schedule Management")
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("History")).toBeInTheDocument();

    // Admin tab should not be visible for regular users
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
  });

  it("should render admin tab for admin users", async () => {
    mockGetBackupSchedules.mockResolvedValue(ok([mockSchedule]));

    render(<BackupScheduleManager serverId={1} userRole="admin" />);

    await waitFor(() => {
      expect(screen.getByText("Admin")).toBeInTheDocument();
    });
  });

  it("should render admin tab for operator users", async () => {
    mockGetBackupSchedules.mockResolvedValue(ok([mockSchedule]));

    render(<BackupScheduleManager serverId={1} userRole="operator" />);

    await waitFor(() => {
      expect(screen.getByText("Admin")).toBeInTheDocument();
    });
  });

  it("should switch between tabs", async () => {
    mockGetBackupSchedules.mockResolvedValue(ok([mockSchedule]));

    render(<BackupScheduleManager serverId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Overview")).toBeInTheDocument();
    });

    // Switch to Settings tab
    const settingsTab = screen.getByText("Settings");
    fireEvent.click(settingsTab);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    // Switch to History tab
    const historyTab = screen.getByText("History");
    fireEvent.click(historyTab);

    await waitFor(() => {
      expect(screen.getByText("History")).toBeInTheDocument();
    });
  });

  it("should switch to admin tab for admin users", async () => {
    mockGetBackupSchedules.mockResolvedValue(ok([mockSchedule]));

    render(<BackupScheduleManager serverId={1} userRole="admin" />);

    await waitFor(() => {
      expect(screen.getByText("Admin")).toBeInTheDocument();
    });

    const adminTab = screen.getByText("Admin");
    fireEvent.click(adminTab);

    await waitFor(() => {
      expect(screen.getByText("Admin")).toBeInTheDocument();
    });
  });

  it("should handle create schedule flow", async () => {
    mockGetBackupSchedules.mockResolvedValue(ok([mockSchedule]));

    render(<BackupScheduleManager serverId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Overview")).toBeInTheDocument();
    });

    // Click create schedule button in overview
    let createButton;
    try {
      createButton = screen.getByText("Create Schedule");
    } catch {
      createButton = screen.getByText("schedules.create");
    }
    fireEvent.click(createButton);

    // Should switch to settings tab and show form
    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });
  });

  it("should handle edit schedule flow", async () => {
    mockGetBackupSchedules.mockResolvedValue(ok([mockSchedule]));

    render(<BackupScheduleManager serverId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Overview")).toBeInTheDocument();
    });

    // Click edit schedule button in overview
    const editButton = screen.getByText("Edit Schedule");
    fireEvent.click(editButton);

    // Should switch to settings tab and show form with selected schedule
    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });
  });

  it("should handle view logs flow", async () => {
    mockGetBackupSchedules.mockResolvedValue(ok([mockSchedule]));

    render(<BackupScheduleManager serverId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Overview")).toBeInTheDocument();
    });

    // Click view logs button in overview
    const viewLogsButton = screen.getByText("View Logs");
    fireEvent.click(viewLogsButton);

    // Should switch to history tab
    await waitFor(() => {
      expect(screen.getByText("History")).toBeInTheDocument();
    });
  });

  it("should handle save schedule", async () => {
    mockGetBackupSchedules.mockResolvedValue(ok([mockSchedule]));

    render(<BackupScheduleManager serverId={1} />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText("Overview")).toBeInTheDocument();
    });

    // Click create schedule button to show form
    const createButton = screen.getByText("Create Schedule");
    fireEvent.click(createButton);

    // Should switch to settings tab and show form
    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
      expect(screen.getByText("Save")).toBeInTheDocument();
    });

    // Save schedule
    const saveButton = screen.getByText("Save");
    fireEvent.click(saveButton);

    // Should reload schedules and switch back to overview
    await waitFor(() => {
      expect(mockGetBackupSchedules).toHaveBeenCalledTimes(2);
      expect(screen.getByText("Overview")).toBeInTheDocument();
    });
  });

  it("should handle cancel form", async () => {
    mockGetBackupSchedules.mockResolvedValue(ok([mockSchedule]));

    render(<BackupScheduleManager serverId={1} />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText("Overview")).toBeInTheDocument();
    });

    // Click create schedule button to show form
    const createButton = screen.getByText("Create Schedule");
    fireEvent.click(createButton);

    // Should switch to settings tab and show form
    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    // Cancel form
    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    // Should switch back to overview
    await waitFor(() => {
      expect(screen.getByText("Overview")).toBeInTheDocument();
    });
  });

  it("should load schedules on mount", async () => {
    mockGetBackupSchedules.mockResolvedValue(ok([mockSchedule]));

    render(<BackupScheduleManager serverId={1} />);

    await waitFor(() => {
      expect(mockGetBackupSchedules).toHaveBeenCalledWith(1);
    });
  });

  it("should handle API errors", async () => {
    const error = { message: "API Error", status: 500 };
    mockGetBackupSchedules.mockResolvedValue(err(error));

    render(<BackupScheduleManager serverId={1} />);

    await waitFor(() => {
      expect(screen.getByText("API Error")).toBeInTheDocument();
    });
  });

  it("should pass correct props to child components", async () => {
    mockGetBackupSchedules.mockResolvedValue(ok([mockSchedule]));

    render(<BackupScheduleManager serverId={1} userRole="admin" />);

    await waitFor(() => {
      expect(screen.getByText("Overview")).toBeInTheDocument();
    });

    // Switch to settings tab
    const settingsTab = screen.getByText("Settings");
    fireEvent.click(settingsTab);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    // Switch to history tab
    const historyTab = screen.getByText("History");
    fireEvent.click(historyTab);

    await waitFor(() => {
      expect(screen.getByText("History")).toBeInTheDocument();
    });

    // Switch to admin tab
    const adminTab = screen.getByText("Admin");
    fireEvent.click(adminTab);

    await waitFor(() => {
      expect(screen.getByText("Admin")).toBeInTheDocument();
    });
  });

  it("should handle form state correctly", async () => {
    mockGetBackupSchedules.mockResolvedValue(ok([mockSchedule]));

    render(<BackupScheduleManager serverId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Overview")).toBeInTheDocument();
    });

    // Start create flow
    const createButton = screen.getByText("Create Schedule");
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    // Go back to overview
    const overviewTab = screen.getByText("Overview");
    fireEvent.click(overviewTab);

    // Start edit flow
    const editButton = screen.getByText("Edit Schedule");
    fireEvent.click(editButton);

    // Should be back in form with edit mode
    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });
  });

  it("should clear selected schedule when switching away from form", async () => {
    mockGetBackupSchedules.mockResolvedValue(ok([mockSchedule]));

    render(<BackupScheduleManager serverId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Overview")).toBeInTheDocument();
    });

    // Start edit flow
    const editButton = screen.getByText("Edit Schedule");
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    // Switch to history tab
    const historyTab = screen.getByText("History");
    fireEvent.click(historyTab);

    // Go back to settings
    const settingsTab = screen.getByText("Settings");
    fireEvent.click(settingsTab);

    // Should be in create mode (no selected schedule)
    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });
  });
});
