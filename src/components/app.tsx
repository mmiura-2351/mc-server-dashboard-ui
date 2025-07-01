"use client";

import { useAuth } from "@/contexts/auth";
import { AuthPage } from "@/components/auth/auth-page";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      // Redirect authenticated users to dashboard instead of rendering here
      router.push("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

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

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  // If authenticated, we redirect above, so this should not render
  return null;
}
