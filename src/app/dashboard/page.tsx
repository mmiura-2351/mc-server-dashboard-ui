"use client";

import { useAuth } from "@/contexts/auth";
import { ServerDashboard } from "@/components/server/server-dashboard";
import { MainLayout } from "@/components/layout/main-layout";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/");
    } else if (!isLoading && isAuthenticated && !user?.is_approved) {
      // Redirect to main page if not approved
      router.push("/");
    }
  }, [isAuthenticated, isLoading, user, router]);

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

  if (!isAuthenticated || !user?.is_approved) {
    return null; // Will redirect
  }

  return (
    <MainLayout>
      <ServerDashboard />
    </MainLayout>
  );
}
