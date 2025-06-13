"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth";
import type { LoginRequest } from "@/types/auth";
import { InputSanitizer } from "@/utils/input-sanitizer";
import styles from "./auth-form.module.css";

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
}

export function LoginForm({ onSuccess, onSwitchToRegister }: LoginFormProps) {
  const { login } = useAuth();
  const [formData, setFormData] = useState<LoginRequest>({
    username: "",
    password: "",
  });
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Sanitize inputs
    const sanitizedUsername = InputSanitizer.sanitizeUsername(formData.username);
    const sanitizedPassword = formData.password.trim();

    // Enhanced validation
    if (!sanitizedUsername) {
      setError("Username is required and must contain only valid characters");
      return;
    }

    if (!sanitizedPassword) {
      setError("Password is required");
      return;
    }

    if (sanitizedUsername.length < 3) {
      setError("Username must be at least 3 characters long");
      return;
    }

    if (sanitizedPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setIsLoading(true);
    const result = await login({
      username: sanitizedUsername,
      password: sanitizedPassword,
    });
    setIsLoading(false);

    if (result.isErr()) {
      // Handle specific error cases
      if (
        result.error.status === 403 &&
        result.error.message.includes("pending approval")
      ) {
        setError(
          "Your account is pending approval. Please wait for an administrator to approve your account before you can log in."
        );
      } else if (result.error.status === 401) {
        setError("Invalid username or password");
      } else if (result.error.status === 429) {
        setError("Too many login attempts. Please try again later.");
      } else {
        setError("Login failed. Please try again.");
      }
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

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h2 className={styles.title}>Login</h2>

      {error && (
        <div className={styles.error} role="alert">
          {error}
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
          minLength={6}
          maxLength={128}
          autoComplete="current-password"
        />
      </div>

      <button
        type="submit"
        className={styles.submitButton}
        disabled={isLoading}
      >
        {isLoading ? "Logging in..." : "Login"}
      </button>

      {onSwitchToRegister && (
        <p className={styles.switchText}>
          Don&apos;t have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className={styles.switchButton}
            disabled={isLoading}
          >
            Register here
          </button>
        </p>
      )}
    </form>
  );
}
