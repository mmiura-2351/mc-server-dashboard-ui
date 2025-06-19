"use client";

import { useState, useCallback, useMemo } from "react";
import type { FileSystemItem } from "@/types/files";

export function useFileNavigation(initialPath = "/") {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [files, setFiles] = useState<FileSystemItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigateToPath = useCallback((path: string) => {
    setCurrentPath(path);
  }, []);

  const navigateUp = useCallback(() => {
    if (currentPath === "/") return;

    const pathParts = currentPath.split("/").filter(Boolean);
    const parentPath =
      pathParts.length > 1 ? "/" + pathParts.slice(0, -1).join("/") : "/";

    setCurrentPath(parentPath);
  }, [currentPath]);

  const navigateToFile = useCallback(
    (file: FileSystemItem) => {
      if (file.is_directory) {
        const newPath =
          currentPath === "/" ? `/${file.name}` : `${currentPath}/${file.name}`;
        setCurrentPath(newPath);
      }
    },
    [currentPath]
  );

  return useMemo(
    () => ({
      currentPath,
      files,
      isLoading,
      error,
      setFiles,
      setIsLoading,
      setError,
      navigateToPath,
      navigateUp,
      navigateToFile,
    }),
    [
      currentPath,
      files,
      isLoading,
      error,
      setFiles,
      setIsLoading,
      setError,
      navigateToPath,
      navigateUp,
      navigateToFile,
    ]
  );
}
