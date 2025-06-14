# Backup Scheduler API Requirements

This document outlines the backend API endpoints required for the backup schedule management system.

## Required Endpoints

The backup scheduler frontend requires the following API endpoints to be implemented in the backend:

### Schedule Management

#### Get All Schedules
- **Endpoint**: `GET /api/v1/backup-scheduler/schedules`
- **Query Parameters**: 
  - `server_id` (optional): Filter schedules by server ID
- **Response**: Array of `BackupSchedule` objects

#### Create Schedule
- **Endpoint**: `POST /api/v1/backup-scheduler/schedules`
- **Body**: `BackupScheduleCreateRequest`
- **Response**: Created `BackupSchedule` object

#### Update Schedule
- **Endpoint**: `PUT /api/v1/backup-scheduler/schedules/{schedule_id}`
- **Body**: `BackupScheduleUpdateRequest`
- **Response**: Updated `BackupSchedule` object

#### Delete Schedule
- **Endpoint**: `DELETE /api/v1/backup-scheduler/schedules/{schedule_id}`
- **Response**: 204 No Content

#### Enable Schedule
- **Endpoint**: `POST /api/v1/backup-scheduler/schedules/{schedule_id}/enable`
- **Response**: Updated `BackupSchedule` object

#### Disable Schedule
- **Endpoint**: `POST /api/v1/backup-scheduler/schedules/{schedule_id}/disable`
- **Response**: Updated `BackupSchedule` object

#### Trigger Schedule
- **Endpoint**: `POST /api/v1/backup-scheduler/schedules/{schedule_id}/trigger`
- **Response**: 202 Accepted

### Scheduler Control

#### Get Scheduler Status
- **Endpoint**: `GET /api/v1/backup-scheduler/scheduler/status`
- **Response**: `SchedulerStatus` object

#### Start Scheduler
- **Endpoint**: `POST /api/v1/backup-scheduler/scheduler/start`
- **Response**: 200 OK

#### Stop Scheduler
- **Endpoint**: `POST /api/v1/backup-scheduler/scheduler/stop`
- **Response**: 200 OK

#### Restart Scheduler
- **Endpoint**: `POST /api/v1/backup-scheduler/scheduler/restart`
- **Response**: 200 OK

### Logs and History

#### Get Schedule Logs
- **Endpoint**: `GET /api/v1/backup-scheduler/logs`
- **Query Parameters**:
  - `schedule_id` (optional): Filter logs by schedule ID
  - `server_id` (optional): Filter logs by server ID
  - `limit` (optional): Number of logs to return (default: 20)
  - `offset` (optional): Number of logs to skip (default: 0)
- **Response**: Paginated response with `BackupScheduleLog` objects

## Data Models

### BackupSchedule
```typescript
interface BackupSchedule {
  id: string;
  server_id: number;
  name: string;
  description?: string;
  enabled: boolean;
  cron_expression: string;
  interval_hours?: number;
  max_backups: number;
  only_when_running: boolean;
  backup_type: "scheduled" | "manual";
  created_at: string;
  updated_at: string;
  last_run_at?: string;
  next_run_at?: string;
  created_by: number;
}
```

### BackupScheduleCreateRequest
```typescript
interface BackupScheduleCreateRequest {
  server_id: number;
  name: string;
  description?: string;
  enabled: boolean;
  cron_expression: string;
  interval_hours?: number;
  max_backups: number;
  only_when_running: boolean;
}
```

### BackupScheduleUpdateRequest
```typescript
interface BackupScheduleUpdateRequest {
  name?: string;
  description?: string;
  enabled?: boolean;
  cron_expression?: string;
  interval_hours?: number;
  max_backups?: number;
  only_when_running?: boolean;
}
```

### SchedulerStatus
```typescript
interface SchedulerStatus {
  running: boolean;
  total_schedules: number;
  active_schedules: number;
  last_check_at?: string;
  next_check_at?: string;
  current_jobs: SchedulerJob[];
}
```

### SchedulerJob
```typescript
interface SchedulerJob {
  schedule_id: string;
  server_id: number;
  started_at: string;
  estimated_completion?: string;
}
```

### BackupScheduleLog
```typescript
interface BackupScheduleLog {
  id: string;
  schedule_id: string;
  server_id: number;
  backup_id?: string;
  status: "success" | "failed" | "running" | "cancelled";
  started_at: string;
  completed_at?: string;
  duration_seconds?: number;
  backup_size_bytes?: number;
  logs?: string[];
  error_message?: string;
}
```

### BackupScheduleInterval
```typescript
interface BackupScheduleInterval {
  hours: number;
  label: string;
  cron_expression: string;
}
```

## Authentication & Authorization

All endpoints require:
- JWT authentication via `Authorization: Bearer <token>` header
- Appropriate role-based permissions:
  - **User**: Can view schedules for their assigned servers
  - **Operator**: Can manage schedules for all servers
  - **Admin**: Full access to all scheduler functionality including system control

## Error Responses

All endpoints should return appropriate HTTP status codes and error messages:

- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Schedule conflicts (e.g., duplicate names)
- `500 Internal Server Error`: Server-side errors

Error response format:
```json
{
  "detail": "Error message",
  "status": 400
}
```

## Implementation Priority

### Phase 1 (Critical)
1. Schedule CRUD operations
2. Basic scheduler status
3. Schedule logs retrieval

### Phase 2 (Important)
1. Scheduler control (start/stop/restart)
2. Schedule enable/disable
3. Manual schedule triggering

### Phase 3 (Nice to have)
1. Advanced filtering for logs
2. Real-time status updates via WebSocket
3. Schedule execution statistics

## Testing

The frontend includes comprehensive test coverage for all API interactions. Mock implementations are provided in the test files to verify:

- Correct API endpoint calls
- Proper error handling
- Data transformation and validation
- User permission checks

## Notes

- All timestamps should be in ISO 8601 format
- Cron expressions should follow standard 5-field format: `minute hour day month weekday`
- The system should handle timezone considerations appropriately
- Backup size calculations should be consistent across the system