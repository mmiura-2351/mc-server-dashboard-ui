"use client";

import { useMemo } from "react";
import { useTranslation } from "@/contexts/language";

// Stable translation hook that memoizes translation functions
export function useStableTranslation() {
  const { t } = useTranslation();

  // Create stable translation functions for file operations
  const stableTranslations = useMemo(() => {
    return {
      downloadSuccess: (name: string) =>
        t("files.successfullyDownloaded", { name }),
      downloadFailed: (name: string) => t("files.downloadFailed", { name }),
      renameSuccess: () => t("files.successfullyRenamed"),
      renameFailed: () => t("files.renameFailed"),
      deleteSuccess: (name: string) => t("files.successfullyDeleted", { name }),
      deleteFailed: (name: string) => t("files.deleteFailed", { name }),
      deleteFile: () => t("files.deleteFile"),
      deleteFileConfirmation: (name: string) =>
        t("files.deleteFileConfirmation", { name }),
      deleteFiles: () => t("files.deleteFiles"),
      deleteBulkConfirmation: (count: string) =>
        t("files.deleteBulkConfirmation", { count }),
      deleteMultipleSuccess: (count: string) =>
        t("files.successfullyDeletedMultiple", { count }),
      deletePartialSuccess: (successCount: string, failCount: string) =>
        t("files.deletedPartialSuccess", { successCount, failCount }),
      bulkDownloadNotImplemented: () => t("files.bulkDownloadNotImplemented"),
      securityWarning: () => t("files.securityWarning"),
      blockedFilesMessage: () => t("files.blockedFilesMessage"),
      uploadError: () => t("files.uploadError"),
      noFilesAllowed: () => t("files.noFilesAllowed"),
      uploadFailed: () => t("files.uploadFailed"),
      uploadFailedWithReason: (reason: string) =>
        t("files.uploadFailedWithReason", { reason }),
    };
  }, [t]); // Only depend on t function

  return stableTranslations;
}
