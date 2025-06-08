"use client";

import { useAuth } from "@/contexts/auth";
import { MainLayout } from "@/components/layout/main-layout";
import { AccountSettings } from "@/components/account/account-settings";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AccountPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/");
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
    return null; // Will redirect to home
  }

  return (
    <MainLayout>
      <AccountSettings />
    </MainLayout>
  );
}
