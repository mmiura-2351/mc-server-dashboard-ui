"use client";

import { useAuth } from "@/contexts/auth";
import { useTranslation } from "@/contexts/language";
import { useRouter, usePathname } from "next/navigation";
import { Role } from "@/types/auth";
import styles from "./main-layout.module.css";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const isAdmin = user.role === Role.ADMIN;

  const navigationItems = [
    {
      label: t("navigation.servers"),
      path: "/",
      icon: "🖥️",
      active: pathname === "/" || pathname === "/dashboard",
    },
    {
      label: t("navigation.groups"),
      path: "/groups",
      icon: "👥",
      active: pathname === "/groups",
    },
  ];

  const resourceItems = [
    {
      label: t("navigation.docs"),
      path: "/docs",
      icon: "📖",
      active: pathname.startsWith("/docs"),
    },
  ];

  const accountItems = [
    {
      label: t("navigation.account"),
      path: "/account",
      icon: "⚙️",
      active: pathname === "/account",
    },
  ];

  if (isAdmin) {
    accountItems.push({
      label: t("navigation.users"),
      path: "/admin",
      icon: "👥",
      active: pathname === "/admin",
    });
  }

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.brand}>
            <h1 className={styles.brandTitle}>{t("layout.brandTitle")}</h1>
            <span className={styles.brandSubtitle}>
              {t("layout.brandSubtitle")}
            </span>
          </div>

          <nav className={styles.navigation}>
            <div className={styles.navSection}>
              <span className={styles.navSectionTitle}>
                {t("navigation.management")}
              </span>
              <div className={styles.navItems}>
                {navigationItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => router.push(item.path)}
                    className={`${styles.navItem} ${item.active ? styles.navItemActive : ""}`}
                    disabled={!user.is_approved && item.path !== "/"}
                  >
                    <span className={styles.navIcon}>{item.icon}</span>
                    <span className={styles.navLabel}>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.navSection}>
              <span className={styles.navSectionTitle}>
                {t("navigation.resources")}
              </span>
              <div className={styles.navItems}>
                {resourceItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => router.push(item.path)}
                    className={`${styles.navItem} ${item.active ? styles.navItemActive : ""}`}
                  >
                    <span className={styles.navIcon}>{item.icon}</span>
                    <span className={styles.navLabel}>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.navSection}>
              <span className={styles.navSectionTitle}>
                {t("navigation.account")}
              </span>
              <div className={styles.navItems}>
                {accountItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => router.push(item.path)}
                    className={`${styles.navItem} ${item.active ? styles.navItemActive : ""}`}
                  >
                    <span className={styles.navIcon}>{item.icon}</span>
                    <span className={styles.navLabel}>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </nav>

          <div className={styles.userSection}>
            <div className={styles.userInfo}>
              <span className={styles.username}>{user.username}</span>
              <span className={styles.userRole}>{user.role}</span>
              {!user.is_approved && (
                <span className={styles.pendingApproval}>
                  {t("layout.pendingApproval")}
                </span>
              )}
            </div>
            <button onClick={handleLogout} className={styles.logoutButton}>
              {t("common.logout")}
            </button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {!user.is_approved ? (
          <div className={styles.approvalNotice}>
            <div className={styles.approvalCard}>
              <h2>{t("layout.accountPendingApproval")}</h2>
              <p>{t("layout.accountPendingApprovalDescription")}</p>
              <p>{t("layout.accountPendingApprovalNote")}</p>
            </div>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
