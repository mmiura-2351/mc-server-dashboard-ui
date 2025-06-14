import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { BackupScheduleOverview } from "./backup-schedule-overview";
import * as backupSchedulerService from "@/services/backup-scheduler";
import { ok, err } from "neverthrow";

// Mock the backup scheduler service
vi.mock("@/services/backup-scheduler", () => ({
  getBackupSchedules: vi.fn(),
  getSchedulerStatus: vi.fn(),
  enableBackupSchedule: vi.fn(),
  disableBackupSchedule: vi.fn(),
  triggerBackupSchedule: vi.fn(),
  deleteBackupSchedule: vi.fn(),
}));

// Mock useTranslation
const translations: Record<string, string> = {
  "common.loading": "Loading...",
  "common.refresh": "Refresh",
  "schedules.overview.title": "Backup Schedules Overview",
  "schedules.overview.description": "View and manage all backup schedules",
  "schedules.overview.schedulesList": "Active Schedules",
  "schedules.overview.noSchedulesFound": "No backup schedules found",
  "schedules.overview.interval": "Interval",
  "schedules.overview.maxBackups": "Max Backups",
  "schedules.overview.nextRun": "Next Run",
  "schedules.create": "Create Schedule",
  "schedules.createFirst": "Create First Schedule",
  "schedules.scheduler.title": "Scheduler Status",
  "schedules.scheduler.status": "Status",
  "schedules.scheduler.running": "Running",
  "schedules.scheduler.stopped": "Stopped",
  "schedules.scheduler.totalSchedules": "Total Schedules",
  "schedules.scheduler.activeSchedules": "Active Schedules",
  "schedules.scheduler.runningJobs": "Running Jobs",
  "schedules.status.enabled": "Enabled",
  "schedules.status.disabled": "Disabled",
  "schedules.status.never": "Never",
  "schedules.status.nextRunInDays": "In {days} days",
  "schedules.status.nextRunInHours": "In {hours} hours",
  "schedules.status.nextRunInMinutes": "In {minutes} minutes",
  "schedules.enable": "Enable",
  "schedules.disable": "Disable",
  "schedules.runNow": "Run Now",
  "schedules.edit": "Edit",
  "schedules.viewLogs": "View Logs",
  "schedules.delete": "Delete",
  "schedules.deleteConfirmation":
    "Are you sure you want to delete schedule '{name}'?",
  "schedules.errors.failedToLoadSchedules": "Failed to load schedules",
  "schedules.errors.failedToToggleSchedule":
    "Failed to toggle schedule '{name}'",
  "schedules.errors.failedToTriggerSchedule":
    "Failed to trigger schedule '{name}'",
  "schedules.errors.failedToDeleteSchedule":
    "Failed to delete schedule '{name}'",
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
const mockGetSchedulerStatus = vi.mocked(
  backupSchedulerService.getSchedulerStatus
);
// const mockEnableBackupSchedule = vi.mocked(backupSchedulerService.enableBackupSchedule);
const mockDisableBackupSchedule = vi.mocked(
  backupSchedulerService.disableBackupSchedule
);
const mockTriggerBackupSchedule = vi.mocked(
  backupSchedulerService.triggerBackupSchedule
);
const mockDeleteBackupSchedule = vi.mocked(
  backupSchedulerService.deleteBackupSchedule
);

const mockSchedule = {
  id: "1",
  server_id: 1,
  name: "Daily Backup",
  description: "Daily backup schedule",
  enabled: true,
  cron_expression: "0 0 * * *",
  interval_hours: 24,
  max_backups: 7,
  only_when_running: true,
  backup_type: "scheduled" as const,
  created_at: "2023-01-01T00:00:00Z",
  updated_at: "2023-01-01T00:00:00Z",
  next_run_at: "2023-01-02T00:00:00Z",
  created_by: 1,
};

const mockSchedulerStatus = {
  running: true,
  total_schedules: 1,
  active_schedules: 1,
  last_check_at: "2023-01-01T00:00:00Z",
  next_check_at: "2023-01-01T01:00:00Z",
  current_jobs: [],
};

describe("BackupScheduleOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.confirm
    global.confirm = vi.fn(() => true);
  });

  it("should render loading state initially", () => {
    mockGetBackupSchedules.mockImplementation(() => new Promise(() => {}));
    mockGetSchedulerStatus.mockImplementation(() => new Promise(() => {}));

    render(<BackupScheduleOverview />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("should render schedules and scheduler status after loading", async () => {
    mockGetBackupSchedules.mockResolvedValue(ok([mockSchedule]));
    mockGetSchedulerStatus.mockResolvedValue(ok(mockSchedulerStatus));

    render(<BackupScheduleOverview />);

    await waitFor(() => {
      expect(screen.getByText("Backup Schedules Overview")).toBeInTheDocument();
    });

    expect(screen.getByText("Scheduler Status")).toBeInTheDocument();
    expect(screen.getByText("Running")).toBeInTheDocument();
    expect(screen.getByText("Daily Backup")).toBeInTheDocument();
    expect(screen.getByText("Enabled")).toBeInTheDocument();
  });

  it("should render no schedules message when empty", async () => {
    const mockOnCreateSchedule = vi.fn();
    mockGetBackupSchedules.mockResolvedValue(ok([]));
    mockGetSchedulerStatus.mockResolvedValue(ok(mockSchedulerStatus));

    render(<BackupScheduleOverview onCreateSchedule={mockOnCreateSchedule} />);

    await waitFor(() => {
      expect(screen.getByText("No backup schedules found")).toBeInTheDocument();
    });

    expect(screen.getByText("Create First Schedule")).toBeInTheDocument();
  });

  it("should call onCreateSchedule when create button is clicked", async () => {
    const mockOnCreateSchedule = vi.fn();
    mockGetBackupSchedules.mockResolvedValue(ok([]));
    mockGetSchedulerStatus.mockResolvedValue(ok(mockSchedulerStatus));

    render(<BackupScheduleOverview onCreateSchedule={mockOnCreateSchedule} />);

    await waitFor(() => {
      expect(screen.getByText("Create Schedule")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Create Schedule"));
    expect(mockOnCreateSchedule).toHaveBeenCalled();
  });

  it("should toggle schedule when enable/disable button is clicked", async () => {
    mockGetBackupSchedules.mockResolvedValue(ok([mockSchedule]));
    mockGetSchedulerStatus.mockResolvedValue(ok(mockSchedulerStatus));
    mockDisableBackupSchedule.mockResolvedValue(
      ok({
        ...mockSchedule,
        enabled: false,
      })
    );

    render(<BackupScheduleOverview />);

    await waitFor(() => {
      expect(screen.getByText("Daily Backup")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Disable"));

    await waitFor(() => {
      expect(mockDisableBackupSchedule).toHaveBeenCalledWith("1");
    });
  });

  it("should trigger schedule when run now button is clicked", async () => {
    mockGetBackupSchedules.mockResolvedValue(ok([mockSchedule]));
    mockGetSchedulerStatus.mockResolvedValue(ok(mockSchedulerStatus));
    mockTriggerBackupSchedule.mockResolvedValue(ok(undefined));

    render(<BackupScheduleOverview />);

    await waitFor(() => {
      expect(screen.getByText("Daily Backup")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Run Now"));

    await waitFor(() => {
      expect(mockTriggerBackupSchedule).toHaveBeenCalledWith("1");
    });
  });

  it("should delete schedule when delete button is clicked and confirmed", async () => {
    mockGetBackupSchedules.mockResolvedValue(ok([mockSchedule]));
    mockGetSchedulerStatus.mockResolvedValue(ok(mockSchedulerStatus));
    mockDeleteBackupSchedule.mockResolvedValue(ok(undefined));

    render(<BackupScheduleOverview />);

    await waitFor(() => {
      expect(screen.getByText("Daily Backup")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Delete"));

    expect(global.confirm).toHaveBeenCalledWith(
      "Are you sure you want to delete schedule 'Daily Backup'?"
    );

    await waitFor(() => {
      expect(mockDeleteBackupSchedule).toHaveBeenCalledWith("1");
    });
  });

  it("should not delete schedule when delete is not confirmed", async () => {
    global.confirm = vi.fn(() => false);

    mockGetBackupSchedules.mockResolvedValue(ok([mockSchedule]));
    mockGetSchedulerStatus.mockResolvedValue(ok(mockSchedulerStatus));

    render(<BackupScheduleOverview />);

    await waitFor(() => {
      expect(screen.getByText("Daily Backup")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Delete"));

    expect(global.confirm).toHaveBeenCalled();
    expect(mockDeleteBackupSchedule).not.toHaveBeenCalled();
  });

  it("should call onEditSchedule when edit button is clicked", async () => {
    const mockOnEditSchedule = vi.fn();
    mockGetBackupSchedules.mockResolvedValue(ok([mockSchedule]));
    mockGetSchedulerStatus.mockResolvedValue(ok(mockSchedulerStatus));

    render(<BackupScheduleOverview onEditSchedule={mockOnEditSchedule} />);

    await waitFor(() => {
      expect(screen.getByText("Daily Backup")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Edit"));
    expect(mockOnEditSchedule).toHaveBeenCalledWith(mockSchedule);
  });

  it("should call onViewLogs when view logs button is clicked", async () => {
    const mockOnViewLogs = vi.fn();
    mockGetBackupSchedules.mockResolvedValue(ok([mockSchedule]));
    mockGetSchedulerStatus.mockResolvedValue(ok(mockSchedulerStatus));

    render(<BackupScheduleOverview onViewLogs={mockOnViewLogs} />);

    await waitFor(() => {
      expect(screen.getByText("Daily Backup")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("View Logs"));
    expect(mockOnViewLogs).toHaveBeenCalledWith("1");
  });

  it("should display error message when API calls fail", async () => {
    const error = { message: "API Error", status: 500 };
    mockGetBackupSchedules.mockResolvedValue(err(error));
    mockGetSchedulerStatus.mockResolvedValue(ok(mockSchedulerStatus));

    render(<BackupScheduleOverview />);

    await waitFor(() => {
      expect(screen.getByText("API Error")).toBeInTheDocument();
    });
  });

  it("should filter schedules by server ID when provided", async () => {
    const serverId = 1;
    mockGetBackupSchedules.mockResolvedValue(ok([mockSchedule]));
    mockGetSchedulerStatus.mockResolvedValue(ok(mockSchedulerStatus));

    render(<BackupScheduleOverview serverId={serverId} />);

    await waitFor(() => {
      expect(mockGetBackupSchedules).toHaveBeenCalledWith(serverId);
    });
  });

  it("should format next run time correctly", async () => {
    const futureSchedule = {
      ...mockSchedule,
      next_run_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
    };

    mockGetBackupSchedules.mockResolvedValue(ok([futureSchedule]));
    mockGetSchedulerStatus.mockResolvedValue(ok(mockSchedulerStatus));

    render(<BackupScheduleOverview />);

    await waitFor(() => {
      expect(screen.getByText("Daily Backup")).toBeInTheDocument();
    });

    // Should display "In 2 hours" or similar
    expect(screen.getByText(/In \d+ hours/)).toBeInTheDocument();
  });

  it("should disable buttons when actions are in progress", async () => {
    mockGetBackupSchedules.mockResolvedValue(ok([mockSchedule]));
    mockGetSchedulerStatus.mockResolvedValue(ok(mockSchedulerStatus));

    // Mock a slow API call
    mockDisableBackupSchedule.mockImplementation(() => new Promise(() => {}));

    render(<BackupScheduleOverview />);

    await waitFor(() => {
      expect(screen.getByText("Daily Backup")).toBeInTheDocument();
    });

    const disableButton = screen.getByText("Disable");
    fireEvent.click(disableButton);

    // Button should be disabled while action is in progress
    await waitFor(() => {
      expect(disableButton).toBeDisabled();
    });
  });
});
