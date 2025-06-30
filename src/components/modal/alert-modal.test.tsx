import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AlertModal } from "./alert-modal";
import "@testing-library/jest-dom";

// Mock the language context
const mockT = vi.fn((key: string) => {
  const translations: Record<string, string> = {
    "common.ok": "OK",
  };
  return translations[key] || key;
});

vi.mock("@/contexts/language", () => ({
  useTranslation: () => ({ t: mockT, locale: "en" }),
}));

describe("AlertModal", () => {
  const defaultProps = {
    isOpen: true,
    title: "Test Title",
    message: "Test message content",
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("should render modal when isOpen is true", () => {
      render(<AlertModal {...defaultProps} />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Test Title")).toBeInTheDocument();
      expect(screen.getByText("Test message content")).toBeInTheDocument();
    });

    it("should not render modal when isOpen is false", () => {
      render(<AlertModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.queryByText("Test Title")).not.toBeInTheDocument();
    });

    it("should render custom button label", () => {
      render(<AlertModal {...defaultProps} buttonLabel="Custom Button" />);

      expect(screen.getByText("Custom Button")).toBeInTheDocument();
    });

    it("should render default OK button label", () => {
      render(<AlertModal {...defaultProps} />);

      expect(screen.getByText("OK")).toBeInTheDocument();
    });
  });

  describe("Modal Types", () => {
    it("should render info type with correct icon", () => {
      render(<AlertModal {...defaultProps} type="info" />);

      const icon = screen.getByText("ℹ️");
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute("aria-hidden", "true");
    });

    it("should render warning type with correct icon", () => {
      render(<AlertModal {...defaultProps} type="warning" />);

      const icon = screen.getByText("⚠️");
      expect(icon).toBeInTheDocument();
    });

    it("should render error type with correct icon", () => {
      render(<AlertModal {...defaultProps} type="error" />);

      const icon = screen.getByText("❌");
      expect(icon).toBeInTheDocument();
    });

    it("should render success type with correct icon", () => {
      render(<AlertModal {...defaultProps} type="success" />);

      const icon = screen.getByText("✅");
      expect(icon).toBeInTheDocument();
    });

    it("should render info type by default", () => {
      render(<AlertModal {...defaultProps} />);

      const icon = screen.getByText("ℹ️");
      expect(icon).toBeInTheDocument();
    });
  });

  describe("User Interactions", () => {
    it("should call onClose when close button is clicked", () => {
      render(<AlertModal {...defaultProps} />);

      const closeButton = screen.getByText("OK");
      fireEvent.click(closeButton);

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it("should call onClose when overlay is clicked", () => {
      render(<AlertModal {...defaultProps} />);

      const overlay = screen.getByRole("dialog");
      fireEvent.click(overlay);

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it("should not call onClose when modal content is clicked", () => {
      render(<AlertModal {...defaultProps} />);

      const modalContent = screen.getByText("Test Title");
      fireEvent.click(modalContent);

      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
  });

  describe("Keyboard Navigation", () => {
    it("should call onClose when Escape key is pressed", () => {
      render(<AlertModal {...defaultProps} />);

      fireEvent.keyDown(document, { key: "Escape" });

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it("should call onClose when Enter key is pressed", () => {
      render(<AlertModal {...defaultProps} />);

      fireEvent.keyDown(document, { key: "Enter" });

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it("should prevent default behavior for Escape and Enter keys", () => {
      render(<AlertModal {...defaultProps} />);

      const escapeEvent = new KeyboardEvent("keydown", { key: "Escape" });
      const preventDefaultSpy = vi.spyOn(escapeEvent, "preventDefault");

      document.dispatchEvent(escapeEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it("should not respond to other keys", () => {
      render(<AlertModal {...defaultProps} />);

      fireEvent.keyDown(document, { key: "Space" });
      fireEvent.keyDown(document, { key: "Tab" });

      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    it("should remove keyboard event listener on unmount", () => {
      const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");
      const { unmount } = render(<AlertModal {...defaultProps} />);

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "keydown",
        expect.any(Function)
      );
    });
  });

  describe("Focus Management", () => {
    it("should focus close button when modal opens", async () => {
      const { rerender } = render(
        <AlertModal {...defaultProps} isOpen={false} />
      );

      rerender(<AlertModal {...defaultProps} isOpen={true} />);

      await waitFor(() => {
        const closeButton = screen.getByText("OK");
        expect(document.activeElement).toBe(closeButton);
      });
    });

    it("should handle missing button ref gracefully", () => {
      // This test ensures no errors when button ref is not available
      expect(() => {
        render(<AlertModal {...defaultProps} />);
      }).not.toThrow();
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA attributes", () => {
      render(<AlertModal {...defaultProps} />);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveAttribute("aria-labelledby", "alert-title");
      expect(dialog).toHaveAttribute("aria-describedby", "alert-message");
    });

    it("should have proper title and message IDs", () => {
      render(<AlertModal {...defaultProps} />);

      expect(screen.getByText("Test Title")).toHaveAttribute(
        "id",
        "alert-title"
      );
      expect(screen.getByText("Test message content")).toHaveAttribute(
        "id",
        "alert-message"
      );
    });

    it("should mark icon as decorative", () => {
      render(<AlertModal {...defaultProps} />);

      const icon = screen.getByText("ℹ️");
      expect(icon).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty title and message", () => {
      render(<AlertModal {...defaultProps} title="" message="" />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("OK")).toBeInTheDocument();
    });

    it("should handle very long title and message", () => {
      const longTitle = "A".repeat(200);
      const longMessage = "B".repeat(500);

      render(
        <AlertModal {...defaultProps} title={longTitle} message={longMessage} />
      );

      expect(screen.getByText(longTitle)).toBeInTheDocument();
      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it("should handle rapid open/close transitions", () => {
      const { rerender } = render(
        <AlertModal {...defaultProps} isOpen={true} />
      );

      rerender(<AlertModal {...defaultProps} isOpen={false} />);
      rerender(<AlertModal {...defaultProps} isOpen={true} />);
      rerender(<AlertModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
