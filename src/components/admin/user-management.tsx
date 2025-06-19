"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth";
import { useTranslation } from "@/contexts/language";
import { ConfirmationModal } from "@/components/modal";
import * as authService from "@/services/auth";
import type { User, Role, RoleUpdate } from "@/types/auth";
import { Role as RoleEnum } from "@/types/auth";
import styles from "./user-management.module.css";

export function UserManagement() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Modal state
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

  const isAdmin = user?.role === RoleEnum.ADMIN;

  const loadUsers = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    setIsLoading(true);
    const result = await authService.getAllUsers(token);
    if (result.isOk()) {
      setUsers(result.value);
    } else {
      const errorMessage =
        typeof result.error.message === "string"
          ? result.error.message
          : t("userManagement.errors.loadingUsers");
      setMessage({ type: "error", text: errorMessage });
    }
    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const handleApproveUser = async (userId: number) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const result = await authService.approveUser(token, userId);
    if (result.isOk()) {
      setMessage({
        type: "success",
        text: t("userManagement.userApprovedSuccessfully"),
      });
      loadUsers();
    } else {
      const errorMessage =
        typeof result.error.message === "string"
          ? result.error.message
          : t("userManagement.errors.approvingUser");
      setMessage({ type: "error", text: errorMessage });
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    // Convert string to Role enum
    const roleEnum = newRole as Role;
    const roleUpdate: RoleUpdate = { role: roleEnum };
    const result = await authService.updateUserRole(token, userId, roleUpdate);
    if (result.isOk()) {
      setMessage({
        type: "success",
        text: t("userManagement.userRoleUpdatedSuccessfully"),
      });
      loadUsers();
    } else {
      const errorMessage =
        typeof result.error.message === "string"
          ? result.error.message
          : t("userManagement.errors.updatingUserRole");
      setMessage({ type: "error", text: errorMessage });
    }
  };

  const handleDeleteUser = (userId: number, username: string) => {
    const confirmDelete = async () => {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      const result = await authService.deleteUserByAdmin(token, userId);
      if (result.isOk()) {
        setMessage({
          type: "success",
          text: t("userManagement.userDeletedSuccessfully"),
        });
        loadUsers();
      } else {
        const errorMessage =
          typeof result.error.message === "string"
            ? result.error.message
            : t("userManagement.errors.deletingUser");
        setMessage({ type: "error", text: errorMessage });
      }

      setConfirmModal({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: () => {},
      });
    };

    setConfirmModal({
      isOpen: true,
      title: t("userManagement.deleteUser"),
      message: t("userManagement.areYouSureDeleteUser", { username }),
      onConfirm: confirmDelete,
    });
  };

  if (!isAdmin) {
    return (
      <div className={styles.container}>
        <div className={styles.accessDenied}>
          <h2>{t("userManagement.accessDenied")}</h2>
          <p>{t("userManagement.needAdministratorPrivileges")}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>{t("userManagement.loadingUsers")}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.containerHeader}>
        <h1 className={styles.title}>{t("userManagement.title")}</h1>
        <button onClick={loadUsers} className={styles.refreshButton}>
          {t("common.refresh")}
        </button>
      </div>

      {message && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t("userManagement.id")}</th>
              <th>{t("auth.username")}</th>
              <th>{t("auth.email")}</th>
              <th>{t("userManagement.role")}</th>
              <th>{t("userManagement.status")}</th>
              <th>{t("common.approved")}</th>
              <th>{t("userManagement.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((userItem) => (
              <tr key={userItem.id}>
                <td>{userItem.id}</td>
                <td>{userItem.username}</td>
                <td>{userItem.email}</td>
                <td>
                  <select
                    value={userItem.role || RoleEnum.USER}
                    onChange={(e) =>
                      handleRoleChange(userItem.id, e.target.value)
                    }
                    className={styles.roleSelect}
                    disabled={userItem.id === user?.id}
                  >
                    <option value={RoleEnum.USER}>
                      {t("userManagement.roles.user")}
                    </option>
                    <option value={RoleEnum.OPERATOR}>
                      {t("userManagement.roles.operator")}
                    </option>
                    <option value={RoleEnum.ADMIN}>
                      {t("userManagement.roles.admin")}
                    </option>
                  </select>
                </td>
                <td>
                  <span
                    className={`${styles.status} ${userItem.is_active ? styles.active : styles.inactive}`}
                  >
                    {userItem.is_active
                      ? t("common.active")
                      : t("common.inactive")}
                  </span>
                </td>
                <td>
                  <span
                    className={`${styles.approval} ${userItem.is_approved ? styles.approved : styles.pending}`}
                  >
                    {userItem.is_approved
                      ? t("common.approved")
                      : t("common.pending")}
                  </span>
                </td>
                <td>
                  <div className={styles.actions}>
                    {!userItem.is_approved && (
                      <button
                        onClick={() => handleApproveUser(userItem.id)}
                        className={`${styles.actionButton} ${styles.approve}`}
                      >
                        {t("common.approve")}
                      </button>
                    )}
                    {userItem.id !== user?.id && (
                      <button
                        onClick={() =>
                          handleDeleteUser(userItem.id, userItem.username)
                        }
                        className={`${styles.actionButton} ${styles.delete}`}
                      >
                        {t("common.delete")}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <div className={styles.noUsers}>
          <p>{t("userManagement.noUsersFound")}</p>
        </div>
      )}

      {/* Confirmation Modal */}
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
