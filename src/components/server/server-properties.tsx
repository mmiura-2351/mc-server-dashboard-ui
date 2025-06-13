"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth";
import * as serverService from "@/services/server";
import type { ServerProperties } from "@/types/server";
import styles from "./server-properties.module.css";

interface ServerPropertiesEditorProps {
  serverId: number;
}

// Common property labels with more additions
const PROPERTY_LABELS: Record<string, string> = {
  "server-port": "Server Port",
  "max-players": "Max Players",
  difficulty: "Difficulty",
  gamemode: "Game Mode",
  pvp: "PVP",
  "spawn-protection": "Spawn Protection",
  "view-distance": "View Distance",
  "simulation-distance": "Simulation Distance",
  "enable-command-block": "Enable Command Block",
  motd: "MOTD (Server Message)",
  "white-list": "Whitelist",
  "online-mode": "Online Mode",
  "allow-flight": "Allow Flight",
  "spawn-monsters": "Spawn Monsters",
  "spawn-animals": "Spawn Animals",
  "spawn-npcs": "Spawn NPCs",
  hardcore: "Hardcore Mode",
  "level-name": "World Name",
  "level-seed": "World Seed",
  "level-type": "World Type",
  "generate-structures": "Generate Structures",
  "max-world-size": "Max World Size",
  "max-build-height": "Max Build Height",
  "server-ip": "Server IP",
  "resource-pack": "Resource Pack URL",
  "resource-pack-sha1": "Resource Pack SHA1",
  "force-gamemode": "Force Gamemode",
  "allow-nether": "Allow Nether",
  "enforce-whitelist": "Enforce Whitelist",
  "enable-query": "Enable Query",
  "enable-rcon": "Enable RCON",
  "rcon.password": "RCON Password",
  "rcon.port": "RCON Port",
  "query.port": "Query Port",
  "player-idle-timeout": "Player Idle Timeout",
  "broadcast-console-to-ops": "Broadcast Console to Ops",
  "broadcast-rcon-to-ops": "Broadcast RCON to Ops",
  "op-permission-level": "OP Permission Level",
  "enable-jmx-monitoring": "Enable JMX Monitoring",
  "sync-chunk-writes": "Sync Chunk Writes",
  "enable-status": "Enable Status",
  "entity-broadcast-range-percentage": "Entity Broadcast Range %",
  "rate-limit": "Rate Limit",
  "network-compression-threshold": "Network Compression Threshold",
  "use-native-transport": "Use Native Transport",
  "prevent-proxy-connections": "Prevent Proxy Connections",
  "hide-online-players": "Hide Online Players",
  "require-resource-pack": "Require Resource Pack",
  "resource-pack-prompt": "Resource Pack Prompt",
};

// Common property descriptions for better UX
const PROPERTY_DESCRIPTIONS: Record<string, string> = {
  "server-port": "Port number for the server (default: 25565)",
  "max-players": "Maximum number of players (default: 20)",
  difficulty: "Difficulty level (peaceful/easy/normal/hard or 0/1/2/3)",
  gamemode:
    "Default game mode (survival/creative/adventure/spectator or 0/1/2/3)",
  pvp: "Player vs Player combat (true/false)",
  "spawn-protection": "Spawn protection radius in blocks (default: 16)",
  "view-distance": "View distance in chunks (default: 10)",
  "simulation-distance": "Simulation distance in chunks (default: 10)",
  "enable-command-block": "Enable command blocks (true/false)",
  motd: "Message of the day displayed in server list",
  "white-list": "Enable whitelist mode (true/false)",
  "online-mode": "Verify player accounts with Mojang (true/false)",
  "allow-flight": "Allow flight in survival mode (true/false)",
  "spawn-monsters": "Spawn hostile mobs (true/false)",
  "spawn-animals": "Spawn animals (true/false)",
  "spawn-npcs": "Spawn NPCs/villagers (true/false)",
  hardcore: "Hardcore mode - ban on death (true/false)",
  "level-name": "World/level name (default: world)",
  "level-seed": "World generation seed (leave empty for random)",
  "level-type": "World type (minecraft:normal/flat/amplified/etc)",
  "generate-structures": "Generate structures like villages (true/false)",
  "enforce-whitelist": "Enforce whitelist for existing players (true/false)",
  "enable-query": "Enable GameSpy4 protocol server listener (true/false)",
  "enable-rcon": "Enable remote console (true/false)",
  "rcon.password": "Remote console password",
  "rcon.port": "Remote console port (default: 25575)",
};

export function ServerPropertiesEditor({
  serverId,
}: ServerPropertiesEditorProps) {
  const { logout } = useAuth();
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
          setError(
            "Server properties file not found. This is normal for new servers that haven't been started yet."
          );

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
  }, [serverId, logout]);

  const handleChange = (key: string, value: string) => {
    setEditedProperties((prev) => ({
      ...prev,
      [key]: value,
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
      setError("No changes to save");
      setIsSaving(false);
      return;
    }

    const result = await serverService.updateServerProperties(
      serverId,
      changedProperties
    );
    if (result.isOk()) {
      setSuccessMessage("Server properties updated successfully");
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
    return <div className={styles.loading}>Loading server properties...</div>;
  }

  // Render property input with appropriate control based on initial value type
  const renderPropertyInput = (
    key: string,
    value: string | number | boolean
  ) => {
    const label =
      PROPERTY_LABELS[key] ||
      key
        .replace(/-/g, " ")
        .replace(/\./g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
    const description = PROPERTY_DESCRIPTIONS[key];

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
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        ) : (
          <input
            id={key}
            type="text"
            value={String(value)}
            onChange={(e) => handleChange(key, e.target.value)}
            disabled={isSaving}
            placeholder={`Enter ${label.toLowerCase()}`}
          />
        )}
      </div>
    );
  };

  if (error && !properties) {
    return (
      <div className={styles.error}>
        <p>Failed to load server properties: {error}</p>
      </div>
    );
  }

  if (!properties) {
    return <div className={styles.error}>No properties available</div>;
  }

  // Sort properties alphabetically for easy navigation
  const propertyKeys = Object.keys(properties).sort();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Server Properties</h2>
        <p className={styles.description}>
          Configure your Minecraft server settings. Changes will be applied
          after server restart.
          {fileNotFound && (
            <>
              <br />
              <strong>Note:</strong> Properties file was not found, showing
              default values.
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
          <h3>Server Properties</h3>
          <p className={styles.sectionDescription}>
            All properties are editable as text values. Boolean values should be
            &quot;true&quot; or &quot;false&quot;, numbers as digits, and text
            as-is. Refer to the descriptions for guidance.
          </p>
          <div className={styles.propertyGrid}>
            {propertyKeys.map((key) =>
              renderPropertyInput(
                key,
                (editedProperties[key] ?? properties[key]) || ""
              )
            )}
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
            {isSaving
              ? "Saving..."
              : fileNotFound
                ? "Create Properties File"
                : "Save Properties"}
          </button>
        </div>
      </form>
    </div>
  );
}
