"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth";
import { useTranslation } from "@/contexts/language";
import * as serverService from "@/services/server";
import type { ServerProperties } from "@/types/server";
import styles from "./server-properties.module.css";

interface ServerPropertiesEditorProps {
  serverId: number;
}

// Helper function to get property labels from translations
function getPropertyLabel(key: string, t: (key: string) => string): string {
  // Try to get translation with fallback to key
  const translationKey = `servers.properties.labels.${key}`;
  const translated = t(translationKey);
  // If translation returns the key itself, it means translation is missing
  return translated === translationKey ? key : translated;
}

// Helper function to get property descriptions from translations
function getPropertyDescription(
  key: string,
  t: (key: string) => string
): string {
  // Try to get translation with fallback to empty string
  const translationKey = `servers.properties.descriptions.${key}`;
  const translated = t(translationKey);
  // If translation returns the key itself, it means translation is missing
  return translated === translationKey ? "" : translated;
}

export function ServerPropertiesEditor({
  serverId,
}: ServerPropertiesEditorProps) {
  const { logout } = useAuth();
  const { t } = useTranslation();
  const [properties, setProperties] = useState<ServerProperties | null>(null);
  const [editedProperties, setEditedProperties] = useState<
    Partial<ServerProperties>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fileNotFound, setFileNotFound] = useState(false);

  useEffect(() => {
    const loadProperties = async () => {
      setIsLoading(true);
      setError(null);
      setFileNotFound(false);

      const result = await serverService.getServerProperties(serverId);
      if (result.isOk()) {
        setProperties(result.value);
        setEditedProperties(result.value);
        setFileNotFound(false);
      } else {
        if (result.error.status === 401) {
          logout();
          return;
        }

        // Check if it's a 404 error (file not found)
        if (
          result.error.status === 404 ||
          result.error.message.toLowerCase().includes("not found") ||
          result.error.message.toLowerCase().includes("file not found")
        ) {
          setFileNotFound(true);
          setError(t("servers.fileNotFoundMessage"));

          // Create default properties for new servers
          const defaultProperties: ServerProperties = {
            "server-port": 25565,
            "max-players": 20,
            difficulty: "normal",
            gamemode: "survival",
            pvp: true,
            "spawn-protection": 16,
            "view-distance": 10,
            "simulation-distance": 10,
            "enable-command-block": false,
            motd: "A Minecraft Server",
            "white-list": false,
            "online-mode": true,
            "allow-flight": false,
            "spawn-monsters": true,
            "spawn-animals": true,
            "spawn-npcs": true,
            hardcore: false,
            "level-name": "world",
            "level-seed": "",
            "level-type": "minecraft:normal",
            "generate-structures": true,
          };

          setProperties(defaultProperties);
          setEditedProperties(defaultProperties);
        } else {
          setError(result.error.message);
        }
      }
      setIsLoading(false);
    };

    loadProperties();
  }, [serverId, logout, t]);

  const handleChange = (key: string, value: string) => {
    const initialValue = properties ? properties[key] : value;
    const isBooleanProperty = typeof initialValue === "boolean";

    setEditedProperties((prev) => ({
      ...prev,
      [key]: isBooleanProperty ? value === "true" : value,
    }));
    setSuccessMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!properties) return;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    // Only send changed properties
    const changedProperties: Partial<ServerProperties> = {};
    Object.entries(editedProperties).forEach(([key, value]) => {
      if (properties[key] !== value) {
        changedProperties[key] = value;
      }
    });

    if (Object.keys(changedProperties).length === 0) {
      setError(t("servers.properties.noChanges"));
      setIsSaving(false);
      return;
    }

    const result = await serverService.updateServerProperties(
      serverId,
      changedProperties
    );
    if (result.isOk()) {
      setSuccessMessage(t("servers.properties.updated"));
      const updatedProperties = properties
        ? { ...properties, ...changedProperties }
        : null;
      setProperties(updatedProperties as ServerProperties | null);
    } else {
      if (result.error.status === 401) {
        logout();
        return;
      }
      setError(result.error.message);
    }
    setIsSaving(false);
  };

  const handleReset = () => {
    if (properties) {
      setEditedProperties(properties);
      setSuccessMessage(null);
    }
  };

  const hasChanges =
    properties &&
    Object.entries(editedProperties).some(
      ([key, value]) => properties[key] !== value
    );

  if (isLoading) {
    return (
      <div className={styles.loading}>
        {t("servers.properties.loadingProperties")}
      </div>
    );
  }

  // Render property input with appropriate control based on initial value type
  const renderPropertyInput = (
    key: string,
    value: string | number | boolean
  ) => {
    const label = getPropertyLabel(key, t);
    const description = getPropertyDescription(key, t);

    // Check if the initial value (from original properties) was a boolean
    const initialValue = properties ? properties[key] : value;
    const isBooleanProperty = typeof initialValue === "boolean";

    return (
      <div key={key} className={styles.property}>
        <label htmlFor={key}>
          {label}
          {description && (
            <span className={styles.description}>({description})</span>
          )}
        </label>

        {isBooleanProperty ? (
          <select
            id={key}
            value={String(value)}
            onChange={(e) => handleChange(key, e.target.value)}
            disabled={isSaving}
          >
            <option value="true">{t("common.true")}</option>
            <option value="false">{t("common.false")}</option>
          </select>
        ) : (
          <input
            id={key}
            type="text"
            value={String(value)}
            onChange={(e) => handleChange(key, e.target.value)}
            disabled={isSaving}
            placeholder={t("servers.enterPlaceholder", {
              label: label.toLowerCase(),
            })}
          />
        )}
      </div>
    );
  };

  if (error && !properties) {
    return (
      <div className={styles.error}>
        <p>
          {t("servers.properties.loadError")}: {error}
        </p>
      </div>
    );
  }

  if (!properties) {
    return (
      <div className={styles.error}>{t("servers.properties.noProperties")}</div>
    );
  }

  // Sort properties alphabetically for easy navigation
  const propertyKeys = Object.keys(properties).sort();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>{t("servers.properties.title")}</h2>
        <p className={styles.description}>
          {t("servers.properties.description")}
          {fileNotFound && (
            <>
              <br />
              <strong>{t("servers.properties.fileNotFound")}</strong>
            </>
          )}
        </p>
      </div>

      {error && (
        <div
          className={fileNotFound ? styles.warningBanner : styles.errorBanner}
        >
          {error}
          <button
            onClick={() => setError(null)}
            className={styles.dismissButton}
          >
            ×
          </button>
        </div>
      )}

      {successMessage && (
        <div className={styles.successBanner}>
          {successMessage}
          <button
            onClick={() => setSuccessMessage(null)}
            className={styles.dismissButton}
          >
            ×
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.section}>
          <h3>{t("servers.properties.title")}</h3>
          <p className={styles.sectionDescription}>
            {t("servers.properties.guidance")}
          </p>
          <div className={styles.propertyGrid}>
            {propertyKeys.map((key) => {
              const value =
                editedProperties[key] !== undefined
                  ? editedProperties[key]
                  : properties[key];
              return renderPropertyInput(key, value ?? "");
            })}
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            onClick={handleReset}
            className={styles.resetButton}
            disabled={isSaving || !hasChanges}
          >
            {t("servers.properties.resetChanges")}
          </button>
          <button
            type="submit"
            className={styles.saveButton}
            disabled={isSaving || !hasChanges}
          >
            {isSaving
              ? t("servers.properties.saving")
              : fileNotFound
                ? t("servers.properties.createFile")
                : t("servers.properties.saveProperties")}
          </button>
        </div>
      </form>
    </div>
  );
}
