"use client";

import { useAuth } from "@/contexts/auth";
import { AuthPage } from "@/components/auth/auth-page";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated && !hasRedirected.current) {
      hasRedirected.current = true;
      // Use replace instead of push to avoid back button issues
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading state
  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          fontSize: "1.125rem",
          color: "#6b7280",
        }}
      >
        Loading...
      </div>
    );
  }

  // If authenticated, show loading while redirecting to prevent flash
  if (isAuthenticated) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          fontSize: "1.125rem",
          color: "#6b7280",
        }}
      >
        Redirecting to dashboard...
      </div>
    );
  }

  // Show login page for unauthenticated users
  return <AuthPage />;
}
