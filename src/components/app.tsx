"use client";

import { useAuth } from "@/contexts/auth";
import { AuthPage } from "@/components/auth/auth-page";
import { useRouter } from "next/navigation";
import { useRef } from "react";

export function App() {
  const { isAuthenticated, isLoading, isHydrated } = useAuth();
  const router = useRouter();
  const hasRedirected = useRef(false);

  // Wait for hydration to complete to prevent SSR mismatch
  if (!isHydrated) {
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

  // Immediate redirect for authenticated users after hydration
  if (isAuthenticated && !hasRedirected.current) {
    hasRedirected.current = true;
    // Use replace to avoid adding to history and setTimeout to ensure DOM is ready
    setTimeout(() => router.replace("/dashboard"), 0);
    return null; // Prevent any rendering while redirecting
  }

  // Early return for authenticated users - completely skip rendering
  if (isAuthenticated) {
    return null;
  }

  // Show minimal loading state only when actually loading
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

  // Show login page for unauthenticated users
  return <AuthPage />;
}
