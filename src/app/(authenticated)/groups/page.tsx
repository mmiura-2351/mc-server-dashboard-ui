"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/contexts/language";
import { useAuth } from "@/contexts/auth";
import {
  getGroups,
  createGroup,
  deleteGroup,
  type Group,
  type CreateGroupRequest,
} from "@/services/groups";
import { getAllUsers } from "@/services/auth";
import type { User } from "@/types/auth";
import { formatDateSimple } from "@/utils/date-format";
import { ConfirmationModal } from "@/components/modal";
import styles from "./groups.module.css";

export default function GroupsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "op" | "whitelist">(
    "all"
  );

  // Advanced filter state
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedOwnerId, setSelectedOwnerId] = useState<number | "all">("all");
  const [playerCountMin, setPlayerCountMin] = useState<number | "">("");
  const [playerCountMax, setPlayerCountMax] = useState<number | "">("");
  const [sortBy, setSortBy] = useState<"name" | "created" | "playerCount">(
    "created"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // Load all groups (client-side filtering)
  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await getGroups(); // Get all groups for client-side filtering

    if (result.isErr()) {
      setError(result.error.message);
    } else {
      setGroups(result.value);
    }

    setLoading(false);
  }, []);

  // Load users for owner filtering
  const loadUsers = useCallback(async () => {
    if (!user || user.role !== "admin") return;

    const token = localStorage.getItem("authToken");
    if (!token) return;

    const result = await getAllUsers(token);
    if (result.isOk()) {
      setUsers(result.value);
    }
  }, [user]);

  useEffect(() => {
    loadGroups();
    loadUsers();
  }, [loadGroups, loadUsers]);

  // Load filter state from localStorage
  useEffect(() => {
    const savedFilters = localStorage.getItem("groupFilters");
    if (savedFilters) {
      try {
        const filters = JSON.parse(savedFilters);
        setSearchQuery(filters.searchQuery || "");
        setSelectedOwnerId(filters.selectedOwnerId || "all");
        setPlayerCountMin(filters.playerCountMin || "");
        setPlayerCountMax(filters.playerCountMax || "");
        setSortBy(filters.sortBy || "created");
        setSortOrder(filters.sortOrder || "desc");
        setDateFrom(filters.dateFrom || "");
        setDateTo(filters.dateTo || "");
      } catch {
        // Ignore invalid saved filters
      }
    }
  }, []);

  // Save filter state to localStorage
  useEffect(() => {
    const filters = {
      searchQuery,
      selectedOwnerId,
      playerCountMin,
      playerCountMax,
      sortBy,
      sortOrder,
      dateFrom,
      dateTo,
    };
    localStorage.setItem("groupFilters", JSON.stringify(filters));
  }, [
    searchQuery,
    selectedOwnerId,
    playerCountMin,
    playerCountMax,
    sortBy,
    sortOrder,
    dateFrom,
    dateTo,
  ]);

  const handleCreateGroup = async (request: CreateGroupRequest) => {
    const result = await createGroup(request);

    if (result.isErr()) {
      setError(result.error.message);
      return false;
    }

    await loadGroups();
    setShowCreateModal(false);
    return true;
  };

  const handleDeleteGroup = async (groupId: number, _groupName: string) => {
    setConfirmModal({
      isOpen: true,
      title: t("common.delete"),
      message: t("groups.confirmDelete"),
      onConfirm: async () => {
        const result = await deleteGroup(groupId);

        if (result.isErr()) {
          setError(result.error.message);
          return;
        }

        await loadGroups();
        setConfirmModal({
          isOpen: false,
          title: "",
          message: "",
          onConfirm: () => {},
        });
      },
    });
  };

  // Check if any advanced filters are active (excluding basic type filters)
  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedOwnerId !== "all" ||
    playerCountMin !== "" ||
    playerCountMax !== "" ||
    sortBy !== "created" ||
    sortOrder !== "desc" ||
    dateFrom !== "" ||
    dateTo !== "";

  // Reset all filters to default
  const resetFilters = () => {
    setFilterType("all");
    setSearchQuery("");
    setSelectedOwnerId("all");
    setPlayerCountMin("");
    setPlayerCountMax("");
    setSortBy("created");
    setSortOrder("desc");
    setDateFrom("");
    setDateTo("");
  };

  // Apply all filters and sorting
  const filteredGroups = groups
    .filter((group) => {
      // Basic type filter
      if (filterType !== "all" && group.type !== filterType) {
        return false;
      }

      // Search filter (name and description)
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const nameMatch = group.name.toLowerCase().includes(query);
        const descriptionMatch =
          group.description?.toLowerCase().includes(query) || false;
        if (!nameMatch && !descriptionMatch) {
          return false;
        }
      }

      // Owner filter
      if (selectedOwnerId !== "all" && group.owner_id !== selectedOwnerId) {
        return false;
      }

      // Player count filter
      const playerCount = group.players.length;
      if (playerCountMin !== "" && playerCount < playerCountMin) {
        return false;
      }
      if (playerCountMax !== "" && playerCount > playerCountMax) {
        return false;
      }

      // Date range filter
      if (dateFrom !== "") {
        const groupDate = new Date(group.created_at)
          .toISOString()
          .split("T")[0];
        if (groupDate && groupDate < dateFrom) {
          return false;
        }
      }
      if (dateTo !== "") {
        const groupDate = new Date(group.created_at)
          .toISOString()
          .split("T")[0];
        if (groupDate && groupDate > dateTo) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "created":
          comparison =
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "playerCount":
          comparison = a.players.length - b.players.length;
          break;
        default:
          return 0;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

  const canCreateGroups = user?.role === "admin" || user?.role === "operator";

  return (
    <div className={styles.container}>
      <div className={styles.containerHeader}>
        <h1 className={styles.title}>{t("groups.title")}</h1>
        <div className={styles.headerActions}>
          {/* Basic type filters */}
          <div className={styles.typeFilters}>
            <button
              className={`${styles.typeFilterButton} ${filterType === "all" ? styles.active : ""}`}
              onClick={() => setFilterType("all")}
            >
              {t("groups.allGroups")}
            </button>
            <button
              className={`${styles.typeFilterButton} ${filterType === "op" ? styles.active : ""}`}
              onClick={() => setFilterType("op")}
            >
              {t("groups.opGroups")}
            </button>
            <button
              className={`${styles.typeFilterButton} ${filterType === "whitelist" ? styles.active : ""}`}
              onClick={() => setFilterType("whitelist")}
            >
              {t("groups.whitelistGroups")}
            </button>
          </div>

          {/* Advanced filters toggle */}
          {groups.length > 0 && (
            <div className={styles.filterControls}>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={styles.filterToggleButton}
                title={t("groups.filters.title")}
              >
                🔍 {t("groups.filters.title")}
                {hasActiveFilters && (
                  <span className={styles.activeIndicator}></span>
                )}
              </button>
              {showFilters && (
                <div className={styles.expandedFilters}>
                  <div className={styles.filterHeader}>
                    <h3>{t("groups.filters.title")}</h3>
                    <button
                      onClick={() => setShowFilters(false)}
                      className={styles.closeFiltersButton}
                      aria-label="Close filters"
                    >
                      ×
                    </button>
                  </div>

                  {/* Search Section */}
                  <div className={styles.searchSection}>
                    <div className={styles.filterGroup}>
                      <label
                        htmlFor="groupSearchInput"
                        className={styles.filterLabel}
                      >
                        {t("groups.filters.search.label")}
                      </label>
                      <input
                        id="groupSearchInput"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t("groups.filters.search.placeholder")}
                        className={styles.filterInput}
                      />
                    </div>
                  </div>

                  {/* Filter Section */}
                  <div className={styles.filterSection}>
                    <h4 className={styles.sectionTitle}>
                      🔍 {t("groups.filters.filterBy")}
                    </h4>
                    <div className={styles.filterGrid}>
                      {/* Owner Filter - Only for admin users */}
                      {user?.role === "admin" && users.length > 0 && (
                        <div className={styles.filterGroup}>
                          <label
                            htmlFor="ownerFilter"
                            className={styles.filterLabel}
                          >
                            {t("groups.filters.owner.label")}
                          </label>
                          <select
                            id="ownerFilter"
                            value={selectedOwnerId}
                            onChange={(e) =>
                              setSelectedOwnerId(
                                e.target.value === "all"
                                  ? "all"
                                  : parseInt(e.target.value)
                              )
                            }
                            className={styles.filterSelect}
                          >
                            <option value="all">
                              {t("groups.filters.owner.all")}
                            </option>
                            <option value={user.id}>
                              {t("groups.filters.owner.myGroups")}
                            </option>
                            {users.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.username}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Player Count Filter */}
                      <div className={styles.filterGroup}>
                        <label className={styles.filterLabel}>
                          {t("groups.filters.playerCount.label")}
                        </label>
                        <div className={styles.rangeInputs}>
                          <input
                            type="number"
                            value={playerCountMin}
                            onChange={(e) =>
                              setPlayerCountMin(
                                e.target.value ? parseInt(e.target.value) : ""
                              )
                            }
                            placeholder={t("groups.filters.playerCount.min")}
                            className={styles.rangeInput}
                            min="0"
                          />
                          <span className={styles.rangeSeperator}>-</span>
                          <input
                            type="number"
                            value={playerCountMax}
                            onChange={(e) =>
                              setPlayerCountMax(
                                e.target.value ? parseInt(e.target.value) : ""
                              )
                            }
                            placeholder={t("groups.filters.playerCount.max")}
                            className={styles.rangeInput}
                            min="0"
                          />
                        </div>
                      </div>

                      {/* Date Range Filter */}
                      <div className={styles.filterGroup}>
                        <label className={styles.filterLabel}>
                          {t("groups.filters.dateRange.label")}
                        </label>
                        <div className={styles.rangeInputs}>
                          <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className={styles.rangeInput}
                          />
                          <span className={styles.rangeSeperator}>-</span>
                          <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className={styles.rangeInput}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sort Section */}
                  <div className={styles.sortSection}>
                    <h4 className={styles.sectionTitle}>
                      📊 {t("groups.filters.sortBy")}
                    </h4>
                    <div className={styles.sortControls}>
                      <div className={styles.filterGroup}>
                        <label
                          htmlFor="groupSortBy"
                          className={styles.filterLabel}
                        >
                          {t("groups.filters.sort.label")}
                        </label>
                        <select
                          id="groupSortBy"
                          value={sortBy}
                          onChange={(e) =>
                            setSortBy(
                              e.target.value as
                                | "name"
                                | "created"
                                | "playerCount"
                            )
                          }
                          className={styles.filterSelect}
                        >
                          <option value="created">
                            {t("groups.filters.sort.created")}
                          </option>
                          <option value="name">
                            {t("groups.filters.sort.name")}
                          </option>
                          <option value="playerCount">
                            {t("groups.filters.sort.playerCount")}
                          </option>
                        </select>
                      </div>

                      <div className={styles.filterGroup}>
                        <label className={styles.filterLabel}>
                          {t("groups.filters.sort.order")}
                        </label>
                        <button
                          onClick={() =>
                            setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                          }
                          className={styles.sortOrderButton}
                        >
                          {sortOrder === "asc" ? (
                            <>↑ {t("groups.filters.sort.ascending")}</>
                          ) : (
                            <>↓ {t("groups.filters.sort.descending")}</>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Reset Button */}
                  {hasActiveFilters && (
                    <div className={styles.resetSection}>
                      <button
                        onClick={resetFilters}
                        className={styles.resetFiltersButtonLarge}
                      >
                        🔄 {t("groups.filters.reset")}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {canCreateGroups && (
            <button
              className={styles.createButton}
              onClick={() => setShowCreateModal(true)}
            >
              {t("groups.createGroup")}
            </button>
          )}
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <div className={styles.loading}>{t("common.loading")}</div>
      ) : (
        <>
          {groups.length > 0 && (
            <div className={styles.resultsCount}>
              {t("groups.filters.resultsCount", {
                count: filteredGroups.length.toString(),
                total: groups.length.toString(),
              })}
            </div>
          )}
          <div className={styles.groupsGrid}>
            {groups.length === 0 ? (
              <div className={styles.emptyState}>
                <p>{t("groups.noGroups")}</p>
                {canCreateGroups && (
                  <button
                    className={styles.createButton}
                    onClick={() => setShowCreateModal(true)}
                  >
                    {t("groups.createFirstGroup")}
                  </button>
                )}
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className={styles.emptyState}>
                <h3>{t("groups.noGroupsFound")}</h3>
                <p>{t("groups.noGroupsMatchFilters")}</p>
              </div>
            ) : (
              filteredGroups.map((group) => (
                <div key={group.id} className={styles.groupCard}>
                  <div className={styles.groupHeader}>
                    <h3 className={styles.groupName}>
                      {group.name}
                      {group.is_template && (
                        <span className={styles.templateBadge}>
                          {t("groups.template")}
                        </span>
                      )}
                    </h3>
                    <span
                      className={`${styles.groupType} ${styles[group.type]}`}
                    >
                      {t(`groups.${group.type}`)}
                    </span>
                  </div>

                  <p className={styles.groupDescription}>
                    {group.description || "\u00A0"}
                  </p>

                  <div className={styles.groupStats}>
                    <span className={styles.playerCount}>
                      {t("groups.playerCount", {
                        count: group.players.length.toString(),
                      })}
                    </span>
                    <span className={styles.createdAt}>
                      {t("groups.createdAt", {
                        date: formatDateSimple(group.created_at),
                      })}
                    </span>
                  </div>

                  {user?.role === "admin" && users.length > 0 && (
                    <div className={styles.groupOwner}>
                      <span className={styles.ownerLabel}>
                        {t("groups.owner")}:
                      </span>
                      <span className={styles.ownerName}>
                        {users.find((u) => u.id === group.owner_id)?.username ||
                          t("groups.unknownOwner")}
                      </span>
                    </div>
                  )}

                  <div className={styles.groupActions}>
                    <button
                      className={styles.viewButton}
                      onClick={() => router.push(`/groups/${group.id}`)}
                    >
                      {t("groups.viewDetails")}
                    </button>
                    {group.owner_id === user?.id && (
                      <button
                        className={styles.deleteButton}
                        onClick={() => handleDeleteGroup(group.id, group.name)}
                      >
                        {t("common.delete")}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateGroup}
        />
      )}

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        variant="danger"
        onConfirm={confirmModal.onConfirm}
        onCancel={() =>
          setConfirmModal({
            isOpen: false,
            title: "",
            message: "",
            onConfirm: () => {},
          })
        }
      />
    </div>
  );
}

interface CreateGroupModalProps {
  onClose: () => void;
  onCreate: (request: CreateGroupRequest) => Promise<boolean>;
}

function CreateGroupModal({ onClose, onCreate }: CreateGroupModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [groupType, setGroupType] = useState<"op" | "whitelist">("whitelist");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const success = await onCreate({
      name: name.trim(),
      description: description.trim() || undefined,
      group_type: groupType,
    });

    setLoading(false);

    if (success) {
      onClose();
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{t("groups.createGroup")}</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="name">{t("groups.name")}</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("groups.namePlaceholder")}
              required
              maxLength={100}
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="description">{t("groups.description")}</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("groups.descriptionPlaceholder")}
              maxLength={500}
              rows={3}
              className={styles.textarea}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="groupType">{t("groups.type")}</label>
            <select
              id="groupType"
              value={groupType}
              onChange={(e) =>
                setGroupType(e.target.value as "op" | "whitelist")
              }
              className={styles.select}
            >
              <option value="whitelist">{t("groups.whitelist")}</option>
              <option value="op">{t("groups.op")}</option>
            </select>
          </div>

          <div className={styles.modalActions}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
              disabled={loading}
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              className={styles.createButton}
              disabled={loading || !name.trim()}
            >
              {loading ? t("common.creating") : t("common.create")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
