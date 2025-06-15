import { describe, it, expect, vi, beforeEach } from "vitest";
import { ok, err } from "neverthrow";
import * as groupService from "./groups";
import type {
  Group,
  CreateGroupRequest,
  UpdateGroupRequest,
  AddPlayerRequest,
  AttachServerRequest,
} from "./groups";

// Mock the fetchWithErrorHandling function
vi.mock("./api", () => ({
  fetchWithErrorHandling: vi.fn(),
}));

import { fetchWithErrorHandling } from "./api";
const mockFetchWithErrorHandling = vi.mocked(fetchWithErrorHandling);

describe("Group Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockGroup: Group = {
    id: 1,
    name: "Test Group",
    description: "Test description",
    type: "whitelist",
    owner_id: 1,
    is_template: false,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    players: [
      {
        uuid: "550e8400-e29b-41d4-a716-446655440000",
        username: "TestPlayer",
        added_at: "2024-01-01T00:00:00Z",
      },
    ],
  };

  const mockAttachedGroup = {
    ...mockGroup,
    priority: 50,
    attached_at: "2024-01-01T00:00:00Z",
    player_count: 1,
  };

  describe("getGroups", () => {
    it("should fetch all groups when no type is specified", async () => {
      mockFetchWithErrorHandling.mockResolvedValue(ok({ groups: [mockGroup] }));

      const result = await groupService.getGroups();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([mockGroup]);
      }
      expect(mockFetchWithErrorHandling).toHaveBeenCalledWith("/api/v1/groups");
    });

    it("should fetch groups filtered by type", async () => {
      mockFetchWithErrorHandling.mockResolvedValue(ok({ groups: [mockGroup] }));

      const result = await groupService.getGroups("whitelist");

      expect(result.isOk()).toBe(true);
      expect(mockFetchWithErrorHandling).toHaveBeenCalledWith(
        "/api/v1/groups?group_type=whitelist"
      );
    });

    it("should handle API errors", async () => {
      const apiError = { status: 500, message: "Server error" };
      mockFetchWithErrorHandling.mockResolvedValue(err(apiError));

      const result = await groupService.getGroups();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toEqual(apiError);
      }
    });
  });

  describe("getGroup", () => {
    it("should fetch a specific group by ID", async () => {
      mockFetchWithErrorHandling.mockResolvedValue(ok(mockGroup));

      const result = await groupService.getGroup(1);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(mockGroup);
      }
      expect(mockFetchWithErrorHandling).toHaveBeenCalledWith(
        "/api/v1/groups/1"
      );
    });

    it("should handle group not found", async () => {
      const apiError = { status: 404, message: "Group not found" };
      mockFetchWithErrorHandling.mockResolvedValue(err(apiError));

      const result = await groupService.getGroup(999);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.status).toBe(404);
      }
    });
  });

  describe("createGroup", () => {
    it("should create a new group successfully", async () => {
      const createRequest: CreateGroupRequest = {
        name: "New Group",
        description: "New description",
        group_type: "op",
      };

      const createdGroup = {
        ...mockGroup,
        ...createRequest,
        type: "op" as const,
      };
      mockFetchWithErrorHandling.mockResolvedValue(ok(createdGroup));

      const result = await groupService.createGroup(createRequest);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.name).toBe(createRequest.name);
        expect(result.value.type).toBe("op");
      }
      expect(mockFetchWithErrorHandling).toHaveBeenCalledWith(
        "/api/v1/groups",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(createRequest),
        }
      );
    });

    it("should handle validation errors", async () => {
      const createRequest: CreateGroupRequest = {
        name: "",
        group_type: "whitelist",
      };

      const apiError = { status: 400, message: "Name is required" };
      mockFetchWithErrorHandling.mockResolvedValue(err(apiError));

      const result = await groupService.createGroup(createRequest);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.status).toBe(400);
      }
    });
  });

  describe("updateGroup", () => {
    it("should update group successfully", async () => {
      const updateRequest: UpdateGroupRequest = {
        name: "Updated Group",
        description: "Updated description",
      };

      const updatedGroup = { ...mockGroup, ...updateRequest };
      mockFetchWithErrorHandling.mockResolvedValue(ok(updatedGroup));

      const result = await groupService.updateGroup(1, updateRequest);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.name).toBe(updateRequest.name);
      }
      expect(mockFetchWithErrorHandling).toHaveBeenCalledWith(
        "/api/v1/groups/1",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateRequest),
        }
      );
    });
  });

  describe("deleteGroup", () => {
    it("should delete group successfully", async () => {
      mockFetchWithErrorHandling.mockResolvedValue(ok(undefined));

      const result = await groupService.deleteGroup(1);

      expect(result.isOk()).toBe(true);
      expect(mockFetchWithErrorHandling).toHaveBeenCalledWith(
        "/api/v1/groups/1",
        {
          method: "DELETE",
        }
      );
    });

    it("should handle delete errors", async () => {
      const apiError = { status: 403, message: "Not authorized" };
      mockFetchWithErrorHandling.mockResolvedValue(err(apiError));

      const result = await groupService.deleteGroup(1);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.status).toBe(403);
      }
    });
  });

  describe("addPlayerToGroup", () => {
    it("should add player by username", async () => {
      const addRequest: AddPlayerRequest = {
        username: "NewPlayer",
      };

      const updatedGroup = {
        ...mockGroup,
        players: [
          ...mockGroup.players,
          {
            uuid: "123e4567-e89b-12d3-a456-426614174000",
            username: "NewPlayer",
            added_at: "2024-01-01T00:00:00Z",
          },
        ],
      };

      mockFetchWithErrorHandling.mockResolvedValue(ok(updatedGroup));

      const result = await groupService.addPlayerToGroup(1, addRequest);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.players).toHaveLength(2);
      }
      expect(mockFetchWithErrorHandling).toHaveBeenCalledWith(
        "/api/v1/groups/1/players",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(addRequest),
        }
      );
    });

    it("should add player by UUID", async () => {
      const addRequest: AddPlayerRequest = {
        uuid: "123e4567-e89b-12d3-a456-426614174000",
      };

      mockFetchWithErrorHandling.mockResolvedValue(ok(mockGroup));

      const result = await groupService.addPlayerToGroup(1, addRequest);

      expect(result.isOk()).toBe(true);
      expect(mockFetchWithErrorHandling).toHaveBeenCalledWith(
        "/api/v1/groups/1/players",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(addRequest),
        }
      );
    });

    it("should handle player already exists error", async () => {
      const addRequest: AddPlayerRequest = {
        username: "ExistingPlayer",
      };

      const apiError = { status: 409, message: "Player already in group" };
      mockFetchWithErrorHandling.mockResolvedValue(err(apiError));

      const result = await groupService.addPlayerToGroup(1, addRequest);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.status).toBe(409);
      }
    });
  });

  describe("removePlayerFromGroup", () => {
    it("should remove player successfully", async () => {
      const updatedGroup = {
        ...mockGroup,
        players: [],
      };

      mockFetchWithErrorHandling.mockResolvedValue(ok(updatedGroup));

      const result = await groupService.removePlayerFromGroup(
        1,
        "550e8400-e29b-41d4-a716-446655440000"
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.players).toHaveLength(0);
      }
      expect(mockFetchWithErrorHandling).toHaveBeenCalledWith(
        "/api/v1/groups/1/players/550e8400-e29b-41d4-a716-446655440000",
        {
          method: "DELETE",
        }
      );
    });

    it("should handle player not found error", async () => {
      const apiError = { status: 404, message: "Player not found in group" };
      mockFetchWithErrorHandling.mockResolvedValue(err(apiError));

      const result = await groupService.removePlayerFromGroup(
        1,
        "invalid-uuid"
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.status).toBe(404);
      }
    });
  });

  describe("getServerGroups", () => {
    it("should fetch server attached groups", async () => {
      mockFetchWithErrorHandling.mockResolvedValue(
        ok({ groups: [mockAttachedGroup] })
      );

      const result = await groupService.getServerGroups(1);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value[0]).toHaveProperty("priority");
        expect(result.value[0]).toHaveProperty("attached_at");
      }
      expect(mockFetchWithErrorHandling).toHaveBeenCalledWith(
        "/api/v1/groups/servers/1"
      );
    });
  });

  describe("attachGroupToServer", () => {
    it("should attach group to server successfully", async () => {
      const attachRequest: AttachServerRequest = {
        server_id: 1,
        priority: 75,
      };

      mockFetchWithErrorHandling.mockResolvedValue(ok(undefined));

      const result = await groupService.attachGroupToServer(1, attachRequest);

      expect(result.isOk()).toBe(true);
      expect(mockFetchWithErrorHandling).toHaveBeenCalledWith(
        "/api/v1/groups/1/servers",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(attachRequest),
        }
      );
    });

    it("should handle attachment conflicts", async () => {
      const attachRequest: AttachServerRequest = {
        server_id: 1,
        priority: 50,
      };

      const apiError = { status: 409, message: "Group already attached" };
      mockFetchWithErrorHandling.mockResolvedValue(err(apiError));

      const result = await groupService.attachGroupToServer(1, attachRequest);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.status).toBe(409);
      }
    });
  });

  describe("detachGroupFromServer", () => {
    it("should detach group from server successfully", async () => {
      mockFetchWithErrorHandling.mockResolvedValue(ok(undefined));

      const result = await groupService.detachGroupFromServer(1, 1);

      expect(result.isOk()).toBe(true);
      expect(mockFetchWithErrorHandling).toHaveBeenCalledWith(
        "/api/v1/groups/1/servers/1",
        {
          method: "DELETE",
        }
      );
    });

    it("should handle detachment errors", async () => {
      const apiError = { status: 404, message: "Group not attached to server" };
      mockFetchWithErrorHandling.mockResolvedValue(err(apiError));

      const result = await groupService.detachGroupFromServer(1, 999);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.status).toBe(404);
      }
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty group lists", async () => {
      mockFetchWithErrorHandling.mockResolvedValue(ok({ groups: [] }));

      const result = await groupService.getGroups();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([]);
      }
    });

    it("should handle network errors", async () => {
      const networkError = { status: 0, message: "Network error" };
      mockFetchWithErrorHandling.mockResolvedValue(err(networkError));

      const result = await groupService.getGroups();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.status).toBe(0);
      }
    });

    it("should handle malformed UUIDs in player operations", async () => {
      const apiError = { status: 400, message: "Invalid UUID format" };
      mockFetchWithErrorHandling.mockResolvedValue(err(apiError));

      const result = await groupService.removePlayerFromGroup(
        1,
        "invalid-uuid"
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.status).toBe(400);
      }
    });

    it("should handle undefined optional parameters", async () => {
      const createRequest: CreateGroupRequest = {
        name: "Test Group",
        group_type: "whitelist",
        // description is undefined
      };

      mockFetchWithErrorHandling.mockResolvedValue(ok(mockGroup));

      const result = await groupService.createGroup(createRequest);

      expect(result.isOk()).toBe(true);
      expect(mockFetchWithErrorHandling).toHaveBeenCalledWith(
        "/api/v1/groups",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(createRequest),
        }
      );
    });
  });
});
