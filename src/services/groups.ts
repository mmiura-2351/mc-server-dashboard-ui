import { Result, ok, err } from "neverthrow";
import { fetchWithErrorHandling } from "@/services/api";
import type { AuthError } from "@/types/auth";

// Group types
export interface Group {
  id: number;
  name: string;
  description: string | null;
  type: "op" | "whitelist";
  players: GroupPlayer[];
  owner_id: number;
  is_template: boolean;
  created_at: string;
  updated_at: string;
}

export interface GroupPlayer {
  uuid: string;
  username: string;
  added_at: string | null;
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
  group_type: "op" | "whitelist";
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
}

export interface AddPlayerRequest {
  uuid?: string;
  username?: string;
  player_name?: string;
}

export interface AttachServerRequest {
  server_id: number;
  priority?: number;
}

export interface AttachedServer {
  id: number;
  name: string;
  status: string;
  priority: number;
  attached_at: string;
}

export interface AttachedGroup {
  id: number;
  name: string;
  description: string | null;
  type: string;
  priority: number;
  attached_at: string;
  player_count: number;
}

export interface GroupListResponse {
  groups: Group[];
}

export interface GroupServersResponse {
  servers: AttachedServer[];
}

export interface ServerGroupsResponse {
  groups: AttachedGroup[];
}

// Group Management API
export async function getGroups(
  groupType?: "op" | "whitelist"
): Promise<Result<Group[], AuthError>> {
  const params = groupType ? `?group_type=${groupType}` : "";
  const result = await fetchWithErrorHandling<GroupListResponse>(
    `/api/v1/groups${params}`
  );

  if (result.isErr()) {
    return err(result.error);
  }

  return ok(result.value.groups);
}

export async function getGroup(
  groupId: number
): Promise<Result<Group, AuthError>> {
  return fetchWithErrorHandling<Group>(`/api/v1/groups/${groupId}`);
}

export async function createGroup(
  request: CreateGroupRequest
): Promise<Result<Group, AuthError>> {
  return fetchWithErrorHandling<Group>("/api/v1/groups", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });
}

export async function updateGroup(
  groupId: number,
  request: UpdateGroupRequest
): Promise<Result<Group, AuthError>> {
  return fetchWithErrorHandling<Group>(`/api/v1/groups/${groupId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });
}

export async function deleteGroup(
  groupId: number
): Promise<Result<void, AuthError>> {
  const result = await fetchWithErrorHandling<void>(
    `/api/v1/groups/${groupId}`,
    {
      method: "DELETE",
    }
  );

  if (result.isErr()) {
    return err(result.error);
  }

  return ok(undefined);
}

// Player Management
export async function addPlayerToGroup(
  groupId: number,
  request: AddPlayerRequest
): Promise<Result<Group, AuthError>> {
  return fetchWithErrorHandling<Group>(`/api/v1/groups/${groupId}/players`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });
}

export async function removePlayerFromGroup(
  groupId: number,
  playerUuid: string
): Promise<Result<Group, AuthError>> {
  return fetchWithErrorHandling<Group>(
    `/api/v1/groups/${groupId}/players/${playerUuid}`,
    {
      method: "DELETE",
    }
  );
}

// Server Attachment
export async function attachGroupToServer(
  groupId: number,
  request: AttachServerRequest
): Promise<Result<{ message: string }, AuthError>> {
  return fetchWithErrorHandling<{ message: string }>(
    `/api/v1/groups/${groupId}/servers`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    }
  );
}

export async function detachGroupFromServer(
  groupId: number,
  serverId: number
): Promise<Result<{ message: string }, AuthError>> {
  return fetchWithErrorHandling<{ message: string }>(
    `/api/v1/groups/${groupId}/servers/${serverId}`,
    {
      method: "DELETE",
    }
  );
}

export async function getGroupServers(
  groupId: number
): Promise<Result<AttachedServer[], AuthError>> {
  const result = await fetchWithErrorHandling<GroupServersResponse>(
    `/api/v1/groups/${groupId}/servers`
  );

  if (result.isErr()) {
    return err(result.error);
  }

  return ok(result.value.servers);
}

export async function getServerGroups(
  serverId: number
): Promise<Result<AttachedGroup[], AuthError>> {
  const result = await fetchWithErrorHandling<ServerGroupsResponse>(
    `/api/v1/groups/servers/${serverId}`
  );

  if (result.isErr()) {
    return err(result.error);
  }

  return ok(result.value.groups);
}
