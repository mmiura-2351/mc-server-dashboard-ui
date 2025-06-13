"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/contexts/language";
import { AccountSettings } from "@/components/account/account-settings";
import { Role } from "@/types/auth";
import styles from "./dashboard.module.css";

type ActiveTab = "overview" | "account";

export function Dashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");

  if (!user) {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const isAdmin = user.role === Role.ADMIN;

  const handleAccountSettings = () => {
    router.push("/account");
  };

  const handleUserManagement = () => {
    router.push("/admin");
  };

  const handleServerDashboard = () => {
    router.push("/dashboard");
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('dashboard.title')}</h1>
        <div className={styles.userInfo}>
          <span className={styles.username}>{t('dashboard.welcome', { username: user.username })}</span>
          <button onClick={handleLogout} className={styles.logoutButton}>
            {t('common.logout')}
          </button>
        </div>
      </header>

      <nav className={styles.navigation}>
        <button
          className={`${styles.navButton} ${activeTab === "overview" ? styles.active : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          {t('dashboard.overview')}
        </button>
        <button
          className={`${styles.navButton} ${activeTab === "account" ? styles.active : ""}`}
          onClick={() => setActiveTab("account")}
        >
          {t('dashboard.accountSettings')}
        </button>
      </nav>

      <main className={styles.main}>
        {activeTab === "overview" && (
          <div className={styles.tabContent}>
            <div className={styles.statusCard}>
              <h2 className={styles.cardTitle}>{t('dashboard.accountStatus')}</h2>
              <div className={styles.statusGrid}>
                <div className={styles.statusItem}>
                  <span className={styles.statusLabel}>{t('dashboard.fields.username')}</span>
                  <span className={styles.statusValue}>{user.username}</span>
                </div>
                <div className={styles.statusItem}>
                  <span className={styles.statusLabel}>{t('dashboard.fields.email')}</span>
                  <span className={styles.statusValue}>{user.email}</span>
                </div>
                <div className={styles.statusItem}>
                  <span className={styles.statusLabel}>{t('dashboard.fields.role')}</span>
                  <span className={styles.statusValue}>
                    {user.role || "user"}
                  </span>
                </div>
                <div className={styles.statusItem}>
                  <span className={styles.statusLabel}>{t('dashboard.fields.active')}</span>
                  <span
                    className={`${styles.statusValue} ${user.is_active ? styles.active : styles.inactive}`}
                  >
                    {user.is_active ? t('common.yes') : t('common.no')}
                  </span>
                </div>
                <div className={styles.statusItem}>
                  <span className={styles.statusLabel}>{t('dashboard.fields.approved')}</span>
                  <span
                    className={`${styles.statusValue} ${user.is_approved ? styles.approved : styles.pending}`}
                  >
                    {user.is_approved ? t('common.yes') : t('common.pending')}
                  </span>
                </div>
              </div>

              {!user.is_approved && (
                <div className={styles.pendingNotice}>
                  <h3 className={styles.noticeTitle}>
                    {t('dashboard.accountPendingApproval')}
                  </h3>
                  <p className={styles.noticeText}>
                    {t('dashboard.accountPendingDescription')}
                  </p>
                  <p className={styles.noticeSubtext}>
                    {t('dashboard.accountPendingNote')}
                  </p>
                </div>
              )}
            </div>

            <div className={styles.quickActions}>
              <h2 className={styles.cardTitle}>{t('dashboard.quickActions')}</h2>
              <div className={styles.actionGrid}>
                <button
                  className={styles.actionButton}
                  onClick={handleAccountSettings}
                >
                  <span className={styles.actionIcon}>⚙️</span>
                  <span className={styles.actionText}>{t('dashboard.accountSettings')}</span>
                </button>
                {isAdmin && (
                  <button
                    className={styles.actionButton}
                    onClick={handleUserManagement}
                  >
                    <span className={styles.actionIcon}>👥</span>
                    <span className={styles.actionText}>{t('dashboard.manageUsers')}</span>
                  </button>
                )}
                <button
                  className={styles.actionButton}
                  onClick={handleServerDashboard}
                  disabled={!user.is_approved}
                >
                  <span className={styles.actionIcon}>🖥️</span>
                  <span className={styles.actionText}>{t('dashboard.manageServers')}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "account" && (
          <div className={styles.tabContent}>
            <AccountSettings />
          </div>
        )}
      </main>
    </div>
  );
}
