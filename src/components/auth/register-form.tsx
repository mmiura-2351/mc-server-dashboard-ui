"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth";
import type { UserCreate } from "@/types/auth";
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

    if (
      !formData.username.trim() ||
      !formData.email.trim() ||
      !formData.password.trim() ||
      !confirmPassword.trim()
    ) {
      setError("All fields are required");
      return;
    }

    if (formData.password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    const result = await register(formData);
    if (result.isErr()) {
      setError(result.error.message);
      return;
    }

    // 登録されたユーザーの承認状態をチェック
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
    if (name === "confirmPassword") {
      setConfirmPassword(value);
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
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
