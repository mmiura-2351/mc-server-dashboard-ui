import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { BackupScheduleForm } from "./backup-schedule-form";
import * as backupSchedulerService from "@/services/backup-scheduler";
import { ok, err } from "neverthrow";

// Mock the backup scheduler service
vi.mock("@/services/backup-scheduler", () => ({
  createBackupSchedule: vi.fn(),
  updateBackupSchedule: vi.fn(),
  generateCronExpression: vi.fn(),
  getNextRunTime: vi.fn(),
}));

// Mock useTranslation
const translations: Record<string, string> = {
  "schedules.form.createTitle": "Create New Schedule",
  "schedules.form.editTitle": "Edit Schedule",
  "schedules.form.formDescription": "Configure your backup schedule settings",
  "schedules.form.basicInfo": "Basic Information",
  "schedules.form.name": "Schedule Name",
  "schedules.form.namePlaceholder": "Enter schedule name",
  "schedules.form.description": "Description",
  "schedules.form.descriptionPlaceholder": "Optional description",
  "schedules.form.enabled": "Enabled",
  "schedules.form.scheduleConfig": "Schedule Configuration",
  "schedules.form.intervalType": "Interval Type",
  "schedules.form.presetInterval": "Preset Interval",
  "schedules.form.customCron": "Custom Cron",
  "schedules.form.interval": "Interval",
  "schedules.form.cronExpression": "Cron Expression",
  "schedules.form.cronHelp":
    "Standard cron format: minute hour day month weekday",
  "schedules.form.nextRunPreview": "Next Run",
  "schedules.form.nextRunUnknown": "Unknown",
  "schedules.form.backupOptions": "Backup Options",
  "schedules.form.maxBackups": "Max Backups",
  "schedules.form.maxBackupsHelp": "Maximum number of backups to keep",
  "schedules.form.onlyWhenRunning": "Only backup when server is running",
  "schedules.form.onlyWhenRunningHelp": "Skip backup if server is offline",
  "schedules.form.createSchedule": "Create Schedule",
  "schedules.form.updateSchedule": "Update Schedule",
  "schedules.intervals.hourly": "Every Hour",
  "schedules.intervals.6hours": "Every 6 Hours",
  "schedules.intervals.12hours": "Every 12 Hours",
  "schedules.intervals.daily": "Daily",
  "schedules.intervals.2days": "Every 2 Days",
  "schedules.intervals.weekly": "Weekly",
  "schedules.validation.nameRequired": "Name is required",
  "schedules.validation.nameTooLong": "Name is too long",
  "schedules.validation.descriptionTooLong": "Description is too long",
  "schedules.validation.cronRequired": "Cron expression is required",
  "schedules.validation.cronInvalid": "Invalid cron expression",
  "schedules.validation.maxBackupsRange":
    "Max backups must be between 1 and 100",
  "schedules.validation.serverRequired": "Server is required",
  "schedules.errors.failedToCreateSchedule": "Failed to create schedule",
  "schedules.errors.failedToUpdateSchedule": "Failed to update schedule",
  "common.cancel": "Cancel",
  "common.saving": "Saving...",
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

const mockCreateBackupSchedule = vi.mocked(
  backupSchedulerService.createBackupSchedule
);
const mockUpdateBackupSchedule = vi.mocked(
  backupSchedulerService.updateBackupSchedule
);
const mockGenerateCronExpression = vi.mocked(
  backupSchedulerService.generateCronExpression
);
const mockGetNextRunTime = vi.mocked(backupSchedulerService.getNextRunTime);

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

describe("BackupScheduleForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateCronExpression.mockReturnValue("0 0 * * *");
    mockGetNextRunTime.mockReturnValue(new Date("2023-01-02T00:00:00Z"));
  });

  it("should render create form by default", () => {
    render(<BackupScheduleForm serverId={1} />);

    expect(screen.getByText("Create New Schedule")).toBeInTheDocument();
    expect(screen.getByText("Create Schedule")).toBeInTheDocument();
  });

  it("should render edit form when schedule is provided", () => {
    render(<BackupScheduleForm serverId={1} schedule={mockSchedule} />);

    expect(screen.getByText("Edit Schedule")).toBeInTheDocument();
    expect(screen.getByText("Update Schedule")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Test Schedule")).toBeInTheDocument();
  });

  it("should validate required fields", async () => {
    render(<BackupScheduleForm serverId={1} />);

    const submitButton = screen.getByText("Create Schedule");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Name is required")).toBeInTheDocument();
    });
  });

  it("should validate name length", async () => {
    render(<BackupScheduleForm serverId={1} />);

    const nameInput = screen.getByPlaceholderText("Enter schedule name");
    fireEvent.change(nameInput, { target: { value: "a".repeat(101) } });

    const submitButton = screen.getByText("Create Schedule");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Name is too long")).toBeInTheDocument();
    });
  });

  it("should validate description length", async () => {
    render(<BackupScheduleForm serverId={1} />);

    const nameInput = screen.getByPlaceholderText("Enter schedule name");
    fireEvent.change(nameInput, { target: { value: "Valid Name" } });

    const descriptionInput = screen.getByPlaceholderText(
      "Optional description"
    );
    fireEvent.change(descriptionInput, { target: { value: "a".repeat(501) } });

    const submitButton = screen.getByText("Create Schedule");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Description is too long")).toBeInTheDocument();
    });
  });

  it("should validate custom cron expression", async () => {
    render(<BackupScheduleForm serverId={1} />);

    const nameInput = screen.getByPlaceholderText("Enter schedule name");
    fireEvent.change(nameInput, { target: { value: "Valid Name" } });

    const customRadio = screen.getByDisplayValue("custom");
    fireEvent.click(customRadio);

    const submitButton = screen.getByText("Create Schedule");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("Cron expression is required")
      ).toBeInTheDocument();
    });
  });

  it("should validate cron expression format", async () => {
    render(<BackupScheduleForm serverId={1} />);

    const nameInput = screen.getByPlaceholderText("Enter schedule name");
    fireEvent.change(nameInput, { target: { value: "Valid Name" } });

    const customRadio = screen.getByDisplayValue("custom");
    fireEvent.click(customRadio);

    const cronInput = screen.getByPlaceholderText("0 */6 * * *");
    fireEvent.change(cronInput, { target: { value: "invalid cron" } });

    const submitButton = screen.getByText("Create Schedule");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Invalid cron expression")).toBeInTheDocument();
    });
  });

  it("should validate max backups range", async () => {
    render(<BackupScheduleForm serverId={1} />);

    const nameInput = screen.getByPlaceholderText("Enter schedule name");
    fireEvent.change(nameInput, { target: { value: "Valid Name" } });

    const maxBackupsInput = screen.getByDisplayValue("7");
    fireEvent.change(maxBackupsInput, { target: { value: "0" } });

    const submitButton = screen.getByText("Create Schedule");
    fireEvent.click(submitButton);

    await waitFor(() => {
      // The form should show a general error message when validation fails
      expect(screen.getByText("Failed to create schedule")).toBeInTheDocument();
    });
  });

  it("should create schedule successfully", async () => {
    const mockOnSave = vi.fn();
    mockCreateBackupSchedule.mockResolvedValue(ok(mockSchedule));

    render(<BackupScheduleForm serverId={1} onSave={mockOnSave} />);

    const nameInput = screen.getByPlaceholderText("Enter schedule name");
    fireEvent.change(nameInput, { target: { value: "Test Schedule" } });

    const submitButton = screen.getByText("Create Schedule");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateBackupSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          server_id: 1,
          name: "Test Schedule",
          enabled: true,
          max_backups: 7,
          only_when_running: true,
          interval_hours: 24,
          cron_expression: "0 0 * * *",
        })
      );
      expect(mockOnSave).toHaveBeenCalledWith(mockSchedule);
    });
  });

  it("should update schedule successfully", async () => {
    const mockOnSave = vi.fn();
    mockUpdateBackupSchedule.mockResolvedValue(ok(mockSchedule));

    render(
      <BackupScheduleForm
        serverId={1}
        schedule={mockSchedule}
        onSave={mockOnSave}
      />
    );

    const nameInput = screen.getByDisplayValue("Test Schedule");
    fireEvent.change(nameInput, { target: { value: "Updated Schedule" } });

    const submitButton = screen.getByText("Update Schedule");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockUpdateBackupSchedule).toHaveBeenCalledWith(
        "1",
        expect.objectContaining({
          name: "Updated Schedule",
        })
      );
      expect(mockOnSave).toHaveBeenCalledWith(mockSchedule);
    });
  });

  it("should handle API errors", async () => {
    const error = { message: "API Error", status: 500 };
    mockCreateBackupSchedule.mockResolvedValue(err(error));

    render(<BackupScheduleForm serverId={1} />);

    const nameInput = screen.getByPlaceholderText("Enter schedule name");
    fireEvent.change(nameInput, { target: { value: "Test Schedule" } });

    const submitButton = screen.getByText("Create Schedule");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("API Error")).toBeInTheDocument();
    });
  });

  it("should call onCancel when cancel button is clicked", () => {
    const mockOnCancel = vi.fn();

    render(<BackupScheduleForm serverId={1} onCancel={mockOnCancel} />);

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it("should clear field errors when user starts typing", async () => {
    render(<BackupScheduleForm serverId={1} />);

    const submitButton = screen.getByText("Create Schedule");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Name is required")).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText("Enter schedule name");
    fireEvent.change(nameInput, { target: { value: "Test" } });

    await waitFor(() => {
      expect(screen.queryByText("Name is required")).not.toBeInTheDocument();
    });
  });

  it("should show next run preview for preset intervals", () => {
    render(<BackupScheduleForm serverId={1} />);

    expect(screen.getByText(/Next Run:/)).toBeInTheDocument();
  });

  it("should switch between preset and custom intervals", () => {
    render(<BackupScheduleForm serverId={1} />);

    // Default should be preset
    expect(screen.getByDisplayValue("Daily")).toBeInTheDocument();

    // Switch to custom
    const customRadio = screen.getByDisplayValue("custom");
    fireEvent.click(customRadio);

    expect(screen.getByPlaceholderText("0 */6 * * *")).toBeInTheDocument();

    // Switch back to preset
    const presetRadio = screen.getByDisplayValue("preset");
    fireEvent.click(presetRadio);

    expect(screen.getByDisplayValue("Daily")).toBeInTheDocument();
  });

  it("should populate form when schedule changes", () => {
    const { rerender } = render(<BackupScheduleForm serverId={1} />);

    expect(screen.getByText("Create New Schedule")).toBeInTheDocument();

    rerender(<BackupScheduleForm serverId={1} schedule={mockSchedule} />);

    expect(screen.getByText("Edit Schedule")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Test Schedule")).toBeInTheDocument();
  });
});
