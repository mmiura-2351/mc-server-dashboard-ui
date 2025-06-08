"use client";

import { useAuth } from "@/contexts/auth";
import { AuthPage } from "@/components/auth/auth-page";
import { MainLayout } from "@/components/layout/main-layout";
import { ServerDashboard } from "@/components/server/server-dashboard";

export function App() {
  const { isAuthenticated, isLoading } = useAuth();

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

  return (
    <MainLayout>
      <ServerDashboard />
    </MainLayout>
  );
}
