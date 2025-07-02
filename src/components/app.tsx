"use client";

import { useAuth } from "@/contexts/auth";
import { AuthPage } from "@/components/auth/auth-page";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function App() {
  const { isAuthenticated, isLoading, isHydrated } = useAuth();
  const router = useRouter();

  // Handle authenticated user redirect after hydration
  useEffect(() => {
    if (isHydrated && isAuthenticated && !isLoading) {
      router.replace("/dashboard");
    }
  }, [isHydrated, isAuthenticated, isLoading, router]);

  // Show loading while hydrating or while authenticated user is being redirected
  if (!isHydrated || (isAuthenticated && !isLoading)) {
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
