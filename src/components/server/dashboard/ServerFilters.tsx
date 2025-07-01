"use client";

import React from "react";
import { useTranslation } from "@/contexts/language";
import { ServerType, ServerStatus } from "@/types/server";
import type { ServerFilters as ServerFiltersType } from "../hooks/useServerFilters";
import styles from "./ServerFilters.module.css";

export interface ServerFiltersProps {
  filters: ServerFiltersType;
  availableVersions: string[];
  hasActiveFilters: boolean;
  onFilterChange: (updates: Partial<ServerFiltersType>) => void;
  onResetFilters: () => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  serverCount: number;
  filteredCount: number;
}

export function ServerFilters({
  filters,
  availableVersions,
  hasActiveFilters,
  onFilterChange,
  onResetFilters,
  showFilters,
  onToggleFilters,
  serverCount,
  filteredCount,
}: ServerFiltersProps) {
  const { t } = useTranslation();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ searchQuery: e.target.value });
  };

  const handleServerTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as ServerType | "all";
    onFilterChange({ serverType: value });
  };

  const handleServerStatusChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const value = e.target.value as ServerStatus | "all";
    onFilterChange({ serverStatus: value });
  };

  const handleVersionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ minecraftVersion: e.target.value });
  };

  const handleSortByChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as "name" | "status" | "created" | "version";
    onFilterChange({ sortBy: value });
  };

  const handleSortOrderToggle = () => {
    onFilterChange({
      sortOrder: filters.sortOrder === "asc" ? "desc" : "asc",
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.info}>
          <h3 className={styles.title}>
            {filteredCount !== serverCount
              ? t("servers.filters.filteredCount", {
                  filtered: String(filteredCount),
                  total: String(serverCount),
                })
              : t("servers.filters.totalCount", { count: String(serverCount) })}
          </h3>
        </div>

        <div className={styles.controls}>
          <button
            onClick={onToggleFilters}
            className={`${styles.toggleButton} ${showFilters ? styles.active : ""}`}
            aria-expanded={showFilters}
          >
            <span className={styles.filterIcon}>🔍</span>
            {t("servers.filters.toggle")}
            {hasActiveFilters && (
              <span
                className={styles.filterBadge}
                data-testid="filter-indicator"
              >
                {/* Active filter indicator */}
              </span>
            )}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className={styles.filtersPanel}>
          <div className={styles.filterRow}>
            <div className={styles.filterGroup}>
              <label htmlFor="search-input" className={styles.filterLabel}>
                {t("servers.filters.search")}
              </label>
              <input
                id="search-input"
                type="text"
                value={filters.searchQuery}
                onChange={handleSearchChange}
                placeholder={t("servers.filters.searchPlaceholder")}
                className={styles.searchInput}
              />
            </div>

            <div className={styles.filterGroup}>
              <label htmlFor="type-select" className={styles.filterLabel}>
                {t("servers.filters.type")}
              </label>
              <select
                id="type-select"
                value={filters.serverType}
                onChange={handleServerTypeChange}
                className={styles.filterSelect}
              >
                <option value="all">{t("servers.filters.allTypes")}</option>
                <option value={ServerType.VANILLA}>
                  {t("servers.types.vanilla")}
                </option>
                <option value={ServerType.PAPER}>
                  {t("servers.types.paper")}
                </option>
                <option value={ServerType.FORGE}>
                  {t("servers.types.forge")}
                </option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label htmlFor="status-select" className={styles.filterLabel}>
                {t("servers.filters.status")}
              </label>
              <select
                id="status-select"
                value={filters.serverStatus}
                onChange={handleServerStatusChange}
                className={styles.filterSelect}
              >
                <option value="all">{t("servers.filters.allStatuses")}</option>
                <option value={ServerStatus.RUNNING}>
                  {t("servers.status.running")}
                </option>
                <option value={ServerStatus.STOPPED}>
                  {t("servers.status.stopped")}
                </option>
                <option value={ServerStatus.STARTING}>
                  {t("servers.status.starting")}
                </option>
                <option value={ServerStatus.STOPPING}>
                  {t("servers.status.stopping")}
                </option>
                <option value={ServerStatus.ERROR}>
                  {t("servers.status.error")}
                </option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label htmlFor="version-select" className={styles.filterLabel}>
                {t("servers.filters.version")}
              </label>
              <select
                id="version-select"
                value={filters.minecraftVersion}
                onChange={handleVersionChange}
                className={styles.filterSelect}
              >
                <option value="all">{t("servers.filters.allVersions")}</option>
                {availableVersions.map((version) => (
                  <option key={version} value={version}>
                    {version}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.sortRow}>
            <div className={styles.filterGroup}>
              <label htmlFor="sort-select" className={styles.filterLabel}>
                {t("servers.filters.sortBy")}
              </label>
              <select
                id="sort-select"
                value={filters.sortBy}
                onChange={handleSortByChange}
                className={styles.filterSelect}
              >
                <option value="status">{t("servers.sort.status")}</option>
                <option value="name">{t("servers.sort.name")}</option>
                <option value="created">{t("servers.sort.created")}</option>
                <option value="version">{t("servers.sort.version")}</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>
                {t("servers.filters.sortOrder")}
              </label>
              <button
                onClick={handleSortOrderToggle}
                className={styles.sortOrderButton}
                title={t(`servers.sort.${filters.sortOrder}`)}
              >
                {filters.sortOrder === "asc" ? "↗️" : "↙️"}
                {t(`servers.sort.${filters.sortOrder}`)}
              </button>
            </div>

            {hasActiveFilters && (
              <div className={styles.filterGroup}>
                <button onClick={onResetFilters} className={styles.resetButton}>
                  {t("servers.filters.reset")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
