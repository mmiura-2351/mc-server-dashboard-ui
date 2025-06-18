"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth";
import { useTranslation, useLanguage } from "@/contexts/language";
import { formatDate } from "@/utils/format";
import * as serverService from "@/services/server";
import * as groupService from "@/services/groups";
import { ConfirmationModal } from "@/components/modal";
import type { MinecraftServer, ServerUpdateRequest } from "@/types/server";
import type { Group, AttachedGroup } from "@/services/groups";
import styles from "./server-settings.module.css";

interface ServerSettingsProps {
  server: MinecraftServer;
  onUpdate: (updatedServer: MinecraftServer) => void;
}

export function ServerSettings({ server, onUpdate }: ServerSettingsProps) {
  const { logout } = useAuth();
  const { t } = useTranslation();
  const { locale: _locale } = useLanguage();
  const [formData, setFormData] = useState({
    name: server.name,
    description: server.description || "",
    max_memory: server.max_memory,
    max_players: server.max_players,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Group management state
  const [attachedGroups, setAttachedGroups] = useState<AttachedGroup[]>([]);
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupsError, setGroupsError] = useState<string | null>(null);

  // Confirmation modal state
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

  // Update form data when server prop changes
  useEffect(() => {
    setFormData({
      name: server.name,
      description: server.description || "",
      max_memory: server.max_memory,
      max_players: server.max_players,
    });
  }, [server]);

  // Load groups data
  useEffect(() => {
    loadGroupsData();
  }, [server.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadGroupsData = async () => {
    setGroupsLoading(true);
    setGroupsError(null);

    try {
      // Load attached groups and available groups in parallel
      const [attachedResult, availableResult] = await Promise.all([
        groupService.getServerGroups(server.id),
        groupService.getGroups(),
      ]);

      if (attachedResult.isErr()) {
        setGroupsError(attachedResult.error.message);
        return;
      }

      if (availableResult.isErr()) {
        setGroupsError(availableResult.error.message);
        return;
      }

      setAttachedGroups(attachedResult.value);
      setAvailableGroups(availableResult.value);
    } catch {
      setGroupsError("Failed to load groups data");
    } finally {
      setGroupsLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "max_memory" || name === "max_players"
          ? parseInt(value) || 0
          : value,
    }));
    setSuccessMessage(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError(t("servers.settings.validation.nameRequired"));
      return;
    }

    if (formData.max_memory < 512) {
      setError(t("servers.settings.validation.memoryMinimum"));
      return;
    }

    if (formData.max_players < 1 || formData.max_players > 200) {
      setError(t("servers.settings.validation.playersRange"));
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    const updateData: ServerUpdateRequest = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      max_memory: formData.max_memory,
      max_players: formData.max_players,
    };

    const result = await serverService.updateServer(server.id, updateData);
    if (result.isOk()) {
      setSuccessMessage(t("servers.settings.updated"));
      onUpdate(result.value);
    } else {
      if (result.error.status === 401) {
        logout();
        return;
      }
      setError(result.error.message);
    }
    setIsSaving(false);
  };

  const handleReset = () => {
    setFormData({
      name: server.name,
      description: server.description || "",
      max_memory: server.max_memory,
      max_players: server.max_players,
    });
    setError(null);
    setSuccessMessage(null);
  };

  const handleDetachGroup = async (groupId: number, groupName: string) => {
    const confirmDetach = async () => {
      const result = await groupService.detachGroupFromServer(
        groupId,
        server.id
      );

      if (result.isErr()) {
        setGroupsError(result.error.message);
        return;
      }

      // Reload groups data after successful detachment
      await loadGroupsData();

      // Close modal
      setConfirmModal({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: () => {},
      });
    };

    setConfirmModal({
      isOpen: true,
      title: t("groups.servers.detachServer"),
      message: t("groups.servers.confirmDetach", { server: groupName }),
      onConfirm: confirmDetach,
    });
  };

  const handleAttachGroup = async (groupId: number, priority: number = 0) => {
    const result = await groupService.attachGroupToServer(groupId, {
      server_id: server.id,
      priority: priority,
    });

    if (result.isErr()) {
      setGroupsError(result.error.message);
      return false;
    }

    // Reload groups data after successful attachment
    await loadGroupsData();
    setShowAttachModal(false);
    return true;
  };

  const hasChanges =
    formData.name !== server.name ||
    formData.description !== (server.description || "") ||
    formData.max_memory !== server.max_memory ||
    formData.max_players !== server.max_players;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>{t("servers.settings.title")}</h2>
        <p className={styles.description}>
          {t("servers.settings.description")}
          <br />
          {t("servers.settings.note")}
        </p>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          {error}
          <button
            onClick={() => setError(null)}
            className={styles.dismissButton}
          >
            ×
          </button>
        </div>
      )}

      {successMessage && (
        <div className={styles.successBanner}>
          {successMessage}
          <button
            onClick={() => setSuccessMessage(null)}
            className={styles.dismissButton}
          >
            ×
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.section}>
          <h3>{t("servers.settings.basicInformation")}</h3>

          <div className={styles.field}>
            <label htmlFor="name" className={styles.label}>
              {t("servers.settings.serverName")} *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              disabled={isSaving}
              className={styles.input}
              placeholder={t("servers.settings.enterServerName")}
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="description" className={styles.label}>
              {t("servers.description")}
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              disabled={isSaving}
              className={styles.textarea}
              placeholder={t("servers.settings.enterDescription")}
              rows={3}
            />
          </div>
        </div>

        <div className={styles.section}>
          <h3>{t("servers.settings.serverResources")}</h3>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="max_memory" className={styles.label}>
                {t("servers.settings.memoryLimit")} *
              </label>
              <input
                id="max_memory"
                name="max_memory"
                type="number"
                min="512"
                max="32768"
                step="256"
                value={formData.max_memory}
                onChange={handleInputChange}
                disabled={isSaving}
                className={styles.input}
                required
              />
              <span className={styles.fieldHint}>
                {t("servers.settings.memoryHint")}
              </span>
            </div>

            <div className={styles.field}>
              <label htmlFor="max_players" className={styles.label}>
                {t("servers.fields.maxPlayers")} *
              </label>
              <input
                id="max_players"
                name="max_players"
                type="number"
                min="1"
                max="200"
                value={formData.max_players}
                onChange={handleInputChange}
                disabled={isSaving}
                className={styles.input}
                required
              />
              <span className={styles.fieldHint}>
                {t("servers.settings.maxPlayersHint")}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.readOnlySection}>
          <h3>{t("servers.settings.readOnlyInformation")}</h3>
          <div className={styles.readOnlyGrid}>
            <div className={styles.readOnlyField}>
              <span className={styles.label}>
                {t("servers.fields.version")}:
              </span>
              <span>{server.minecraft_version}</span>
            </div>
            <div className={styles.readOnlyField}>
              <span className={styles.label}>{t("servers.fields.type")}:</span>
              <span className={styles.serverType}>{server.server_type}</span>
            </div>
            <div className={styles.readOnlyField}>
              <span className={styles.label}>{t("servers.fields.port")}:</span>
              <span>{server.port}</span>
            </div>
            <div className={styles.readOnlyField}>
              <span className={styles.label}>
                {t("servers.fields.created")}:
              </span>
              <span>{formatDate(server.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Player Groups Section */}
        <div className={styles.section}>
          <h3>{t("servers.settings.playerGroups")}</h3>

          {groupsLoading ? (
            <div className={styles.loading}>{t("common.loading")}</div>
          ) : groupsError ? (
            <div className={styles.errorBanner}>{groupsError}</div>
          ) : (
            <>
              <div className={styles.groupsHeader}>
                <span className={styles.groupsCount}>
                  {t("servers.settings.attachedGroups", {
                    count: attachedGroups.length.toString(),
                  })}
                </span>
                <button
                  type="button"
                  onClick={() => setShowAttachModal(true)}
                  className={styles.attachButton}
                  disabled={isSaving}
                >
                  {t("groups.servers.attachServer")}
                </button>
              </div>

              {attachedGroups.length === 0 ? (
                <div className={styles.emptyGroups}>
                  <p>{t("groups.servers.noServers")}</p>
                </div>
              ) : (
                <div className={styles.groupsList}>
                  {attachedGroups.map((group) => (
                    <div key={group.id} className={styles.groupItem}>
                      <div className={styles.groupInfo}>
                        <div className={styles.groupHeader}>
                          <span className={styles.groupName}>{group.name}</span>
                          <span
                            className={`${styles.groupType} ${styles[group.type]}`}
                          >
                            {t(`groups.${group.type}`)}
                          </span>
                        </div>
                        {group.description && (
                          <div className={styles.groupDescription}>
                            {group.description}
                          </div>
                        )}
                        <div className={styles.groupMeta}>
                          <span className={styles.groupPlayers}>
                            {t("groups.playerCount", {
                              count: group.player_count.toString(),
                            })}
                          </span>
                          <span className={styles.groupPriority}>
                            {t("groups.servers.priority")}: {group.priority}
                          </span>
                          <span className={styles.groupAttachedAt}>
                            {t("servers.settings.attachedAt", {
                              date: formatDate(group.attached_at),
                            })}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDetachGroup(group.id, group.name)}
                        className={styles.detachButton}
                        disabled={isSaving}
                      >
                        {t("groups.servers.detachServer")}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            onClick={handleReset}
            className={styles.resetButton}
            disabled={isSaving || !hasChanges}
          >
            {t("servers.settings.resetChanges")}
          </button>
          <button
            type="submit"
            className={styles.saveButton}
            disabled={isSaving || !hasChanges}
          >
            {isSaving
              ? t("servers.settings.saving")
              : t("servers.settings.saveSettings")}
          </button>
        </div>
      </form>

      {showAttachModal && (
        <AttachGroupModal
          onClose={() => setShowAttachModal(false)}
          onAttach={handleAttachGroup}
          availableGroups={availableGroups.filter(
            (group) =>
              !attachedGroups.some((attached) => attached.id === group.id)
          )}
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

interface AttachGroupModalProps {
  onClose: () => void;
  onAttach: (groupId: number, priority: number) => Promise<boolean>;
  availableGroups: Group[];
}

function AttachGroupModal({
  onClose,
  onAttach,
  availableGroups,
}: AttachGroupModalProps) {
  const { t } = useTranslation();
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [priority, setPriority] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGroupId === null) return;

    setLoading(true);
    const success = await onAttach(selectedGroupId, priority);
    setLoading(false);

    if (success) {
      onClose();
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{t("groups.servers.attachServer")}</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        {availableGroups.length === 0 ? (
          <div className={styles.modalContent}>
            <p>{t("servers.settings.noAvailableGroups")}</p>
            <div className={styles.modalActions}>
              <button onClick={onClose} className={styles.cancelButton}>
                {t("common.cancel")}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.modalContent}>
            <div className={styles.field}>
              <label htmlFor="groupSelect">
                {t("servers.settings.selectGroup")}
              </label>
              <select
                id="groupSelect"
                value={selectedGroupId || ""}
                onChange={(e) => setSelectedGroupId(Number(e.target.value))}
                required
                className={styles.select}
              >
                <option value="">{t("servers.settings.chooseGroup")}</option>
                {availableGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name} ({t(`groups.${group.type}`)}) -{" "}
                    {group.players.length} {t("servers.settings.players")}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="priority">{t("groups.servers.priority")}</label>
              <input
                id="priority"
                type="number"
                min="0"
                max="100"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className={styles.input}
              />
              <span className={styles.fieldHint}>
                {t("servers.settings.priorityHint")}
              </span>
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
                className={styles.attachButton}
                disabled={loading || selectedGroupId === null}
              >
                {loading
                  ? t("servers.settings.attaching")
                  : t("servers.settings.attachGroup")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
