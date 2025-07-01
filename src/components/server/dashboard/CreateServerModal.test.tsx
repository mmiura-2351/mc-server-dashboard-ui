import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CreateServerModal } from "./CreateServerModal";
import { ServerType } from "@/types/server";

// Mock translation with parameter handling
const translations: Record<string, string> = {
  "servers.create.title": "Create New Server",
  "servers.create.fields.name": "Server Name",
  "servers.create.fields.version": "Minecraft Version",
  "servers.create.fields.type": "Server Type",
  "servers.create.fields.memory": "Memory",
  "servers.create.fields.players": "Max Players",
  "servers.create.fields.port": "Port",
  "servers.create.fields.description": "Description",
  "servers.create.placeholders.name": "Enter server name",
  "servers.create.placeholders.version": "e.g. 1.21.6",
  "servers.create.placeholders.description": "Optional description",
  "servers.create.creating": "Creating...",
  "servers.create.submit": "Create Server",
  "servers.create.errors.nameRequired": "Server name is required",
  "servers.create.errors.versionRequired": "Minecraft version is required",
  "servers.create.errors.memoryTooLow": "Memory must be at least 512 MB",
  "servers.create.errors.playersInvalid": "Max players must be at least 1",
  "servers.create.errors.portInvalid": "Port must be between 1 and 65535",
  "servers.types.vanilla": "Vanilla",
  "servers.types.paper": "Paper",
  "servers.types.forge": "Forge",
  "common.cancel": "Cancel",
  "common.close": "Close",
};

const mockT = vi.fn((key: string, params?: Record<string, string | number>) => {
  let translation = translations[key] || key;
  if (params) {
    Object.entries(params).forEach(([paramKey, paramValue]) => {
      translation = translation.replace(`{${paramKey}}`, String(paramValue));
    });
  }
  return translation;
});

vi.mock("@/contexts/language", () => ({
  useTranslation: () => ({
    t: mockT,
  }),
}));

const mockProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSubmit: vi.fn(),
  isSubmitting: false,
};

describe("CreateServerModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should not render when closed", () => {
    render(<CreateServerModal {...mockProps} isOpen={false} />);
    expect(screen.queryByText("Create New Server")).not.toBeInTheDocument();
  });

  it("should render when open", () => {
    render(<CreateServerModal {...mockProps} />);
    expect(screen.getByText("Create New Server")).toBeInTheDocument();
  });

  it("should render all form fields", () => {
    render(<CreateServerModal {...mockProps} />);

    expect(screen.getByLabelText(/server name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/minecraft version/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/server type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/memory/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/max players/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/port/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });

  it("should have default values", () => {
    render(<CreateServerModal {...mockProps} />);

    expect(screen.getByLabelText(/server name/i)).toHaveValue(""); // name field
    expect(screen.getByLabelText(/minecraft version/i)).toHaveValue("1.21.6"); // version
    expect(screen.getByLabelText(/server type/i)).toHaveValue(
      ServerType.VANILLA
    ); // server type
    expect(screen.getByLabelText(/memory/i)).toHaveValue(2048); // memory
    expect(screen.getByLabelText(/max players/i)).toHaveValue(20); // max players
    expect(screen.getByLabelText(/port/i)).toHaveValue(25565); // port
  });

  it("should handle input changes", () => {
    render(<CreateServerModal {...mockProps} />);

    const nameInput = screen.getByLabelText(/server name/i);
    fireEvent.change(nameInput, { target: { value: "Test Server" } });
    expect(nameInput).toHaveValue("Test Server");

    const versionInput = screen.getByLabelText(/minecraft version/i);
    fireEvent.change(versionInput, { target: { value: "1.21.5" } });
    expect(versionInput).toHaveValue("1.21.5");

    const memoryInput = screen.getByLabelText(/memory/i);
    fireEvent.change(memoryInput, { target: { value: "4096" } });
    expect(memoryInput).toHaveValue(4096);
  });

  it("should handle server type selection", () => {
    render(<CreateServerModal {...mockProps} />);

    const typeSelect = screen.getByLabelText(/server type/i);
    fireEvent.change(typeSelect, { target: { value: ServerType.PAPER } });
    expect(typeSelect).toHaveValue(ServerType.PAPER);
  });

  it("should validate required fields on submit", async () => {
    render(<CreateServerModal {...mockProps} />);

    const submitButton = screen.getByText("Create Server");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Server name is required")).toBeInTheDocument();
    });

    expect(mockProps.onSubmit).not.toHaveBeenCalled();
  });

  it("should validate memory minimum", async () => {
    render(<CreateServerModal {...mockProps} />);

    const nameInput = screen.getByLabelText(/server name/i);
    fireEvent.change(nameInput, { target: { value: "Test Server" } });

    const memoryInput = screen.getByLabelText(/memory/i);
    fireEvent.change(memoryInput, { target: { value: "256" } });

    const submitButton = screen.getByText("Create Server");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("Memory must be at least 512 MB")
      ).toBeInTheDocument();
    });

    expect(mockProps.onSubmit).not.toHaveBeenCalled();
  });

  it("should validate port range", async () => {
    render(<CreateServerModal {...mockProps} />);

    const nameInput = screen.getByLabelText(/server name/i);
    fireEvent.change(nameInput, { target: { value: "Test Server" } });

    const portInput = screen.getByLabelText(/port/i);
    fireEvent.change(portInput, { target: { value: "99999" } });

    const submitButton = screen.getByText("Create Server");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("Port must be between 1 and 65535")
      ).toBeInTheDocument();
    });

    expect(mockProps.onSubmit).not.toHaveBeenCalled();
  });

  it("should validate max players minimum", async () => {
    render(<CreateServerModal {...mockProps} />);

    const nameInput = screen.getByLabelText(/server name/i);
    fireEvent.change(nameInput, { target: { value: "Test Server" } });

    const playersInput = screen.getByLabelText(/max players/i);
    fireEvent.change(playersInput, { target: { value: "0" } });

    const submitButton = screen.getByText("Create Server");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("Max players must be at least 1")
      ).toBeInTheDocument();
    });

    expect(mockProps.onSubmit).not.toHaveBeenCalled();
  });

  it("should submit valid form data", async () => {
    const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
    render(<CreateServerModal {...mockProps} onSubmit={mockOnSubmit} />);

    // Fill out form
    fireEvent.change(screen.getByLabelText(/server name/i), {
      target: { value: "Test Server" },
    });
    fireEvent.change(screen.getByLabelText(/minecraft version/i), {
      target: { value: "1.21.5" },
    });
    fireEvent.change(screen.getByLabelText(/server type/i), {
      target: { value: ServerType.PAPER },
    });
    fireEvent.change(screen.getByLabelText(/memory/i), {
      target: { value: "4096" },
    });
    fireEvent.change(screen.getByLabelText(/max players/i), {
      target: { value: "50" },
    });
    fireEvent.change(screen.getByLabelText(/port/i), {
      target: { value: "25566" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Test description" },
    });

    const submitButton = screen.getByText("Create Server");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: "Test Server",
        minecraft_version: "1.21.5",
        server_type: ServerType.PAPER,
        max_memory: 4096,
        max_players: 50,
        port: 25566,
        description: "Test description",
      });
    });
  });

  it("should handle close button click", () => {
    render(<CreateServerModal {...mockProps} />);

    const closeButton = screen.getByLabelText("Close");
    fireEvent.click(closeButton);

    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it("should handle cancel button click", () => {
    render(<CreateServerModal {...mockProps} />);

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it("should handle overlay click", () => {
    const { container } = render(<CreateServerModal {...mockProps} />);

    // Find the overlay (the outermost div with overlay class)
    const overlay = container.firstChild as HTMLElement;
    fireEvent.click(overlay);
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it("should prevent modal close when clicking inside modal", () => {
    render(<CreateServerModal {...mockProps} />);

    const modal = screen
      .getByText("Create New Server")
      .closest('[class*="_modal_"]') as HTMLElement;
    fireEvent.click(modal);
    expect(mockProps.onClose).not.toHaveBeenCalled();
  });

  it("should disable form when submitting", () => {
    render(<CreateServerModal {...mockProps} isSubmitting={true} />);

    expect(screen.getByLabelText(/server name/i)).toBeDisabled();
    expect(screen.getByLabelText(/minecraft version/i)).toBeDisabled();
    expect(screen.getByLabelText(/server type/i)).toBeDisabled();
    expect(screen.getByText("Creating...")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeDisabled();
  });

  it("should clear errors when user starts typing", async () => {
    render(<CreateServerModal {...mockProps} />);

    // Trigger validation error
    const submitButton = screen.getByText("Create Server");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Server name is required")).toBeInTheDocument();
    });

    // Start typing - error should clear
    const nameInput = screen.getByLabelText(/server name/i);
    fireEvent.change(nameInput, { target: { value: "T" } });

    await waitFor(() => {
      expect(
        screen.queryByText("Server name is required")
      ).not.toBeInTheDocument();
    });
  });

  it("should reset form after successful submission", async () => {
    const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
    render(<CreateServerModal {...mockProps} onSubmit={mockOnSubmit} />);

    // Fill out form
    const nameInput = screen.getByLabelText(/server name/i);
    fireEvent.change(nameInput, { target: { value: "Test Server" } });

    const submitButton = screen.getByText("Create Server");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });

    // Form should be reset (name field should be empty)
    expect(nameInput).toHaveValue("");
  });
});
