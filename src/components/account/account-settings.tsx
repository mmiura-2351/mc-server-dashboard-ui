"use client";

import { useState } from "react";
import Image from "next/image";
import { useAuth } from "@/contexts/auth";
import { useTranslation } from "@/contexts/language";
import { LanguageSwitcher } from "@/components/language/language-switcher";
import { translateError } from "@/utils/error-translation";
import type { UserUpdate, PasswordUpdate, UserDelete } from "@/types/auth";
import styles from "./account-settings.module.css";

export function AccountSettings() {
  const { user, updateUserInfo, updatePassword, deleteAccount } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<
    "profile" | "password" | "language" | "danger"
  >("profile");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Profile update form
  const [profileForm, setProfileForm] = useState<UserUpdate>({
    username: user?.username || "",
    email: user?.email || "",
  });

  // Password update form
  const [passwordForm, setPasswordForm] = useState<PasswordUpdate>({
    current_password: "",
    new_password: "",
  });
  const [confirmPassword, setConfirmPassword] = useState("");

  // Delete account form
  const [deleteForm, setDeleteForm] = useState<UserDelete>({
    password: "",
  });
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  // Password visibility states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showDeletePassword, setShowDeletePassword] = useState(false);

  // Password visibility toggle functions
  const toggleCurrentPasswordVisibility = () => {
    setShowCurrentPassword(!showCurrentPassword);
  };

  const toggleNewPasswordVisibility = () => {
    setShowNewPassword(!showNewPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const toggleDeletePasswordVisibility = () => {
    setShowDeletePassword(!showDeletePassword);
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.username && !profileForm.email) return;

    setIsLoading(true);
    setMessage(null);

    const result = await updateUserInfo(profileForm);
    if (result.isOk()) {
      setMessage({
        type: "success",
        text: t("account.profileUpdatedSuccessfully"),
      });
    } else {
      setMessage({ type: "error", text: translateError(result.error, t) });
    }
    setIsLoading(false);
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new_password !== confirmPassword) {
      setMessage({ type: "error", text: t("account.newPasswordsDoNotMatch") });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    const result = await updatePassword(passwordForm);
    if (result.isOk()) {
      setMessage({
        type: "success",
        text: t("account.passwordUpdatedSuccessfully"),
      });
      setPasswordForm({ current_password: "", new_password: "" });
      setConfirmPassword("");
    } else {
      setMessage({ type: "error", text: translateError(result.error, t) });
    }
    setIsLoading(false);
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmation !== t("account.deleteConfirmationText")) {
      setMessage({
        type: "error",
        text: t("account.pleaseTypeDeleteToConfirm"),
      });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    const result = await deleteAccount(deleteForm);
    if (result.isErr()) {
      setMessage({ type: "error", text: result.error.message });
      setIsLoading(false);
    }
    // If successful, user will be logged out and redirected
  };

  if (!user) return null;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{t("account.title")}</h1>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "profile" ? styles.active : ""}`}
          onClick={() => setActiveTab("profile")}
        >
          {t("account.profile")}
        </button>
        <button
          className={`${styles.tab} ${activeTab === "password" ? styles.active : ""}`}
          onClick={() => setActiveTab("password")}
        >
          {t("auth.password")}
        </button>
        <button
          className={`${styles.tab} ${activeTab === "language" ? styles.active : ""}`}
          onClick={() => setActiveTab("language")}
        >
          {t("language.switchLanguage")}
        </button>
        <button
          className={`${styles.tab} ${activeTab === "danger" ? styles.active : ""}`}
          onClick={() => setActiveTab("danger")}
        >
          {t("account.dangerZone")}
        </button>
      </div>

      {message && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      {activeTab === "profile" && (
        <div className={styles.tabContent}>
          <h2>{t("account.profileInformation")}</h2>
          <form onSubmit={handleProfileUpdate} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="username">{t("auth.username")}</label>
              <input
                id="username"
                type="text"
                value={profileForm.username}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, username: e.target.value })
                }
                placeholder={t("account.enterNewUsername")}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="email">{t("auth.email")}</label>
              <input
                id="email"
                type="email"
                value={profileForm.email}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, email: e.target.value })
                }
                placeholder={t("account.enterNewEmail")}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className={styles.button}
            >
              {isLoading ? t("account.updating") : t("account.updateProfile")}
            </button>
          </form>
        </div>
      )}

      {activeTab === "password" && (
        <div className={styles.tabContent}>
          <h2>{t("account.changePassword")}</h2>
          <form onSubmit={handlePasswordUpdate} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="current_password">
                {t("auth.currentPassword")}
              </label>
              <div className={styles.passwordWrapper}>
                <input
                  id="current_password"
                  type={showCurrentPassword ? "text" : "password"}
                  value={passwordForm.current_password}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      current_password: e.target.value,
                    })
                  }
                  className={styles.passwordInput}
                  required
                />
                <button
                  type="button"
                  className={styles.toggleButton}
                  onClick={toggleCurrentPasswordVisibility}
                  disabled={isLoading}
                  aria-label={
                    showCurrentPassword
                      ? t("auth.hidePassword")
                      : t("auth.showPassword")
                  }
                  title={
                    showCurrentPassword
                      ? t("auth.hidePassword")
                      : t("auth.showPassword")
                  }
                >
                  <Image
                    src={
                      showCurrentPassword
                        ? "/eye-visible.svg"
                        : "/eye-hidden.svg"
                    }
                    alt=""
                    width={20}
                    height={20}
                    className={styles.toggleIcon}
                  />
                </button>
              </div>
            </div>
            <div className={styles.field}>
              <label htmlFor="new_password">{t("auth.newPassword")}</label>
              <div className={styles.passwordWrapper}>
                <input
                  id="new_password"
                  type={showNewPassword ? "text" : "password"}
                  value={passwordForm.new_password}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      new_password: e.target.value,
                    })
                  }
                  className={styles.passwordInput}
                  required
                />
                <button
                  type="button"
                  className={styles.toggleButton}
                  onClick={toggleNewPasswordVisibility}
                  disabled={isLoading}
                  aria-label={
                    showNewPassword
                      ? t("auth.hidePassword")
                      : t("auth.showPassword")
                  }
                  title={
                    showNewPassword
                      ? t("auth.hidePassword")
                      : t("auth.showPassword")
                  }
                >
                  <Image
                    src={
                      showNewPassword ? "/eye-visible.svg" : "/eye-hidden.svg"
                    }
                    alt=""
                    width={20}
                    height={20}
                    className={styles.toggleIcon}
                  />
                </button>
              </div>
            </div>
            <div className={styles.field}>
              <label htmlFor="confirm_password">
                {t("auth.confirmNewPassword")}
              </label>
              <div className={styles.passwordWrapper}>
                <input
                  id="confirm_password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={styles.passwordInput}
                  required
                />
                <button
                  type="button"
                  className={styles.toggleButton}
                  onClick={toggleConfirmPasswordVisibility}
                  disabled={isLoading}
                  aria-label={
                    showConfirmPassword
                      ? t("auth.hidePassword")
                      : t("auth.showPassword")
                  }
                  title={
                    showConfirmPassword
                      ? t("auth.hidePassword")
                      : t("auth.showPassword")
                  }
                >
                  <Image
                    src={
                      showConfirmPassword
                        ? "/eye-visible.svg"
                        : "/eye-hidden.svg"
                    }
                    alt=""
                    width={20}
                    height={20}
                    className={styles.toggleIcon}
                  />
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className={styles.button}
            >
              {isLoading ? t("account.updating") : t("account.updatePassword")}
            </button>
          </form>
        </div>
      )}

      {activeTab === "language" && (
        <div className={styles.tabContent}>
          <h2>{t("language.switchLanguage")}</h2>
          <div className={styles.languageSection}>
            <p>{t("language.languageDescription")}</p>
            <LanguageSwitcher variant="settings" />
          </div>
        </div>
      )}

      {activeTab === "danger" && (
        <div className={styles.tabContent}>
          <h2>{t("account.deleteAccount")}</h2>
          <div className={styles.dangerZone}>
            <p>{t("account.onceYouDeleteYourAccount")}</p>
            <form onSubmit={handleDeleteAccount} className={styles.form}>
              <div className={styles.field}>
                <label htmlFor="delete_password">{t("auth.password")}</label>
                <div className={styles.passwordWrapper}>
                  <input
                    id="delete_password"
                    type={showDeletePassword ? "text" : "password"}
                    value={deleteForm.password}
                    onChange={(e) =>
                      setDeleteForm({ password: e.target.value })
                    }
                    className={styles.passwordInput}
                    required
                  />
                  <button
                    type="button"
                    className={styles.toggleButton}
                    onClick={toggleDeletePasswordVisibility}
                    disabled={isLoading}
                    aria-label={
                      showDeletePassword
                        ? t("auth.hidePassword")
                        : t("auth.showPassword")
                    }
                    title={
                      showDeletePassword
                        ? t("auth.hidePassword")
                        : t("auth.showPassword")
                    }
                  >
                    <Image
                      src={
                        showDeletePassword
                          ? "/eye-visible.svg"
                          : "/eye-hidden.svg"
                      }
                      alt=""
                      width={20}
                      height={20}
                      className={styles.toggleIcon}
                    />
                  </button>
                </div>
              </div>
              <div className={styles.field}>
                <label htmlFor="delete_confirmation">
                  {t("account.typeDeleteToConfirm")}{" "}
                  <strong>{t("account.deleteConfirmationText")}</strong>
                </label>
                <input
                  id="delete_confirmation"
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className={`${styles.button} ${styles.danger}`}
              >
                {isLoading ? t("account.deleting") : t("account.deleteAccount")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
