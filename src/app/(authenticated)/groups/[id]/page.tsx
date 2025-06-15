"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "@/contexts/language";
import { useAuth } from "@/contexts/auth";
import {
  getGroup,
  updateGroup,
  deleteGroup,
  addPlayerToGroup,
  removePlayerFromGroup,
  type Group,
  type UpdateGroupRequest,
  type AddPlayerRequest,
} from "@/services/groups";
import { formatDateSimple } from "@/utils/date-format";
import styles from "./group-detail.module.css";

export default function GroupDetailPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const groupId = parseInt(params.id as string);

  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);

  useEffect(() => {
    loadGroup();
  }, [groupId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadGroup = async () => {
    setLoading(true);
    setError(null);

    const result = await getGroup(groupId);

    if (result.isErr()) {
      setError(result.error.message);
    } else {
      setGroup(result.value);
    }

    setLoading(false);
  };

  const handleUpdateGroup = async (request: UpdateGroupRequest) => {
    const result = await updateGroup(groupId, request);

    if (result.isErr()) {
      setError(result.error.message);
      return false;
    }

    await loadGroup();
    setShowEditModal(false);
    return true;
  };

  const handleDeleteGroup = async () => {
    if (!confirm(t("groups.confirmDelete"))) {
      return;
    }

    const result = await deleteGroup(groupId);

    if (result.isErr()) {
      setError(result.error.message);
      return;
    }

    router.push("/groups");
  };

  const handleAddPlayer = async (request: AddPlayerRequest) => {
    const result = await addPlayerToGroup(groupId, request);

    if (result.isErr()) {
      setError(result.error.message);
      return false;
    }

    await loadGroup();
    setShowAddPlayerModal(false);
    return true;
  };

  const handleRemovePlayer = async (playerUuid: string, playerName: string) => {
    if (!confirm(t("groups.players.confirmRemove", { player: playerName }))) {
      return;
    }

    const result = await removePlayerFromGroup(groupId, playerUuid);

    if (result.isErr()) {
      setError(result.error.message);
      return;
    }

    await loadGroup();
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>{t("common.loading")}</div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error || t("groups.notFound")}</div>
      </div>
    );
  }

  const canEdit = group.owner_id === user?.id;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <button
            className={styles.backButton}
            onClick={() => router.push("/groups")}
          >
            ← {t("common.back")}
          </button>
          <h1 className={styles.title}>{group.name}</h1>
          <span className={`${styles.groupType} ${styles[group.type]}`}>
            {t(`groups.${group.type}`)}
          </span>
        </div>

        {canEdit && (
          <div className={styles.actions}>
            <button
              className={styles.editButton}
              onClick={() => setShowEditModal(true)}
            >
              {t("common.edit")}
            </button>
            <button className={styles.deleteButton} onClick={handleDeleteGroup}>
              {t("common.delete")}
            </button>
          </div>
        )}
      </div>

      {group.description && (
        <div className={styles.description}>
          <p>{group.description}</p>
        </div>
      )}

      <div className={styles.infoGrid}>
        <div className={styles.infoCard}>
          <h3>{t("groups.players.title")}</h3>
          <div className={styles.playersSection}>
            <div className={styles.playersHeader}>
              <span className={styles.playerCount}>
                {t("groups.playerCount", {
                  count: group.players.length.toString(),
                })}
              </span>
              {canEdit && (
                <button
                  className={styles.addButton}
                  onClick={() => setShowAddPlayerModal(true)}
                >
                  {t("groups.players.addPlayer")}
                </button>
              )}
            </div>

            {group.players.length === 0 ? (
              <div className={styles.emptyState}>
                <p>{t("groups.players.noPlayers")}</p>
              </div>
            ) : (
              <div className={styles.playersList}>
                {group.players.map((player) => (
                  <div key={player.uuid} className={styles.playerCard}>
                    <div className={styles.playerInfo}>
                      <div className={styles.playerName}>{player.username}</div>
                      <div className={styles.playerUuid}>{player.uuid}</div>
                      {player.added_at && (
                        <div className={styles.playerDate}>
                          {t("groups.players.addedAt", {
                            date: formatDateSimple(player.added_at),
                          })}
                        </div>
                      )}
                    </div>
                    {canEdit && (
                      <button
                        className={styles.removeButton}
                        onClick={() =>
                          handleRemovePlayer(player.uuid, player.username)
                        }
                      >
                        {t("groups.players.removePlayer")}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showEditModal && (
        <EditGroupModal
          group={group}
          onClose={() => setShowEditModal(false)}
          onUpdate={handleUpdateGroup}
        />
      )}

      {showAddPlayerModal && (
        <AddPlayerModal
          onClose={() => setShowAddPlayerModal(false)}
          onAdd={handleAddPlayer}
        />
      )}
    </div>
  );
}

interface EditGroupModalProps {
  group: Group;
  onClose: () => void;
  onUpdate: (request: UpdateGroupRequest) => Promise<boolean>;
}

function EditGroupModal({ group, onClose, onUpdate }: EditGroupModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const success = await onUpdate({
      name: name.trim(),
      description: description.trim() || undefined,
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
          <h2>{t("groups.editGroup")}</h2>
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
              maxLength={500}
              rows={3}
              className={styles.textarea}
            />
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
              className={styles.saveButton}
              disabled={loading || !name.trim()}
            >
              {loading ? t("common.saving") : t("common.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface AddPlayerModalProps {
  onClose: () => void;
  onAdd: (request: AddPlayerRequest) => Promise<boolean>;
}

function AddPlayerModal({ onClose, onAdd }: AddPlayerModalProps) {
  const { t } = useTranslation();
  const [playerInput, setPlayerInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const input = playerInput.trim();

    // Determine if input is UUID (32-36 chars, hex) or username
    const isUuid =
      /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(
        input
      ) || /^[0-9a-f]{32}$/i.test(input);

    const request: AddPlayerRequest = isUuid
      ? { uuid: input }
      : { username: input };

    const success = await onAdd(request);
    setLoading(false);

    if (success) {
      onClose();
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{t("groups.players.addPlayer")}</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="playerInput">
              {t("groups.players.playerName")}
            </label>
            <input
              id="playerInput"
              type="text"
              value={playerInput}
              onChange={(e) => setPlayerInput(e.target.value)}
              placeholder={t("groups.players.playerNamePlaceholder")}
              required
              className={styles.input}
            />
            <div className={styles.fieldHint}>
              {t("groups.players.playerNameHint")}
            </div>
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
              className={styles.addButton}
              disabled={loading || !playerInput.trim()}
            >
              {loading ? t("common.adding") : t("common.add")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
