import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { BackupScheduleAdmin } from "./backup-schedule-admin";
import * as backupSchedulerService from "@/services/backup-scheduler";
import * as serverService from "@/services/server";
import { ServerType, ServerStatus } from "@/types/server";
import { ok, err } from "neverthrow";

// Mock the services
vi.mock("@/services/backup-scheduler", () => ({
  getBackupSchedules: vi.fn(),
  getSchedulerStatus: vi.fn(),
  getBackupScheduleLogs: vi.fn(),
  startScheduler: vi.fn(),
  stopScheduler: vi.fn(),
  restartScheduler: vi.fn(),
  enableBackupSchedule: vi.fn(),
  disableBackupSchedule: vi.fn(),
  deleteBackupSchedule: vi.fn(),
  formatScheduleDuration: vi.fn(),
}));

vi.mock("@/services/server", () => ({
  getServers: vi.fn(),
}));

// Mock useTranslation
const translations: Record<string, string> = {
  "common.loading": "Loading...",
  "common.refresh": "Refresh",
  "schedules.admin.title": "Schedule Administration",
  "schedules.admin.description": "System-wide backup schedule management",
  "schedules.admin.systemStats": "System Statistics",
  "schedules.admin.schedulerControl": "Scheduler Control",
  "schedules.admin.allSchedules": "All Schedules",
  "schedules.admin.recentActivity": "Recent Activity",
  "schedules.admin.stats.totalServers": "Total Servers",
  "schedules.admin.stats.serversWithSchedules": "Servers with Schedules",
  "schedules.admin.stats.totalSchedules": "Total Schedules",
  "schedules.admin.stats.activeSchedules": "Active Schedules",
  "schedules.admin.stats.backupsToday": "Backups Today",
  "schedules.admin.stats.averageBackupSize": "Average Backup Size",
  "schedules.admin.schedulerStatus": "Scheduler Status",
  "schedules.admin.running": "Running",
  "schedules.admin.stopped": "Stopped",
  "schedules.admin.lastCheck": "Last Check",
  "schedules.admin.nextCheck": "Next Check",
  "schedules.admin.startScheduler": "Start Scheduler",
  "schedules.admin.stopScheduler": "Stop Scheduler",
  "schedules.admin.restartScheduler": "Restart Scheduler",
  "schedules.admin.enableAll": "Enable All",
  "schedules.admin.disableAll": "Disable All",
  "schedules.admin.enabled": "Enabled",
  "schedules.admin.disabled": "Disabled",
  "schedules.admin.interval": "Interval",
  "schedules.admin.maxBackups": "Max Backups",
  "schedules.admin.lastRun": "Last Run",
  "schedules.admin.nextRun": "Next Run",
  "schedules.admin.delete": "Delete",
  "schedules.admin.noSchedulesFound": "No schedules found",
  "schedules.admin.noRecentActivity": "No recent activity",
  "schedules.admin.status.success": "Success",
  "schedules.admin.status.failed": "Failed",
  "schedules.admin.status.running": "Running",
  "schedules.admin.status.cancelled": "Cancelled",
  "schedules.admin.enableAllConfirmation": "Enable {count} schedules?",
  "schedules.admin.disableAllConfirmation": "Disable {count} schedules?",
  "schedules.admin.deleteScheduleConfirmation": "Delete schedule '{name}'?",
  "schedules.admin.errors.failedToLoadData": "Failed to load data",
  "schedules.admin.errors.schedulerActionFailed": "Scheduler action failed",
  "schedules.admin.errors.failedToEnableSchedules": "Failed to enable schedules",
  "schedules.admin.errors.failedToDisableSchedules": "Failed to disable schedules",
  "schedules.admin.errors.failedToDeleteSchedule": "Failed to delete schedule",
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
const mockGetBackupScheduleLogs = vi.mocked(
  backupSchedulerService.getBackupScheduleLogs
);
const mockGetServers = vi.mocked(serverService.getServers);
const mockStartScheduler = vi.mocked(backupSchedulerService.startScheduler);
const mockStopScheduler = vi.mocked(backupSchedulerService.stopScheduler);
const mockRestartScheduler = vi.mocked(backupSchedulerService.restartScheduler);
const mockEnableBackupSchedule = vi.mocked(
  backupSchedulerService.enableBackupSchedule
);
const mockDisableBackupSchedule = vi.mocked(
  backupSchedulerService.disableBackupSchedule
);
const mockDeleteBackupSchedule = vi.mocked(
  backupSchedulerService.deleteBackupSchedule
);
const mockFormatScheduleDuration = vi.mocked(
  backupSchedulerService.formatScheduleDuration
);

const mockServer = {
  id: 1,
  name: "Test Server",
  description: "Test server description",
  minecraft_version: "1.20.1",
  server_type: ServerType.VANILLA,
  status: ServerStatus.STOPPED,
  directory_path: "/servers/test",
  port: 25565,
  max_memory: 4096,
  max_players: 20,
  owner_id: 1,
  template_id: null,
  created_at: "2023-01-01T00:00:00Z",
  updated_at: "2023-01-01T00:00:00Z",
};

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
  last_run_at: "2023-01-01T00:00:00Z",
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

const mockLog = {
  id: "log-1",
  schedule_id: "1",
  server_id: 1,
  backup_id: "backup-1",
  status: "success" as const,
  started_at: "2023-01-01T12:00:00Z",
  completed_at: "2023-01-01T12:05:00Z",
  duration_seconds: 300,
  backup_size_bytes: 1024 * 1024 * 10,
  logs: [],
  error_message: undefined,
};

const mockLogsResponse = {
  logs: [mockLog],
  total: 1,
  page: 1,
  size: 10,
};

describe("BackupScheduleAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.confirm = vi.fn(() => true);
    mockFormatScheduleDuration.mockReturnValue("5m 0s");
  });

  it("should render loading state initially", () => {
    mockGetBackupSchedules.mockImplementation(() => new Promise(() => {}));
    mockGetServers.mockImplementation(() => new Promise(() => {}));
    mockGetSchedulerStatus.mockImplementation(() => new Promise(() => {}));
    mockGetBackupScheduleLogs.mockImplementation(() => new Promise(() => {}));

    render(<BackupScheduleAdmin />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("should render admin panel after loading", async () => {
    mockGetBackupSchedules.mockResolvedValue(ok([mockSchedule]));
    mockGetServers.mockResolvedValue(ok([mockServer]));
    mockGetSchedulerStatus.mockResolvedValue(ok(mockSchedulerStatus));
    mockGetBackupScheduleLogs.mockResolvedValue(ok(mockLogsResponse));

    render(<BackupScheduleAdmin />);

    await waitFor(() => {
      expect(screen.getByText("Schedule Administration")).toBeInTheDocument();
    });

    expect(screen.getByText("System Statistics")).toBeInTheDocument();
    expect(screen.getByText("Scheduler Control")).toBeInTheDocument();
    expect(screen.getByText("All Schedules")).toBeInTheDocument();
    expect(screen.getByText("Recent Activity")).toBeInTheDocument();
  });

  it("should display system statistics", async () => {
    mockGetBackupSchedules.mockResolvedValue(ok([mockSchedule]));
    mockGetServers.mockResolvedValue(ok([mockServer]));
    mockGetSchedulerStatus.mockResolvedValue(ok(mockSchedulerStatus));
    mockGetBackupScheduleLogs.mockResolvedValue(ok(mockLogsResponse));

    render(<BackupScheduleAdmin />);

    await waitFor(() => {
      expect(screen.getByText("Total Servers")).toBeInTheDocument();
    });

    expect(screen.getByText("Servers with Schedules")).toBeInTheDocument();
    expect(screen.getByText("Total Schedules")).toBeInTheDocument();
    expect(screen.getByText("Active Schedules")).toBeInTheDocument();
    expect(screen.getByText("Backups Today")).toBeInTheDocument();
    expect(screen.getByText("Average Backup Size")).toBeInTheDocument();
  });

  it("should display scheduler status", async () => {
    mockGetBackupSchedules.mockResolvedValue(ok([mockSchedule]));
    mockGetServers.mockResolvedValue(ok([mockServer]));
    mockGetSchedulerStatus.mockResolvedValue(ok(mockSchedulerStatus));
    mockGetBackupScheduleLogs.mockResolvedValue(ok(mockLogsResponse));

    render(<BackupScheduleAdmin />);

    await waitFor(() => {
      expect(screen.getByText("Running")).toBeInTheDocument();
    });

    expect(screen.getByText("Scheduler Status")).toBeInTheDocument();
  });

  it("should start scheduler when start button is clicked", async () => {
    mockGetBackupSchedules.mockResolvedValue(ok([mockSchedule]));
    mockGetServers.mockResolvedValue(ok([mockServer]));
    mockGetSchedulerStatus.mockResolvedValue(
      ok({ ...mockSchedulerStatus, running: false })
    );
    mockGetBackupScheduleLogs.mockResolvedValue(ok(mockLogsResponse));
    mockStartScheduler.mockResolvedValue(ok(undefined));

    render(<BackupScheduleAdmin />);

    await waitFor(() => {
      expect(screen.getByText("Start Scheduler")).toBeInTheDocument();
    });

    const startButton = screen.getByText("Start Scheduler");
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(mockStartScheduler).toHaveBeenCalled();
    });
  });

  it("should stop scheduler when stop button is clicked", async () => {
    mockGetBackupSchedules.mockResolvedValue(ok([mockSchedule]));
    mockGetServers.mockResolvedValue(ok([mockServer]));
    mockGetSchedulerStatus.mockResolvedValue(ok(mockSchedulerStatus));
    mockGetBackupScheduleLogs.mockResolvedValue(ok(mockLogsResponse));
    mockStopScheduler.mockResolvedValue(ok(undefined));

    render(<BackupScheduleAdmin />);

    await waitFor(() => {
      expect(screen.getByText("Stop Scheduler")).toBeInTheDocument();
    });

    const stopButton = screen.getByText("Stop Scheduler");
    fireEvent.click(stopButton);

    await waitFor(() => {
      expect(mockStopScheduler).toHaveBeenCalled();
    });
  });

  it("should restart scheduler when restart button is clicked", async () => {
    mockGetBackupSchedules.mockResolvedValue(ok([mockSchedule]));
    mockGetServers.mockResolvedValue(ok([mockServer]));
    mockGetSchedulerStatus.mockResolvedValue(ok(mockSchedulerStatus));
    mockGetBackupScheduleLogs.mockResolvedValue(ok(mockLogsResponse));
    mockRestartScheduler.mockResolvedValue(ok(undefined));

    render(<BackupScheduleAdmin />);

    await waitFor(() => {
      expect(screen.getByText("Restart Scheduler")).toBeInTheDocument();
    });

    const restartButton = screen.getByText("Restart Scheduler");
    fireEvent.click(restartButton);

    await waitFor(() => {
      expect(mockRestartScheduler).toHaveBeenCalled();
    });
  });

  it("should enable all schedules when enable all button is clicked", async () => {
    const disabledSchedule = { ...mockSchedule, enabled: false };
    mockGetBackupSchedules.mockResolvedValue(ok([disabledSchedule]));
    mockGetServers.mockResolvedValue(ok([mockServer]));
    mockGetSchedulerStatus.mockResolvedValue(ok(mockSchedulerStatus));
    mockGetBackupScheduleLogs.mockResolvedValue(ok(mockLogsResponse));
    mockEnableBackupSchedule.mockResolvedValue(ok(mockSchedule));

    render(<BackupScheduleAdmin />);

    await waitFor(() => {
      expect(screen.getByText("Enable All")).toBeInTheDocument();
    });

    const enableAllButton = screen.getByText("Enable All");
    fireEvent.click(enableAllButton);

    expect(global.confirm).toHaveBeenCalledWith("Enable 1 schedules?");

    await waitFor(() => {
      expect(mockEnableBackupSchedule).toHaveBeenCalledWith("1");
    });
  });

  it("should disable all schedules when disable all button is clicked", async () => {
    mockGetBackupSchedules.mockResolvedValue(ok([mockSchedule]));
    mockGetServers.mockResolvedValue(ok([mockServer]));
    mockGetSchedulerStatus.mockResolvedValue(ok(mockSchedulerStatus));
    mockGetBackupScheduleLogs.mockResolvedValue(ok(mockLogsResponse));
    mockDisableBackupSchedule.mockResolvedValue(
      ok({ ...mockSchedule, enabled: false })
    );

    render(<BackupScheduleAdmin />);

    await waitFor(() => {
      expect(screen.getByText("Disable All")).toBeInTheDocument();
    });

    const disableAllButton = screen.getByText("Disable All");
    fireEvent.click(disableAllButton);

    expect(global.confirm).toHaveBeenCalledWith("Disable 1 schedules?");

    await waitFor(() => {
      expect(mockDisableBackupSchedule).toHaveBeenCalledWith("1");
    });
  });

  it("should delete schedule when delete button is clicked and confirmed", async () => {
    mockGetBackupSchedules.mockResolvedValue(ok([mockSchedule]));
    mockGetServers.mockResolvedValue(ok([mockServer]));
    mockGetSchedulerStatus.mockResolvedValue(ok(mockSchedulerStatus));
    mockGetBackupScheduleLogs.mockResolvedValue(ok(mockLogsResponse));
    mockDeleteBackupSchedule.mockResolvedValue(ok(undefined));

    render(<BackupScheduleAdmin />);

    await waitFor(() => {
      expect(screen.getByText("All Schedules")).toBeInTheDocument();
    });

    const deleteButton = screen.getByText("Delete");
    fireEvent.click(deleteButton);

    expect(global.confirm).toHaveBeenCalledWith(
      "Delete schedule 'Test Schedule'?"
    );

    await waitFor(() => {
      expect(mockDeleteBackupSchedule).toHaveBeenCalledWith("1");
    });
  });

  it("should not delete schedule when delete is not confirmed", async () => {
    global.confirm = vi.fn(() => false);

    mockGetBackupSchedules.mockResolvedValue(ok([mockSchedule]));
    mockGetServers.mockResolvedValue(ok([mockServer]));
    mockGetSchedulerStatus.mockResolvedValue(ok(mockSchedulerStatus));
    mockGetBackupScheduleLogs.mockResolvedValue(ok(mockLogsResponse));

    render(<BackupScheduleAdmin />);

    await waitFor(() => {
      expect(screen.getByText("All Schedules")).toBeInTheDocument();
    });

    const deleteButton = screen.getByText("Delete");
    fireEvent.click(deleteButton);

    expect(global.confirm).toHaveBeenCalled();
    expect(mockDeleteBackupSchedule).not.toHaveBeenCalled();
  });

  it("should display recent activity", async () => {
    mockGetBackupSchedules.mockResolvedValue(ok([mockSchedule]));
    mockGetServers.mockResolvedValue(ok([mockServer]));
    mockGetSchedulerStatus.mockResolvedValue(ok(mockSchedulerStatus));
    mockGetBackupScheduleLogs.mockResolvedValue(ok(mockLogsResponse));

    render(<BackupScheduleAdmin />);

    await waitFor(() => {
      expect(screen.getByText("Recent Activity")).toBeInTheDocument();
    });

    expect(screen.getByText("Success")).toBeInTheDocument();
  });

  it("should display no schedules message when empty", async () => {
    mockGetBackupSchedules.mockResolvedValue(ok([]));
    mockGetServers.mockResolvedValue(ok([mockServer]));
    mockGetSchedulerStatus.mockResolvedValue(ok(mockSchedulerStatus));
    mockGetBackupScheduleLogs.mockResolvedValue(ok(mockLogsResponse));

    render(<BackupScheduleAdmin />);

    await waitFor(() => {
      expect(screen.getByText("No schedules found")).toBeInTheDocument();
    });
  });

  it("should display no recent activity message when empty", async () => {
    mockGetBackupSchedules.mockResolvedValue(ok([mockSchedule]));
    mockGetServers.mockResolvedValue(ok([mockServer]));
    mockGetSchedulerStatus.mockResolvedValue(ok(mockSchedulerStatus));
    mockGetBackupScheduleLogs.mockResolvedValue(
      ok({ logs: [], total: 0, page: 1, size: 10 })
    );

    render(<BackupScheduleAdmin />);

    await waitFor(() => {
      expect(screen.getByText("No recent activity")).toBeInTheDocument();
    });
  });

  it("should handle individual API failures gracefully", async () => {
    const error = { message: "API Error", status: 500 };
    mockGetBackupSchedules.mockResolvedValue(err(error));
    mockGetServers.mockResolvedValue(ok([mockServer]));
    mockGetSchedulerStatus.mockResolvedValue(ok(mockSchedulerStatus));
    mockGetBackupScheduleLogs.mockResolvedValue(ok(mockLogsResponse));

    render(<BackupScheduleAdmin />);

    await waitFor(() => {
      expect(screen.getByText("Schedule Administration")).toBeInTheDocument();
    });

    // Should still render the component but show no schedules
    expect(screen.getByText("No schedules found")).toBeInTheDocument();
  });

  it("should refresh data when refresh button is clicked", async () => {
    mockGetBackupSchedules.mockResolvedValue(ok([mockSchedule]));
    mockGetServers.mockResolvedValue(ok([mockServer]));
    mockGetSchedulerStatus.mockResolvedValue(ok(mockSchedulerStatus));
    mockGetBackupScheduleLogs.mockResolvedValue(ok(mockLogsResponse));

    render(<BackupScheduleAdmin />);

    await waitFor(() => {
      expect(screen.getByText("Refresh")).toBeInTheDocument();
    });

    const refreshButton = screen.getByText("Refresh");
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockGetBackupSchedules).toHaveBeenCalledTimes(2);
    });
  });

  it("should format file sizes correctly", async () => {
    mockGetBackupSchedules.mockResolvedValue(ok([mockSchedule]));
    mockGetServers.mockResolvedValue(ok([mockServer]));
    mockGetSchedulerStatus.mockResolvedValue(ok(mockSchedulerStatus));
    mockGetBackupScheduleLogs.mockResolvedValue(ok(mockLogsResponse));

    render(<BackupScheduleAdmin />);

    await waitFor(() => {
      expect(screen.getByText("Average Backup Size")).toBeInTheDocument();
    });

    // Should display formatted file size (10MB)
    expect(screen.getAllByText("10 MB")).toHaveLength(2); // One in stats, one in activity
  });

  it("should disable buttons when actions are in progress", async () => {
    mockGetBackupSchedules.mockResolvedValue(ok([mockSchedule]));
    mockGetServers.mockResolvedValue(ok([mockServer]));
    mockGetSchedulerStatus.mockResolvedValue(ok(mockSchedulerStatus));
    mockGetBackupScheduleLogs.mockResolvedValue(ok(mockLogsResponse));

    // Mock a slow API call
    mockStopScheduler.mockImplementation(() => new Promise(() => {}));

    render(<BackupScheduleAdmin />);

    await waitFor(() => {
      expect(screen.getByText("Stop Scheduler")).toBeInTheDocument();
    });

    const stopButton = screen.getByText("Stop Scheduler");
    fireEvent.click(stopButton);

    // Button should be disabled while action is in progress
    await waitFor(() => {
      expect(stopButton).toBeDisabled();
    });
  });
});