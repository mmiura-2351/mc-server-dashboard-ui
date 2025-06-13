"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth";
import type { LoginRequest } from "@/types/auth";
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

    if (!formData.username.trim() || !formData.password.trim()) {
      setError("Username and password are required");
      return;
    }

    setIsLoading(true);
    const result = await login(formData);
    setIsLoading(false);

    if (result.isErr()) {
      // 承認待ちの場合は特別なメッセージを表示
      if (
        result.error.status === 403 &&
        result.error.message.includes("pending approval")
      ) {
        setError(
          "Your account is pending approval. Please wait for an administrator to approve your account before you can log in."
        );
      } else {
        setError(result.error.message);
      }
      return;
    }

    onSuccess?.();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
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
