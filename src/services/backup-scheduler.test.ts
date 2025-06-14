import { describe, it, expect, vi, beforeEach } from "vitest";
import { ok, err } from "neverthrow";
import * as backupSchedulerService from "./backup-scheduler";
import * as api from "./api";

// Mock the API module
vi.mock("./api", () => ({
  fetchJson: vi.fn(),
  fetchEmpty: vi.fn(),
}));

const mockFetchJson = vi.mocked(api.fetchJson);
const mockFetchEmpty = vi.mocked(api.fetchEmpty);

describe("Backup Scheduler Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getBackupSchedules", () => {
    it("should fetch all schedules when no server ID provided", async () => {
      const mockSchedules = [
        {
          id: "1",
          server_id: 1,
          name: "Daily Backup",
          description: "Daily backup schedule",
          enabled: true,
          cron_expression: "0 0 * * *",
          max_backups: 7,
          only_when_running: true,
          backup_type: "scheduled" as const,
          created_at: "2023-01-01T00:00:00Z",
          updated_at: "2023-01-01T00:00:00Z",
          created_by: 1,
        },
      ];

      mockFetchJson.mockResolvedValue(ok({ schedules: mockSchedules }));

      const result = await backupSchedulerService.getBackupSchedules();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(mockSchedules);
      }
      expect(mockFetchJson).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/backup-scheduler/schedules"
      );
    });

    it("should fetch schedules for specific server when server ID provided", async () => {
      const serverId = 1;
      const mockSchedules: never[] = [];

      mockFetchJson.mockResolvedValue(ok({ schedules: mockSchedules }));

      const result = await backupSchedulerService.getBackupSchedules(serverId);

      expect(result.isOk()).toBe(true);
      expect(mockFetchJson).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/backup-scheduler/schedules?server_id=1"
      );
    });

    it("should handle API errors gracefully", async () => {
      const error = { message: "Server error", status: 500 };
      mockFetchJson.mockResolvedValue(err(error));

      const result = await backupSchedulerService.getBackupSchedules();

      // Should return empty array when API is not available
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([]);
      }
    });
  });

  describe("createBackupSchedule", () => {
    it("should create a new backup schedule", async () => {
      const createRequest = {
        server_id: 1,
        name: "Test Schedule",
        description: "Test description",
        enabled: true,
        interval_hours: 24,
        max_backups: 7,
        only_when_running: true,
      };

      const mockSchedule = {
        id: "1",
        ...createRequest,
        cron_expression: "0 0 * * *",
        backup_type: "scheduled" as const,
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-01-01T00:00:00Z",
        created_by: 1,
      };

      mockFetchJson.mockResolvedValue(ok(mockSchedule));

      const result =
        await backupSchedulerService.createBackupSchedule(createRequest);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(mockSchedule);
      }
      expect(mockFetchJson).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/backup-scheduler/schedules",
        {
          method: "POST",
          body: JSON.stringify(createRequest),
        }
      );
    });
  });

  describe("updateBackupSchedule", () => {
    it("should update an existing backup schedule", async () => {
      const scheduleId = "1";
      const updateRequest = {
        name: "Updated Schedule",
        enabled: false,
      };

      const mockUpdatedSchedule = {
        id: scheduleId,
        server_id: 1,
        name: "Updated Schedule",
        enabled: false,
        cron_expression: "0 0 * * *",
        max_backups: 7,
        only_when_running: true,
        backup_type: "scheduled" as const,
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-01-01T01:00:00Z",
        created_by: 1,
      };

      mockFetchJson.mockResolvedValue(ok(mockUpdatedSchedule));

      const result = await backupSchedulerService.updateBackupSchedule(
        scheduleId,
        updateRequest
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(mockUpdatedSchedule);
      }
      expect(mockFetchJson).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/backup-scheduler/schedules/1",
        {
          method: "PUT",
          body: JSON.stringify(updateRequest),
        }
      );
    });
  });

  describe("deleteBackupSchedule", () => {
    it("should delete a backup schedule", async () => {
      const scheduleId = "1";

      mockFetchEmpty.mockResolvedValue(ok(undefined));

      const result =
        await backupSchedulerService.deleteBackupSchedule(scheduleId);

      expect(result.isOk()).toBe(true);
      expect(mockFetchEmpty).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/backup-scheduler/schedules/1",
        {
          method: "DELETE",
        }
      );
    });
  });

  describe("getSchedulerStatus", () => {
    it("should fetch scheduler status", async () => {
      const mockStatus = {
        running: true,
        total_schedules: 5,
        active_schedules: 3,
        last_check_at: "2023-01-01T00:00:00Z",
        next_check_at: "2023-01-01T01:00:00Z",
        current_jobs: [],
      };

      mockFetchJson.mockResolvedValue(ok(mockStatus));

      const result = await backupSchedulerService.getSchedulerStatus();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(mockStatus);
      }
      expect(mockFetchJson).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/backup-scheduler/scheduler/status"
      );
    });

    it("should handle API errors gracefully", async () => {
      const error = { message: "Server error", status: 500 };
      mockFetchJson.mockResolvedValue(err(error));

      const result = await backupSchedulerService.getSchedulerStatus();

      // Should return default status when API is not available
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual({
          running: false,
          total_schedules: 0,
          active_schedules: 0,
          current_jobs: []
        });
      }
    });
  });

  describe("getBackupScheduleLogs", () => {
    it("should fetch schedule logs with filters", async () => {
      const mockLogs = {
        logs: [
          {
            id: "1",
            schedule_id: "1",
            server_id: 1,
            status: "success" as const,
            started_at: "2023-01-01T00:00:00Z",
            completed_at: "2023-01-01T00:05:00Z",
            duration_seconds: 300,
            backup_size_bytes: 1024000,
          },
        ],
        total: 1,
        page: 1,
        size: 20,
      };

      mockFetchJson.mockResolvedValue(ok(mockLogs));

      const result = await backupSchedulerService.getBackupScheduleLogs(
        "1", // scheduleId
        1, // serverId
        20, // limit
        0 // offset
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.logs).toEqual(mockLogs.logs);
        expect(result.value.total).toBe(1);
      }
      expect(mockFetchJson).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/backup-scheduler/logs?schedule_id=1&server_id=1&limit=20&offset=0"
      );
    });
  });

  describe("Scheduler Control", () => {
    it("should start scheduler", async () => {
      mockFetchEmpty.mockResolvedValue(ok(undefined));

      const result = await backupSchedulerService.startScheduler();

      expect(result.isOk()).toBe(true);
      expect(mockFetchEmpty).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/backup-scheduler/scheduler/start",
        { method: "POST" }
      );
    });

    it("should stop scheduler", async () => {
      mockFetchEmpty.mockResolvedValue(ok(undefined));

      const result = await backupSchedulerService.stopScheduler();

      expect(result.isOk()).toBe(true);
      expect(mockFetchEmpty).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/backup-scheduler/scheduler/stop",
        { method: "POST" }
      );
    });

    it("should restart scheduler", async () => {
      mockFetchEmpty.mockResolvedValue(ok(undefined));

      const result = await backupSchedulerService.restartScheduler();

      expect(result.isOk()).toBe(true);
      expect(mockFetchEmpty).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/backup-scheduler/scheduler/restart",
        { method: "POST" }
      );
    });
  });

  describe("Utility Functions", () => {
    describe("parseScheduleInterval", () => {
      it("should parse common cron expressions", () => {
        expect(backupSchedulerService.parseScheduleInterval("0 * * * *")).toBe(
          1
        );
        expect(
          backupSchedulerService.parseScheduleInterval("0 */6 * * *")
        ).toBe(6);
        expect(backupSchedulerService.parseScheduleInterval("0 0 * * *")).toBe(
          24
        );
        expect(
          backupSchedulerService.parseScheduleInterval("0 0 */2 * *")
        ).toBe(48);
        expect(backupSchedulerService.parseScheduleInterval("0 0 * * 0")).toBe(
          168
        );
      });

      it("should return null for unrecognized patterns", () => {
        expect(
          backupSchedulerService.parseScheduleInterval("0 0 1 * *")
        ).toBeNull();
        expect(
          backupSchedulerService.parseScheduleInterval("invalid")
        ).toBeNull();
      });
    });

    describe("generateCronExpression", () => {
      it("should generate correct cron expressions", () => {
        expect(backupSchedulerService.generateCronExpression(1)).toBe(
          "0 * * * *"
        );
        expect(backupSchedulerService.generateCronExpression(6)).toBe(
          "0 */6 * * *"
        );
        expect(backupSchedulerService.generateCronExpression(12)).toBe(
          "0 */12 * * *"
        );
        expect(backupSchedulerService.generateCronExpression(24)).toBe(
          "0 0 * * *"
        );
        expect(backupSchedulerService.generateCronExpression(48)).toBe(
          "0 0 */2 * *"
        );
        expect(backupSchedulerService.generateCronExpression(168)).toBe(
          "0 0 * * 0"
        );
      });

      it("should default to daily for unrecognized intervals", () => {
        expect(backupSchedulerService.generateCronExpression(25)).toBe(
          "0 0 * * *"
        );
        expect(backupSchedulerService.generateCronExpression(0)).toBe(
          "0 0 * * *"
        );
      });
    });

    describe("formatScheduleDuration", () => {
      it("should format duration in seconds", () => {
        expect(backupSchedulerService.formatScheduleDuration(30)).toBe("30s");
        expect(backupSchedulerService.formatScheduleDuration(90)).toBe(
          "1m 30s"
        );
        expect(backupSchedulerService.formatScheduleDuration(3661)).toBe(
          "1h 1m 1s"
        );
        expect(backupSchedulerService.formatScheduleDuration(undefined)).toBe(
          "N/A"
        );
      });
    });

    describe("getNextRunTime", () => {
      it("should calculate next run time for known patterns", () => {
        const now = new Date();
        const nextRun = backupSchedulerService.getNextRunTime("0 * * * *");

        expect(nextRun).toBeInstanceOf(Date);
        if (nextRun) {
          expect(nextRun.getTime()).toBeGreaterThan(now.getTime());
        }
      });

      it("should return null for unrecognized patterns", () => {
        expect(backupSchedulerService.getNextRunTime("invalid")).toBeNull();
      });
    });
  });
});
