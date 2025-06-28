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

// Server Settings Form Component
interface ServerSettingsFormProps {
  server: MinecraftServer;
  onUpdate: (updatedServer: MinecraftServer) => void;
}

function ServerSettingsForm({ server, onUpdate }: ServerSettingsFormProps) {
  const { logout } = useAuth();
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: server.name,
    description: server.description || "",
    max_memory: server.max_memory,
    max_players: server.max_players,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Update form data when server prop changes
  useEffect(() => {
    setFormData({
      name: server.name,
      description: server.description || "",
      max_memory: server.max_memory,
      max_players: server.max_players,
    });
  }, [server]);

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

  const hasChanges =
    formData.name !== server.name ||
    formData.description !== (server.description || "") ||
    formData.max_memory !== server.max_memory ||
    formData.max_players !== server.max_players;

  return (
    <div className={styles.settingsSection}>
      <div className={styles.sectionHeader}>
        <h3>{t("servers.settings.title")}</h3>
        <p className={styles.sectionDescription}>
          {t("servers.settings.description")}
        </p>
      </div>

      <form className={styles.settingsForm} onSubmit={handleSubmit}>
        <div className={styles.formSection}>
          <h4>{t("servers.settings.basicInformation")}</h4>

          <div className={styles.formField}>
            <label htmlFor="name">{t("servers.settings.serverName")} *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              disabled={isSaving}
              className={styles.input}
            />
          </div>

          <div className={styles.formField}>
            <label htmlFor="description">{t("servers.description")}</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder={t("servers.settings.enterDescription")}
              rows={3}
              disabled={isSaving}
              className={styles.textarea}
            />
          </div>
        </div>

        <div className={styles.formSection}>
          <h4>{t("servers.settings.serverResources")}</h4>

          <div className={styles.formField}>
            <label htmlFor="max_memory">
              {t("servers.settings.memoryLimit")} *
            </label>
            <input
              type="number"
              id="max_memory"
              name="max_memory"
              value={formData.max_memory}
              onChange={handleInputChange}
              min="512"
              required
              disabled={isSaving}
              className={styles.input}
            />
            <div className={styles.fieldHint}>
              {t("servers.settings.memoryHint")}
            </div>
          </div>

          <div className={styles.formField}>
            <label htmlFor="max_players">
              {t("servers.fields.maxPlayers")} *
            </label>
            <input
              type="number"
              id="max_players"
              name="max_players"
              value={formData.max_players}
              onChange={handleInputChange}
              min="1"
              max="200"
              required
              disabled={isSaving}
              className={styles.input}
            />
            <div className={styles.fieldHint}>
              {t("servers.settings.maxPlayersHint")}
            </div>
          </div>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}
        {successMessage && (
          <div className={styles.successMessage}>{successMessage}</div>
        )}

        {hasChanges && (
          <div className={styles.formActions}>
            <button
              type="button"
              onClick={handleReset}
              disabled={isSaving}
              className={styles.resetButton}
            >
              {t("servers.settings.resetChanges")}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={styles.saveButton}
            >
              {isSaving
                ? t("servers.settings.saving")
                : t("servers.settings.saveSettings")}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

// Server Groups Section Component
interface ServerGroupsSectionProps {
  server: MinecraftServer;
}

function ServerGroupsSection({ server }: ServerGroupsSectionProps) {
  const { t } = useTranslation();
  const { locale } = useLanguage();
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
      priority,
    });

    if (result.isErr()) {
      setGroupsError(result.error.message);
      return;
    }

    // Reload groups data after successful attachment
    await loadGroupsData();
    setShowAttachModal(false);
  };

  const getAvailableGroupsForAttach = () => {
    const attachedGroupIds = attachedGroups.map((ag) => ag.id);
    return availableGroups.filter(
      (group) => !attachedGroupIds.includes(group.id)
    );
  };

  return (
    <div className={styles.groupsSection}>
      <div className={styles.sectionHeader}>
        <h3>{t("servers.settings.associatedGroups")}</h3>
        <p className={styles.sectionDescription}>
          {t("servers.settings.groupsDescription")}
        </p>
      </div>

      <div className={styles.groupsContent}>
        {groupsLoading ? (
          <div className={styles.loading}>
            {t("servers.settings.loadingGroups")}
          </div>
        ) : groupsError ? (
          <div className={styles.errorMessage}>{groupsError}</div>
        ) : (
          <>
            <div className={styles.groupsHeader}>
              <div className={styles.groupsCount}>
                {attachedGroups.length} {t("groups.servers.attachedGroups")}
              </div>
              <button
                onClick={() => setShowAttachModal(true)}
                className={styles.attachButton}
                disabled={getAvailableGroupsForAttach().length === 0}
              >
                {t("groups.servers.attachToServer")}
              </button>
            </div>

            {attachedGroups.length === 0 ? (
              <div className={styles.emptyState}>
                {t("groups.servers.noGroupsAttached")}
              </div>
            ) : (
              <div className={styles.groupsList}>
                {attachedGroups.map((attachedGroup) => (
                  <div key={attachedGroup.id} className={styles.groupItem}>
                    <div className={styles.groupInfo}>
                      <div className={styles.groupName}>
                        {attachedGroup.name}
                      </div>
                      <div className={styles.groupMeta}>
                        <span className={styles.groupType}>
                          {t(`groups.types.${attachedGroup.type}`)}
                        </span>
                        <span className={styles.groupPriority}>
                          {t("groups.servers.priority")}:{" "}
                          {attachedGroup.priority}
                        </span>
                        <span className={styles.groupDate}>
                          {t("groups.servers.attachedOn")}:{" "}
                          {formatDate(attachedGroup.attached_at, locale)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        handleDetachGroup(attachedGroup.id, attachedGroup.name)
                      }
                      className={styles.detachButton}
                    >
                      {t("groups.servers.detach")}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Attach Group Modal */}
      {showAttachModal && (
        <AttachGroupModal
          availableGroups={getAvailableGroupsForAttach()}
          onAttach={handleAttachGroup}
          onClose={() => setShowAttachModal(false)}
        />
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
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
      )}
    </div>
  );
}

// Attach Group Modal Component
interface AttachGroupModalProps {
  availableGroups: Group[];
  onAttach: (groupId: number, priority: number) => void;
  onClose: () => void;
}

function AttachGroupModal({
  availableGroups,
  onAttach,
  onClose,
}: AttachGroupModalProps) {
  const { t } = useTranslation();
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [priority, setPriority] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGroupId !== null) {
      onAttach(selectedGroupId, priority);
    }
  };

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3>{t("groups.servers.attachToServer")}</h3>
          <button
            onClick={onClose}
            className={styles.modalClose}
            aria-label={t("common.close")}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.formField}>
            <label htmlFor="group-select">
              {t("groups.servers.selectGroup")}
            </label>
            <select
              id="group-select"
              value={selectedGroupId || ""}
              onChange={(e) =>
                setSelectedGroupId(
                  e.target.value ? parseInt(e.target.value) : null
                )
              }
              required
              className={styles.select}
            >
              <option value="">{t("groups.servers.chooseGroup")}</option>
              {availableGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} ({t(`groups.types.${group.type}`)})
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formField}>
            <label htmlFor="priority">{t("groups.servers.priority")}</label>
            <input
              type="number"
              id="priority"
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
              min="0"
              max="100"
              className={styles.input}
            />
            <div className={styles.fieldHint}>
              {t("groups.servers.priorityHint")}
            </div>
          </div>

          <div className={styles.modalActions}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={selectedGroupId === null}
              className={styles.attachButton}
            >
              {t("groups.servers.attach")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Main ServerSettings Component
interface ServerSettingsProps {
  server: MinecraftServer;
  onUpdate: (updatedServer: MinecraftServer) => void;
}

export function ServerSettings({ server, onUpdate }: ServerSettingsProps) {
  return (
    <div className={styles.container}>
      <ServerSettingsForm server={server} onUpdate={onUpdate} />
      <ServerGroupsSection server={server} />
    </div>
  );
}
