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

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await getGroups(
      filterType === "all" ? undefined : filterType
    );

    if (result.isErr()) {
      setError(result.error.message);
    } else {
      setGroups(result.value);
    }

    setLoading(false);
  }, [filterType]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

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

  const canCreateGroups = user?.role === "admin" || user?.role === "operator";

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t("groups.title")}</h1>
        {canCreateGroups && (
          <button
            className={styles.createButton}
            onClick={() => setShowCreateModal(true)}
          >
            {t("groups.createGroup")}
          </button>
        )}
      </div>

      <div className={styles.filters}>
        <button
          className={`${styles.filterButton} ${filterType === "all" ? styles.active : ""}`}
          onClick={() => setFilterType("all")}
        >
          {t("groups.allGroups")}
        </button>
        <button
          className={`${styles.filterButton} ${filterType === "op" ? styles.active : ""}`}
          onClick={() => setFilterType("op")}
        >
          {t("groups.opGroups")}
        </button>
        <button
          className={`${styles.filterButton} ${filterType === "whitelist" ? styles.active : ""}`}
          onClick={() => setFilterType("whitelist")}
        >
          {t("groups.whitelistGroups")}
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <div className={styles.loading}>{t("common.loading")}</div>
      ) : (
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
          ) : (
            groups.map((group) => (
              <div key={group.id} className={styles.groupCard}>
                <div className={styles.groupHeader}>
                  <h3 className={styles.groupName}>{group.name}</h3>
                  <span className={`${styles.groupType} ${styles[group.type]}`}>
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
