"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth";
import * as serverService from "@/services/server";
import type { MinecraftServer, ServerUpdateRequest } from "@/types/server";
import styles from "./server-settings.module.css";

interface ServerSettingsProps {
  server: MinecraftServer;
  onUpdate: (updatedServer: MinecraftServer) => void;
}

export function ServerSettings({ server, onUpdate }: ServerSettingsProps) {
  const { logout } = useAuth();
  const [formData, setFormData] = useState({
    name: server.name,
    description: server.description || "",
    max_memory: server.max_memory,
    max_players: server.max_players,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Update form data when server prop changes
  useEffect(() => {
    setFormData({
      name: server.name,
      description: server.description || "",
      max_memory: server.max_memory,
      max_players: server.max_players,
    });
  }, [server]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "max_memory" || name === "max_players" ? parseInt(value) || 0 : value,
    }));
    setSuccessMessage(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError("Server name is required");
      return;
    }

    if (formData.max_memory < 512) {
      setError("Memory must be at least 512MB");
      return;
    }

    if (formData.max_players < 1 || formData.max_players > 200) {
      setError("Max players must be between 1 and 200");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    const updateData: ServerUpdateRequest = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      max_memory: formData.max_memory,
      max_players: formData.max_players,
    };

    const result = await serverService.updateServer(server.id, updateData);
    if (result.isOk()) {
      setSuccessMessage("Server settings updated successfully");
      onUpdate(result.value);
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
    setFormData({
      name: server.name,
      description: server.description || "",
      max_memory: server.max_memory,
      max_players: server.max_players,
    });
    setError(null);
    setSuccessMessage(null);
  };

  const hasChanges = 
    formData.name !== server.name ||
    formData.description !== (server.description || "") ||
    formData.max_memory !== server.max_memory ||
    formData.max_players !== server.max_players;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Server Settings</h2>
        <p className={styles.description}>
          Configure basic server settings. Changes will take effect after saving.
          Note: Some changes may require a server restart to take full effect.
        </p>
      </div>

      {error && (
        <div className={styles.errorBanner}>
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
          <h3>Basic Information</h3>
          
          <div className={styles.field}>
            <label htmlFor="name" className={styles.label}>
              Server Name *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              disabled={isSaving}
              className={styles.input}
              placeholder="Enter server name"
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="description" className={styles.label}>
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              disabled={isSaving}
              className={styles.textarea}
              placeholder="Enter server description (optional)"
              rows={3}
            />
          </div>
        </div>

        <div className={styles.section}>
          <h3>Server Resources</h3>
          
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="max_memory" className={styles.label}>
                Memory Limit (MB) *
              </label>
              <input
                id="max_memory"
                name="max_memory"
                type="number"
                min="512"
                max="32768"
                step="256"
                value={formData.max_memory}
                onChange={handleInputChange}
                disabled={isSaving}
                className={styles.input}
                required
              />
              <span className={styles.fieldHint}>
                Minimum: 512MB, Recommended: 2048MB or higher
              </span>
            </div>

            <div className={styles.field}>
              <label htmlFor="max_players" className={styles.label}>
                Max Players *
              </label>
              <input
                id="max_players"
                name="max_players"
                type="number"
                min="1"
                max="200"
                value={formData.max_players}
                onChange={handleInputChange}
                disabled={isSaving}
                className={styles.input}
                required
              />
              <span className={styles.fieldHint}>
                Range: 1-200 players
              </span>
            </div>
          </div>
        </div>

        <div className={styles.readOnlySection}>
          <h3>Read-Only Information</h3>
          <div className={styles.readOnlyGrid}>
            <div className={styles.readOnlyField}>
              <span className={styles.label}>Minecraft Version:</span>
              <span>{server.minecraft_version}</span>
            </div>
            <div className={styles.readOnlyField}>
              <span className={styles.label}>Server Type:</span>
              <span className={styles.serverType}>{server.server_type}</span>
            </div>
            <div className={styles.readOnlyField}>
              <span className={styles.label}>Port:</span>
              <span>{server.port}</span>
            </div>
            <div className={styles.readOnlyField}>
              <span className={styles.label}>Created:</span>
              <span>{new Date(server.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            onClick={handleReset}
            className={styles.resetButton}
            disabled={isSaving || !hasChanges}
          >
            Reset Changes
          </button>
          <button
            type="submit"
            className={styles.saveButton}
            disabled={isSaving || !hasChanges}
          >
            {isSaving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}