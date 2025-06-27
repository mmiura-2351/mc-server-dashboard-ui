"use client";

import { useState } from "react";
import Image from "next/image";
import { useAuth } from "@/contexts/auth";
import { useTranslation } from "@/contexts/language";
import type { UserCreate } from "@/types/auth";
import { InputSanitizer } from "@/utils/input-sanitizer";
import { LanguageDropdown } from "@/components/language/language-dropdown";
import styles from "./auth-form.module.css";

interface RegisterFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export function RegisterForm({
  onSuccess,
  onSwitchToLogin,
}: RegisterFormProps) {
  const { register, isLoading } = useAuth();
  const { t } = useTranslation();
  const [formData, setFormData] = useState<UserCreate>({
    username: "",
    email: "",
    password: "",
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Sanitize inputs
    const sanitizedUsername = InputSanitizer.sanitizeUsername(
      formData.username
    );
    const sanitizedEmail = InputSanitizer.sanitizeEmail(formData.email);
    const sanitizedPassword = formData.password.trim();
    const sanitizedConfirmPassword = confirmPassword.trim();

    // Enhanced validation
    if (!sanitizedUsername) {
      setError(t("auth.errors.usernameRequired"));
      return;
    }

    if (!sanitizedEmail) {
      setError(t("auth.errors.emailRequired"));
      return;
    }

    if (!sanitizedPassword) {
      setError(t("auth.errors.passwordRequired"));
      return;
    }

    if (!sanitizedConfirmPassword) {
      setError(t("auth.errors.confirmPasswordRequired"));
      return;
    }

    // Username validation
    if (sanitizedUsername.length < 3) {
      setError(t("auth.errors.usernameMinLength"));
      return;
    }

    if (sanitizedUsername.length > 50) {
      setError(t("auth.errors.usernameMaxLength"));
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      setError(t("auth.errors.emailInvalid"));
      return;
    }

    // Password validation using secure validator
    const passwordValidation =
      InputSanitizer.validatePassword(sanitizedPassword);
    if (!passwordValidation.isValid) {
      setError(
        passwordValidation.errors[0] || t("auth.errors.passwordMinLength")
      ); // Show first error
      return;
    }

    if (sanitizedPassword !== sanitizedConfirmPassword) {
      setError(t("auth.errors.passwordsDoNotMatch"));
      return;
    }

    const result = await register({
      username: sanitizedUsername,
      email: sanitizedEmail,
      password: sanitizedPassword,
    });

    if (result.isErr()) {
      // Handle specific error cases
      if (result.error.status === 409) {
        setError(t("auth.errors.usernameExists"));
      } else if (result.error.status === 422) {
        setError(t("auth.errors.emailRequired"));
      } else {
        setError(t("auth.errors.registrationFailed"));
      }
      return;
    }

    // Check user approval status
    const user = result.value;
    if (user.is_approved) {
      setSuccess(t("messages.registrationSuccess"));
    } else {
      setSuccess(t("messages.registrationSuccessPending"));
    }

    setFormData({ username: "", email: "", password: "" });
    setConfirmPassword("");
    onSuccess?.();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Apply basic sanitization on input
    let sanitizedValue = value;
    if (name === "username") {
      // Real-time sanitization for username (less strict for UX)
      sanitizedValue = InputSanitizer.sanitizeText(value);
    } else if (name === "email") {
      // Real-time sanitization for email
      sanitizedValue = InputSanitizer.sanitizeText(value).toLowerCase();
    } else if (name === "password" || name === "confirmPassword") {
      // For passwords, only remove null bytes and control characters
      sanitizedValue = InputSanitizer.sanitizeText(value);
    }

    if (name === "confirmPassword") {
      setConfirmPassword(sanitizedValue);
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: sanitizedValue,
      }));
    }

    // Clear errors when user starts typing
    if (error) {
      setError("");
    }
    if (success) {
      setSuccess("");
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t("auth.register")}</h2>
        <LanguageDropdown variant="header" compact />
      </div>

      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className={styles.success} role="alert">
          {success}
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
          autoComplete="username"
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="email" className={styles.label}>
          {t("auth.email")}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleInputChange}
          className={styles.input}
          disabled={isLoading}
          required
          maxLength={254}
          autoComplete="email"
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
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            title={t("auth.errors.passwordMinLength")}
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

      <div className={styles.field}>
        <label htmlFor="confirmPassword" className={styles.label}>
          {t("auth.confirmPassword")}
        </label>
        <div className={styles.passwordWrapper}>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={handleInputChange}
            className={styles.passwordInput}
            disabled={isLoading}
            required
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
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
              src={showConfirmPassword ? "/eye-visible.svg" : "/eye-hidden.svg"}
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
        {isLoading ? t("auth.registering") : t("auth.register")}
      </button>

      {onSwitchToLogin && (
        <p className={styles.switchText}>
          {t("auth.alreadyHaveAccount")}{" "}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className={styles.switchButton}
            disabled={isLoading}
          >
            {t("auth.loginHere")}
          </button>
        </p>
      )}
    </form>
  );
}
