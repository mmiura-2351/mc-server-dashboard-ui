"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth";
import type { UserCreate } from "@/types/auth";
import { InputSanitizer } from "@/utils/input-sanitizer";
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
  const [formData, setFormData] = useState<UserCreate>({
    username: "",
    email: "",
    password: "",
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

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
      setError("Username is required and must contain only valid characters");
      return;
    }

    if (!sanitizedEmail) {
      setError("Email is required and must be valid");
      return;
    }

    if (!sanitizedPassword) {
      setError("Password is required");
      return;
    }

    if (!sanitizedConfirmPassword) {
      setError("Password confirmation is required");
      return;
    }

    // Username validation
    if (sanitizedUsername.length < 3) {
      setError("Username must be at least 3 characters long");
      return;
    }

    if (sanitizedUsername.length > 50) {
      setError("Username must not exceed 50 characters");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    // Password validation using secure validator
    const passwordValidation =
      InputSanitizer.validatePassword(sanitizedPassword);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors[0] || "Password validation failed"); // Show first error
      return;
    }

    if (sanitizedPassword !== sanitizedConfirmPassword) {
      setError("Passwords do not match");
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
        setError("Username or email already exists");
      } else if (result.error.status === 422) {
        setError("Invalid input data. Please check your entries.");
      } else {
        setError("Registration failed. Please try again.");
      }
      return;
    }

    // Check user approval status
    const user = result.value;
    if (user.is_approved) {
      setSuccess("Registration successful! You can now log in.");
    } else {
      setSuccess(
        "Registration successful! Your account is pending approval. Please wait for an administrator to approve your account before you can log in."
      );
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

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h2 className={styles.title}>Register</h2>

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
          Username
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
          title="Username must contain only letters, numbers, dots, underscores, and hyphens"
          autoComplete="username"
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="email" className={styles.label}>
          Email
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
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleInputChange}
          className={styles.input}
          disabled={isLoading}
          required
          minLength={8}
          maxLength={128}
          autoComplete="new-password"
          title="Password must be at least 8 characters with uppercase, lowercase, number, and special character"
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="confirmPassword" className={styles.label}>
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={handleInputChange}
          className={styles.input}
          disabled={isLoading}
          required
          minLength={8}
          maxLength={128}
          autoComplete="new-password"
        />
      </div>

      <button
        type="submit"
        className={styles.submitButton}
        disabled={isLoading}
      >
        {isLoading ? "Registering..." : "Register"}
      </button>

      {onSwitchToLogin && (
        <p className={styles.switchText}>
          Already have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className={styles.switchButton}
            disabled={isLoading}
          >
            Login here
          </button>
        </p>
      )}
    </form>
  );
}
