"use client";

import { useState } from "react";
import Image from "next/image";
import { useAuth } from "@/contexts/auth";
import { useTranslation } from "@/contexts/language";
import type { LoginRequest } from "@/types/auth";
import { InputSanitizer } from "@/utils/input-sanitizer";
import { LanguageDropdown } from "@/components/language/language-dropdown";
import { translateError } from "@/utils/error-translation";
import styles from "./auth-form.module.css";

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
}

export function LoginForm({ onSuccess, onSwitchToRegister }: LoginFormProps) {
  const { login } = useAuth();
  const { t } = useTranslation();
  const [formData, setFormData] = useState<LoginRequest>({
    username: "",
    password: "",
  });
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Sanitize inputs
    const sanitizedUsername = InputSanitizer.sanitizeUsername(
      formData.username
    );
    const sanitizedPassword = formData.password.trim();

    // Enhanced validation
    if (!sanitizedUsername) {
      setError(t("auth.errors.usernameRequired"));
      return;
    }

    if (!sanitizedPassword) {
      setError(t("auth.errors.passwordRequired"));
      return;
    }

    if (sanitizedUsername.length < 3) {
      setError(t("auth.errors.usernameMinLength"));
      return;
    }

    if (sanitizedPassword.length < 6) {
      setError(t("auth.errors.passwordMinLength"));
      return;
    }

    setIsLoading(true);
    const result = await login({
      username: sanitizedUsername,
      password: sanitizedPassword,
    });
    setIsLoading(false);

    if (result.isErr()) {
      setError(translateError(result.error, t, { context: "auth" }));
      return;
    }

    onSuccess?.();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Apply basic sanitization on input
    let sanitizedValue = value;
    if (name === "username") {
      // Real-time sanitization for username (less strict for UX)
      sanitizedValue = InputSanitizer.sanitizeText(value);
    } else if (name === "password") {
      // For password, only remove null bytes and control characters
      sanitizedValue = InputSanitizer.sanitizeText(value);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: sanitizedValue,
    }));

    // Clear error when user starts typing
    if (error) {
      setError("");
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const errorId = "login-error";

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t("auth.login")}</h2>
        <LanguageDropdown variant="header" compact />
      </div>

      {error && (
        <div id={errorId} className={styles.error} role="alert">
          {error}
        </div>
      )}

      <div className={styles.field}>
        <label htmlFor="username" className={styles.label}>
          {t("auth.username")}
        </label>
        <input
          id="username"
          name="username"
          type="text"
          value={formData.username}
          onChange={handleInputChange}
          className={styles.input}
          disabled={isLoading}
          required
          minLength={3}
          maxLength={50}
          pattern="[a-zA-Z0-9._-]+"
          title={t("auth.usernameTooltip")}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? "true" : "false"}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="password" className={styles.label}>
          {t("auth.password")}
        </label>
        <div className={styles.passwordWrapper}>
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            value={formData.password}
            onChange={handleInputChange}
            className={styles.passwordInput}
            disabled={isLoading}
            required
            minLength={6}
            maxLength={128}
            autoComplete="current-password"
            aria-describedby={error ? errorId : undefined}
            aria-invalid={error ? "true" : "false"}
          />
          <button
            type="button"
            className={styles.toggleButton}
            onClick={togglePasswordVisibility}
            disabled={isLoading}
            aria-label={
              showPassword ? t("auth.hidePassword") : t("auth.showPassword")
            }
            title={
              showPassword ? t("auth.hidePassword") : t("auth.showPassword")
            }
          >
            <Image
              src={showPassword ? "/eye-visible.svg" : "/eye-hidden.svg"}
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
        className={styles.submitButton}
        disabled={isLoading}
      >
        {isLoading ? t("auth.loggingIn") : t("auth.login")}
      </button>

      {onSwitchToRegister && (
        <p className={styles.switchText}>
          {t("auth.dontHaveAccount")}{" "}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className={styles.switchButton}
            disabled={isLoading}
          >
            {t("auth.registerHere")}
          </button>
        </p>
      )}
    </form>
  );
}
