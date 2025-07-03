/**
 * Optimized user table row component with React.memo
 * Renders individual user items in the user management table
 */

"use client";

import React from "react";
import { useTranslation } from "@/contexts/language";
import type { User } from "@/types/auth";
import { Role as RoleEnum } from "@/types/auth";
import styles from "./user-management.module.css";

interface UserTableRowProps {
  user: User;
  currentUser: User;
  onApproveUser: (userId: number) => void;
  onRoleChange: (userId: number, newRole: string) => void;
  onDeleteUser: (userId: number, username: string) => void;
}

/**
 * UserTableRow Component - Memoized for performance optimization
 *
 * This component renders individual user items in the user management table.
 * It's wrapped with React.memo to prevent unnecessary re-renders when parent
 * component updates but this item's props haven't changed.
 */
export const UserTableRow = React.memo<UserTableRowProps>(
  function UserTableRow({
    user,
    currentUser,
    onApproveUser,
    onRoleChange,
    onDeleteUser,
  }) {
    const { t } = useTranslation();

    const isCurrentUser = user.id === currentUser.id;

    return (
      <tr key={user.id}>
        <td>{user.id}</td>
        <td>{user.username}</td>
        <td>{user.email}</td>
        <td>
          <select
            value={user.role || RoleEnum.USER}
            onChange={(e) => onRoleChange(user.id, e.target.value)}
            className={styles.roleSelect}
            disabled={isCurrentUser}
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
            className={`${styles.status} ${user.is_active ? styles.active : styles.inactive}`}
          >
            {user.is_active ? t("common.active") : t("common.inactive")}
          </span>
        </td>
        <td>
          <span
            className={`${styles.approval} ${user.is_approved ? styles.approved : styles.pending}`}
          >
            {user.is_approved ? t("common.approved") : t("common.pending")}
          </span>
        </td>
        <td>
          <div className={styles.actions}>
            {!user.is_approved && (
              <button
                onClick={() => onApproveUser(user.id)}
                className={`${styles.actionButton} ${styles.approve}`}
              >
                {t("common.approve")}
              </button>
            )}
            {!isCurrentUser && (
              <button
                onClick={() => onDeleteUser(user.id, user.username)}
                className={`${styles.actionButton} ${styles.delete}`}
              >
                {t("common.delete")}
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  }
);

UserTableRow.displayName = "UserTableRow";
