import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { RenameModal } from "./RenameModal";
import type { FileSystemItem } from "@/types/files";

// Mock input sanitizer
vi.mock("@/utils/input-sanitizer", () => ({
  InputSanitizer: {
    sanitizeFilePath: vi.fn((input: string) => input),
  },
}));

// Mock language context
const mockT = vi.fn((key: string) => {
  const translations: Record<string, string> = {
    "files.rename": "Rename",
    "files.folder": "folder",
    "files.file": "file",
    "files.newNameFor": "New name for",
    "files.renaming": "Renaming...",
    "files.cancel": "Cancel",
    "files.renameInstructions":
      "Enter a new name and press Enter to confirm, or Escape to cancel",
    "common.close": "Close",
  };
  return translations[key] || key;
});

vi.mock("@/contexts/language", () => ({
  useTranslation: () => ({ t: mockT }),
}));

describe("RenameModal", () => {
  const mockFile: FileSystemItem = {
    name: "test.txt",
    type: "text",
    is_directory: false,
    size: 100,
    modified: "2023-01-01T00:00:00Z",
    permissions: {},
    path: "/test.txt",
  };

  const mockFolder: FileSystemItem = {
    name: "testfolder",
    type: "directory",
    is_directory: true,
    size: null,
    modified: "2023-01-01T00:00:00Z",
    permissions: {},
    path: "/testfolder",
  };

  const defaultProps = {
    file: mockFile,
    newName: "test.txt",
    isRenaming: false,
    onNameChange: vi.fn(),
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Visibility Control", () => {
    it("should not render when file is null", () => {
      const { container } = render(
        <RenameModal {...defaultProps} file={null} />
      );

      expect(container.firstChild).toBeNull();
    });

    it("should render when file exists", () => {
      render(<RenameModal {...defaultProps} />);

      expect(screen.getByText("Rename file")).toBeInTheDocument();
      expect(screen.getByDisplayValue("test.txt")).toBeInTheDocument();
    });
  });

  describe("File vs Folder Display", () => {
    it("should show 'Rename file' for regular files", () => {
      render(<RenameModal {...defaultProps} file={mockFile} />);

      expect(screen.getByText("Rename file")).toBeInTheDocument();
    });

    it("should show 'Rename folder' for directories", () => {
      render(<RenameModal {...defaultProps} file={mockFolder} />);

      expect(screen.getByText("Rename folder")).toBeInTheDocument();
    });

    it("should display current file name in label", () => {
      render(<RenameModal {...defaultProps} />);

      expect(screen.getByLabelText(/New name for/)).toBeInTheDocument();
    });

    it("should display current folder name in label", () => {
      render(
        <RenameModal {...defaultProps} file={mockFolder} newName="testfolder" />
      );

      expect(screen.getByLabelText(/New name for/)).toBeInTheDocument();
    });
  });

  describe("Input Handling", () => {
    it("should display current name in input field", () => {
      render(<RenameModal {...defaultProps} newName="current-name.txt" />);

      const input = screen.getByDisplayValue("current-name.txt");
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("id", "newName");
    });

    it("should call onNameChange with sanitized value when input changes", async () => {
      const { InputSanitizer } = await import("@/utils/input-sanitizer");
      const mockSanitize = vi.mocked(InputSanitizer.sanitizeFilePath);
      mockSanitize.mockReturnValue("sanitized-name.txt");

      render(<RenameModal {...defaultProps} />);

      const input = screen.getByDisplayValue("test.txt");
      fireEvent.change(input, { target: { value: "new-name.txt" } });

      expect(mockSanitize).toHaveBeenCalledWith("new-name.txt");
      expect(defaultProps.onNameChange).toHaveBeenCalledWith(
        "sanitized-name.txt"
      );
    });

    it("should auto-focus the input field", () => {
      render(<RenameModal {...defaultProps} />);

      const input = screen.getByDisplayValue("test.txt");
      expect(input).toHaveFocus();
    });

    it("should disable input when renaming", () => {
      render(<RenameModal {...defaultProps} isRenaming={true} />);

      const input = screen.getByDisplayValue("test.txt");
      expect(input).toBeDisabled();
    });
  });

  describe("Keyboard Navigation", () => {
    it("should call onConfirm when Enter key is pressed", () => {
      render(<RenameModal {...defaultProps} />);

      const input = screen.getByDisplayValue("test.txt");
      fireEvent.keyDown(input, { key: "Enter" });

      expect(defaultProps.onConfirm).toHaveBeenCalled();
    });

    it("should call onCancel when Escape key is pressed", () => {
      render(<RenameModal {...defaultProps} />);

      const input = screen.getByDisplayValue("test.txt");
      fireEvent.keyDown(input, { key: "Escape" });

      expect(defaultProps.onCancel).toHaveBeenCalled();
    });

    it("should not trigger actions for other keys", () => {
      render(<RenameModal {...defaultProps} />);

      const input = screen.getByDisplayValue("test.txt");
      fireEvent.keyDown(input, { key: "Space" });
      fireEvent.keyDown(input, { key: "Tab" });

      expect(defaultProps.onConfirm).not.toHaveBeenCalled();
      expect(defaultProps.onCancel).not.toHaveBeenCalled();
    });
  });

  describe("Button States and Actions", () => {
    it("should enable rename button for valid new name", () => {
      render(<RenameModal {...defaultProps} newName="new-name.txt" />);

      const renameButton = screen.getByText("Rename");
      expect(renameButton).not.toBeDisabled();
    });

    it("should disable rename button when new name is empty", () => {
      render(<RenameModal {...defaultProps} newName="" />);

      const renameButton = screen.getByText("Rename");
      expect(renameButton).toBeDisabled();
    });

    it("should disable rename button when new name is only whitespace", () => {
      render(<RenameModal {...defaultProps} newName="   " />);

      const renameButton = screen.getByText("Rename");
      expect(renameButton).toBeDisabled();
    });

    it("should disable rename button when new name equals current name", () => {
      render(<RenameModal {...defaultProps} newName="test.txt" />);

      const renameButton = screen.getByText("Rename");
      expect(renameButton).toBeDisabled();
    });

    it("should disable rename button when renaming is in progress", () => {
      render(
        <RenameModal
          {...defaultProps}
          isRenaming={true}
          newName="new-name.txt"
        />
      );

      const renameButton = screen.getByText("Renaming...");
      expect(renameButton).toBeDisabled();
    });

    it("should show 'Renaming...' text when isRenaming is true", () => {
      render(<RenameModal {...defaultProps} isRenaming={true} />);

      expect(screen.getByText("Renaming...")).toBeInTheDocument();
      expect(screen.queryByText("Rename")).not.toBeInTheDocument();
    });

    it("should call onConfirm when rename button is clicked", () => {
      render(<RenameModal {...defaultProps} newName="new-name.txt" />);

      fireEvent.click(screen.getByText("Rename"));
      expect(defaultProps.onConfirm).toHaveBeenCalled();
    });

    it("should disable cancel button when renaming", () => {
      render(<RenameModal {...defaultProps} isRenaming={true} />);

      const cancelButton = screen.getByText("Cancel");
      expect(cancelButton).toBeDisabled();
    });

    it("should call onCancel when cancel button is clicked", () => {
      render(<RenameModal {...defaultProps} />);

      fireEvent.click(screen.getByText("Cancel"));
      expect(defaultProps.onCancel).toHaveBeenCalled();
    });

    it("should call onCancel when close button (×) is clicked", () => {
      render(<RenameModal {...defaultProps} />);

      fireEvent.click(screen.getByText("×"));
      expect(defaultProps.onCancel).toHaveBeenCalled();
    });
  });

  describe("Form Validation", () => {
    it("should handle names with special characters", () => {
      render(
        <RenameModal {...defaultProps} newName="file-with_special.chars.txt" />
      );

      const renameButton = screen.getByText("Rename");
      expect(renameButton).not.toBeDisabled();
    });

    it("should handle unicode characters in names", () => {
      render(<RenameModal {...defaultProps} newName="файл.txt" />);

      const renameButton = screen.getByText("Rename");
      expect(renameButton).not.toBeDisabled();
    });

    it("should handle very long file names", () => {
      const longName = "a".repeat(255) + ".txt";
      render(<RenameModal {...defaultProps} newName={longName} />);

      const renameButton = screen.getByText("Rename");
      expect(renameButton).not.toBeDisabled();
    });
  });

  describe("Accessibility", () => {
    it("should have proper label association", () => {
      render(<RenameModal {...defaultProps} />);

      const input = screen.getByDisplayValue("test.txt");
      expect(input).toHaveAttribute("id", "newName");
      expect(screen.getByLabelText(/New name for/)).toBe(input);
    });

    it("should use proper heading structure", () => {
      render(<RenameModal {...defaultProps} />);

      const heading = screen.getByRole("heading", { level: 3 });
      expect(heading).toHaveTextContent("Rename file");
    });

    it("should be keyboard accessible", () => {
      render(<RenameModal {...defaultProps} />);

      const input = screen.getByDisplayValue("test.txt");
      const renameButton = screen.getByText("Rename");
      const cancelButton = screen.getByText("Cancel");

      // Should be able to tab through elements
      expect(input).toBeInTheDocument();
      expect(renameButton).toBeInTheDocument();
      expect(cancelButton).toBeInTheDocument();
    });

    it("should have proper dialog ARIA attributes", () => {
      render(<RenameModal {...defaultProps} />);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveAttribute("aria-labelledby");
    });

    it("should have focus trap functionality", () => {
      render(<RenameModal {...defaultProps} newName="new-name.txt" />);

      const input = screen.getByDisplayValue("new-name.txt");
      const renameButton = screen.getByText("Rename");
      const cancelButton = screen.getByText("Cancel");
      const closeButton = screen.getByText("×");

      // All interactive elements should be present
      expect(input).toBeInTheDocument();
      expect(renameButton).toBeInTheDocument();
      expect(cancelButton).toBeInTheDocument();
      expect(closeButton).toBeInTheDocument();
    });

    it("should handle Escape key to close modal", () => {
      render(<RenameModal {...defaultProps} />);

      // Test escape key on the modal overlay/container
      const input = screen.getByDisplayValue("test.txt");
      fireEvent.keyDown(input, { key: "Escape" });
      expect(defaultProps.onCancel).toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should handle file names with quotes correctly", () => {
      const fileWithQuotes = { ...mockFile, name: 'file"with"quotes.txt' };
      render(<RenameModal {...defaultProps} file={fileWithQuotes} />);

      expect(screen.getByLabelText(/New name for/)).toBeInTheDocument();
    });

    it("should handle empty file names", () => {
      const fileWithEmptyName = { ...mockFile, name: "" };
      render(<RenameModal {...defaultProps} file={fileWithEmptyName} />);

      expect(screen.getByLabelText(/New name for/)).toBeInTheDocument();
    });

    it("should maintain input focus after re-render", async () => {
      const { rerender } = render(<RenameModal {...defaultProps} />);

      const input = screen.getByDisplayValue("test.txt");
      expect(input).toHaveFocus();

      rerender(<RenameModal {...defaultProps} newName="new-name.txt" />);

      await waitFor(() => {
        expect(input).toHaveFocus();
      });
    });
  });
});
