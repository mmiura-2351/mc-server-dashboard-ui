"use client";

import { useAuth } from "@/contexts/auth";
import { useTranslation } from "@/contexts/language";
import { LazyAdminPanel } from "@/components/admin/LazyAdminPanel";
import { Role } from "@/types/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== Role.ADMIN)) {
      router.push("/"); // Redirect non-admin users
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
        {t("common.loading")}
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== Role.ADMIN) {
    return null; // Will redirect
  }

  return <LazyAdminPanel />;
}
