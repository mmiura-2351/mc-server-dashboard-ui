"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth";
import { useRouter } from "next/navigation";
import { AccountSettings } from "@/components/account/account-settings";
import { Role } from "@/types/auth";
import styles from "./dashboard.module.css";

type ActiveTab = "overview" | "account";

export function Dashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
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
        <h1 className={styles.title}>MC Server Dashboard</h1>
        <div className={styles.userInfo}>
          <span className={styles.username}>Welcome, {user.username}</span>
          <button onClick={handleLogout} className={styles.logoutButton}>
            Logout
          </button>
        </div>
      </header>

      <nav className={styles.navigation}>
        <button
          className={`${styles.navButton} ${activeTab === "overview" ? styles.active : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>
        <button
          className={`${styles.navButton} ${activeTab === "account" ? styles.active : ""}`}
          onClick={() => setActiveTab("account")}
        >
          Account Settings
        </button>
      </nav>

      <main className={styles.main}>
        {activeTab === "overview" && (
          <div className={styles.tabContent}>
            <div className={styles.statusCard}>
              <h2 className={styles.cardTitle}>Account Status</h2>
              <div className={styles.statusGrid}>
                <div className={styles.statusItem}>
                  <span className={styles.statusLabel}>Username:</span>
                  <span className={styles.statusValue}>{user.username}</span>
                </div>
                <div className={styles.statusItem}>
                  <span className={styles.statusLabel}>Email:</span>
                  <span className={styles.statusValue}>{user.email}</span>
                </div>
                <div className={styles.statusItem}>
                  <span className={styles.statusLabel}>Role:</span>
                  <span className={styles.statusValue}>
                    {user.role || "user"}
                  </span>
                </div>
                <div className={styles.statusItem}>
                  <span className={styles.statusLabel}>Active:</span>
                  <span
                    className={`${styles.statusValue} ${user.is_active ? styles.active : styles.inactive}`}
                  >
                    {user.is_active ? "Yes" : "No"}
                  </span>
                </div>
                <div className={styles.statusItem}>
                  <span className={styles.statusLabel}>Approved:</span>
                  <span
                    className={`${styles.statusValue} ${user.is_approved ? styles.approved : styles.pending}`}
                  >
                    {user.is_approved ? "Yes" : "Pending"}
                  </span>
                </div>
              </div>

              {!user.is_approved && (
                <div className={styles.pendingNotice}>
                  <h3 className={styles.noticeTitle}>
                    Account Pending Approval
                  </h3>
                  <p className={styles.noticeText}>
                    Your account is currently pending approval by an
                    administrator. You will be able to access all features once
                    your account has been approved.
                  </p>
                  <p className={styles.noticeSubtext}>
                    If you have any questions, please contact your system
                    administrator.
                  </p>
                </div>
              )}
            </div>

            <div className={styles.quickActions}>
              <h2 className={styles.cardTitle}>Quick Actions</h2>
              <div className={styles.actionGrid}>
                <button
                  className={styles.actionButton}
                  onClick={handleAccountSettings}
                >
                  <span className={styles.actionIcon}>⚙️</span>
                  <span className={styles.actionText}>Account Settings</span>
                </button>
                {isAdmin && (
                  <button
                    className={styles.actionButton}
                    onClick={handleUserManagement}
                  >
                    <span className={styles.actionIcon}>👥</span>
                    <span className={styles.actionText}>Manage Users</span>
                  </button>
                )}
                <button
                  className={styles.actionButton}
                  onClick={handleServerDashboard}
                  disabled={!user.is_approved}
                >
                  <span className={styles.actionIcon}>🖥️</span>
                  <span className={styles.actionText}>Manage Servers</span>
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
