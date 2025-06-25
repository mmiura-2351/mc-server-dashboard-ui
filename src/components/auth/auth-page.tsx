"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoginForm } from "./login-form";
import { RegisterForm } from "./register-form";
import styles from "./auth-page.module.css";

type AuthMode = "login" | "register";

interface AuthPageProps {
  initialMode?: AuthMode;
}

export function AuthPage({ initialMode = "login" }: AuthPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get initial mode from URL params or fallback to initialMode prop
  const getInitialMode = (): AuthMode => {
    const modeParam = searchParams.get("mode");
    if (modeParam === "register" || modeParam === "login") {
      return modeParam;
    }
    return initialMode;
  };

  const [mode, setMode] = useState<AuthMode>(getInitialMode);

  // Update URL when mode changes
  const handleSwitchMode = () => {
    const newMode = mode === "login" ? "register" : "login";
    setMode(newMode);

    // Update URL with new mode parameter
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set("mode", newMode);
    router.replace(newUrl.pathname + newUrl.search, { scroll: false });
  };

  // Update mode when URL changes (e.g., browser back/forward)
  useEffect(() => {
    const modeParam = searchParams.get("mode");
    const urlMode: AuthMode =
      modeParam === "register" || modeParam === "login"
        ? modeParam
        : initialMode;

    if (urlMode !== mode) {
      setMode(urlMode);
    }
  }, [searchParams, mode, initialMode]);

  const handleLoginSuccess = () => {
    router.push("/dashboard");
  };

  const handleRegisterSuccess = () => {
    // After registration, switch to login mode and update URL
    setMode("login");

    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set("mode", "login");
    router.replace(newUrl.pathname + newUrl.search, { scroll: false });
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
