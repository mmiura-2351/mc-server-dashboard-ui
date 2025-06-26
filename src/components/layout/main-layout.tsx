"use client";

import { useAuth } from "@/contexts/auth";
import { useTranslation } from "@/contexts/language";
import { useRouter, usePathname } from "next/navigation";
import { Role } from "@/types/auth";
import { useState, useEffect } from "react";
import styles from "./main-layout.module.css";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Close menu when pressing escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

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

          {/* Mobile menu button */}
          <button
            className={styles.menuButton}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={t("layout.toggleMenu")}
          >
            <span className={styles.menuIcon}>
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>

          {/* Desktop navigation */}
          <nav className={`${styles.navigation} ${styles.desktopNav}`}>
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

          <div className={`${styles.userSection} ${styles.desktopUser}`}>
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

      {/* Mobile menu backdrop */}
      {isMenuOpen && (
        <div
          className={styles.menuBackdrop}
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Mobile navigation overlay */}
      <div
        className={`${styles.mobileNav} ${isMenuOpen ? styles.mobileNavOpen : ""}`}
      >
        <div className={styles.mobileNavContent}>
          <div className={styles.mobileNavHeader}>
            <div className={styles.mobileUserSection}>
              <div className={styles.userInfo}>
                <span className={styles.username}>{user.username}</span>
                <span className={styles.userRole}>{user.role}</span>
                {!user.is_approved && (
                  <span className={styles.pendingApproval}>
                    {t("layout.pendingApproval")}
                  </span>
                )}
              </div>
            </div>
            <button
              className={styles.mobileCloseButton}
              onClick={() => setIsMenuOpen(false)}
              aria-label={t("layout.closeMenu")}
            >
              ×
            </button>
          </div>

          <nav className={styles.mobileNavItems}>
            <div className={styles.mobileNavSection}>
              <span className={styles.navSectionTitle}>
                {t("navigation.management")}
              </span>
              {navigationItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className={`${styles.mobileNavItem} ${item.active ? styles.mobileNavItemActive : ""}`}
                  disabled={!user.is_approved && item.path !== "/"}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  <span className={styles.navLabel}>{item.label}</span>
                </button>
              ))}
            </div>

            <div className={styles.mobileNavSection}>
              <span className={styles.navSectionTitle}>
                {t("navigation.resources")}
              </span>
              {resourceItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className={`${styles.mobileNavItem} ${item.active ? styles.mobileNavItemActive : ""}`}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  <span className={styles.navLabel}>{item.label}</span>
                </button>
              ))}
            </div>

            <div className={styles.mobileNavSection}>
              <span className={styles.navSectionTitle}>
                {t("navigation.account")}
              </span>
              {accountItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className={`${styles.mobileNavItem} ${item.active ? styles.mobileNavItemActive : ""}`}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  <span className={styles.navLabel}>{item.label}</span>
                </button>
              ))}
            </div>
          </nav>

          <button onClick={handleLogout} className={styles.mobileLogoutButton}>
            {t("common.logout")}
          </button>
        </div>
      </div>

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
