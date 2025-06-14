import { ok, err, type Result } from "neverthrow";
import type {
  BackupSchedule,
  BackupScheduleCreateRequest,
  BackupScheduleUpdateRequest,
  BackupScheduleLog,
  SchedulerStatus,
} from "@/types/server";
import type { AuthError } from "@/types/auth";
import { fetchEmpty, fetchJson } from "@/services/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Schedule Management
export async function getBackupSchedules(
  serverId?: number
): Promise<Result<BackupSchedule[], AuthError>> {
  const url = serverId
    ? `${API_BASE_URL}/api/v1/backup-scheduler/schedules?server_id=${serverId}`
    : `${API_BASE_URL}/api/v1/backup-scheduler/schedules`;

  const result = await fetchJson<
    BackupSchedule[] | { schedules: BackupSchedule[] }
  >(url);
  if (result.isErr()) {
    // Return empty array if API is not implemented yet
    console.warn("Backup scheduler API not available, returning empty array");
    return ok([]);
  }

  // Handle both array response and object with schedules property
  if (Array.isArray(result.value)) {
    return ok(result.value);
  }
  return ok(result.value.schedules || []);
}

export async function getBackupSchedule(
  scheduleId: string
): Promise<Result<BackupSchedule, AuthError>> {
  return fetchJson<BackupSchedule>(
    `${API_BASE_URL}/api/v1/backup-scheduler/schedules/${scheduleId}`
  );
}

export async function createBackupSchedule(
  data: BackupScheduleCreateRequest
): Promise<Result<BackupSchedule, AuthError>> {
  return fetchJson<BackupSchedule>(
    `${API_BASE_URL}/api/v1/backup-scheduler/schedules`,
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

export async function updateBackupSchedule(
  scheduleId: string,
  data: BackupScheduleUpdateRequest
): Promise<Result<BackupSchedule, AuthError>> {
  return fetchJson<BackupSchedule>(
    `${API_BASE_URL}/api/v1/backup-scheduler/schedules/${scheduleId}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    }
  );
}

export async function deleteBackupSchedule(
  scheduleId: string
): Promise<Result<void, AuthError>> {
  return fetchEmpty(
    `${API_BASE_URL}/api/v1/backup-scheduler/schedules/${scheduleId}`,
    {
      method: "DELETE",
    }
  );
}

export async function enableBackupSchedule(
  scheduleId: string
): Promise<Result<BackupSchedule, AuthError>> {
  return fetchJson<BackupSchedule>(
    `${API_BASE_URL}/api/v1/backup-scheduler/schedules/${scheduleId}/enable`,
    {
      method: "POST",
    }
  );
}

export async function disableBackupSchedule(
  scheduleId: string
): Promise<Result<BackupSchedule, AuthError>> {
  return fetchJson<BackupSchedule>(
    `${API_BASE_URL}/api/v1/backup-scheduler/schedules/${scheduleId}/disable`,
    {
      method: "POST",
    }
  );
}

export async function triggerBackupSchedule(
  scheduleId: string
): Promise<Result<void, AuthError>> {
  return fetchEmpty(
    `${API_BASE_URL}/api/v1/backup-scheduler/schedules/${scheduleId}/trigger`,
    {
      method: "POST",
    }
  );
}

// Schedule Logs
export async function getBackupScheduleLogs(
  scheduleId?: string,
  serverId?: number,
  limit?: number,
  offset?: number
): Promise<Result<{ logs: BackupScheduleLog[]; total: number }, AuthError>> {
  const url = new URL(`${API_BASE_URL}/api/v1/backup-scheduler/logs`);

  if (scheduleId) {
    url.searchParams.set("schedule_id", scheduleId);
  }
  if (serverId !== undefined) {
    url.searchParams.set("server_id", serverId.toString());
  }
  if (limit !== undefined) {
    url.searchParams.set("limit", limit.toString());
  }
  if (offset !== undefined) {
    url.searchParams.set("offset", offset.toString());
  }

  const result = await fetchJson<{
    logs: BackupScheduleLog[];
    total: number;
    page: number;
    size: number;
  }>(url.toString());

  if (result.isErr()) {
    return err(result.error);
  }

  return ok({
    logs: result.value.logs || [],
    total: result.value.total || 0,
  });
}

export async function getBackupScheduleLog(
  logId: string
): Promise<Result<BackupScheduleLog, AuthError>> {
  return fetchJson<BackupScheduleLog>(
    `${API_BASE_URL}/api/v1/backup-scheduler/logs/${logId}`
  );
}

// Scheduler Status and Management
export async function getSchedulerStatus(): Promise<
  Result<SchedulerStatus, AuthError>
> {
  const result = await fetchJson<SchedulerStatus>(
    `${API_BASE_URL}/api/v1/backup-scheduler/scheduler/status`
  );

  if (result.isErr()) {
    // Return default status if API is not implemented yet
    console.warn(
      "Scheduler status API not available, returning default status"
    );
    return ok({
      running: false,
      total_schedules: 0,
      active_schedules: 0,
      current_jobs: [],
    });
  }

  // Ensure current_jobs is always an array
  const status = {
    ...result.value,
    current_jobs: result.value.current_jobs || [],
  };
  return ok(status);
}

export async function startScheduler(): Promise<Result<void, AuthError>> {
  return fetchEmpty(`${API_BASE_URL}/api/v1/backup-scheduler/scheduler/start`, {
    method: "POST",
  });
}

export async function stopScheduler(): Promise<Result<void, AuthError>> {
  return fetchEmpty(`${API_BASE_URL}/api/v1/backup-scheduler/scheduler/stop`, {
    method: "POST",
  });
}

export async function restartScheduler(): Promise<Result<void, AuthError>> {
  return fetchEmpty(
    `${API_BASE_URL}/api/v1/backup-scheduler/scheduler/restart`,
    {
      method: "POST",
    }
  );
}

// Utility functions for schedule management
export function parseScheduleInterval(cronExpression: string): number | null {
  // Parse common cron expressions to interval hours
  // This is a simplified parser for common patterns

  // Every hour: "0 * * * *"
  if (cronExpression === "0 * * * *") return 1;

  // Every N hours: "0 */N * * *"
  const hourlyMatch = cronExpression.match(/^0 \*\/(\d+) \* \* \*$/);
  if (hourlyMatch && hourlyMatch[1]) return parseInt(hourlyMatch[1]);

  // Daily: "0 0 * * *"
  if (cronExpression === "0 0 * * *") return 24;

  // Every N days: "0 0 */N * *"
  const dailyMatch = cronExpression.match(/^0 0 \*\/(\d+) \* \*$/);
  if (dailyMatch && dailyMatch[1]) return parseInt(dailyMatch[1]) * 24;

  // Weekly: "0 0 * * 0"
  if (cronExpression === "0 0 * * 0") return 168;

  return null;
}

export function generateCronExpression(intervalHours: number): string {
  // Generate cron expressions for common intervals
  switch (intervalHours) {
    case 1:
      return "0 * * * *"; // Every hour
    case 6:
      return "0 */6 * * *"; // Every 6 hours
    case 12:
      return "0 */12 * * *"; // Every 12 hours
    case 24:
      return "0 0 * * *"; // Daily at midnight
    case 48:
      return "0 0 */2 * *"; // Every 2 days
    case 168:
      return "0 0 * * 0"; // Weekly on Sunday
    default:
      // For other intervals, use daily pattern
      return "0 0 * * *";
  }
}

export function getNextRunTime(cronExpression: string): Date | null {
  // This is a simplified implementation
  // In a real application, you might want to use a proper cron parser library
  const now = new Date();
  const intervalHours = parseScheduleInterval(cronExpression);

  if (intervalHours) {
    const nextRun = new Date(now.getTime() + intervalHours * 60 * 60 * 1000);
    return nextRun;
  }

  return null;
}

export function formatScheduleDuration(durationSeconds?: number): string {
  if (!durationSeconds) return "N/A";

  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  const seconds = durationSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}
