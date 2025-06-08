"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "./login-form";
import { RegisterForm } from "./register-form";
import styles from "./auth-page.module.css";

type AuthMode = "login" | "register";

interface AuthPageProps {
  initialMode?: AuthMode;
}

export function AuthPage({ initialMode = "login" }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const router = useRouter();

  const handleSwitchMode = () => {
    setMode((prev) => (prev === "login" ? "register" : "login"));
  };

  const handleLoginSuccess = () => {
    router.push("/account");
  };

  const handleRegisterSuccess = () => {
    // After registration, switch to login mode
    setMode("login");
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.appTitle}>MC Server Dashboard</h1>
          <p className={styles.subtitle}>
            {mode === "login"
              ? "Sign in to your account"
              : "Create a new account"}
          </p>
        </div>

        <div className={styles.formContainer}>
          {mode === "login" ? (
            <LoginForm
              onSuccess={handleLoginSuccess}
              onSwitchToRegister={handleSwitchMode}
            />
          ) : (
            <RegisterForm
              onSuccess={handleRegisterSuccess}
              onSwitchToLogin={handleSwitchMode}
            />
          )}
        </div>
      </div>
    </div>
  );
}
