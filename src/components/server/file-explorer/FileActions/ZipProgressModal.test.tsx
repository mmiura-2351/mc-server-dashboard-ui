import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { ZipProgressModal } from "./ZipProgressModal";
import styles from "../../file-explorer.module.css";

// Mock language context
const mockT = vi.fn((key: string) => {
  const translations: Record<string, string> = {
    "files.downloadingFiles": "Downloading files",
    "files.creatingZip": "Creating ZIP",
    "files.finalizingZip": "Finalizing ZIP",
    "files.processingFiles": "Processing files",
    "files.creatingZipFile": "Creating ZIP file",
    "files.processingFile": "Processing file",
    "files.files": "files",
    "files.compressingFiles": "Compressing files",
    "files.preparingDownload": "Preparing download",
    "files.zipDownloadComplete": "ZIP download complete",
    "common.ok": "OK",
  };
  return translations[key] || key;
});

vi.mock("@/contexts/language", () => ({
  useTranslation: () => ({ t: mockT }),
}));

describe("ZipProgressModal", () => {
  const defaultProps = {
    isOpen: true,
    progress: {
      current: 5,
      total: 10,
      percentage: 50,
      currentFile: "file.txt",
      stage: "downloading" as const,
    },
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Visibility Control", () => {
    it("should not render when isOpen is false", () => {
      const { container } = render(
        <ZipProgressModal {...defaultProps} isOpen={false} />
      );

      expect(container.firstChild).toBeNull();
    });

    it("should not render when progress is null", () => {
      const { container } = render(
        <ZipProgressModal {...defaultProps} progress={null} />
      );

      expect(container.firstChild).toBeNull();
    });

    it("should render when isOpen is true and progress exists", () => {
      render(<ZipProgressModal {...defaultProps} />);

      expect(screen.getByText("📥 Creating ZIP file")).toBeInTheDocument();
      expect(screen.getByText("Downloading files")).toBeInTheDocument();
    });
  });

  describe("Stage Display - Downloading", () => {
    it("should show downloading stage with correct icon and text", () => {
      render(
        <ZipProgressModal
          {...defaultProps}
          progress={{ ...defaultProps.progress, stage: "downloading" }}
        />
      );

      expect(screen.getByText("📥 Creating ZIP file")).toBeInTheDocument();
      expect(screen.getByText("Downloading files")).toBeInTheDocument();
    });

    it("should show current file being processed during downloading", () => {
      render(
        <ZipProgressModal
          {...defaultProps}
          progress={{
            ...defaultProps.progress,
            stage: "downloading",
            currentFile: "important-file.log",
          }}
        />
      );

      expect(
        screen.getByText((content, element) => {
          return (
            element?.textContent === "Processing file: important-file.log" ||
            content.includes("Processing file") ||
            content.includes("important-file.log")
          );
        })
      ).toBeInTheDocument();
    });

    it("should show file count during downloading", () => {
      const { container } = render(
        <ZipProgressModal
          {...defaultProps}
          progress={{
            ...defaultProps.progress,
            stage: "downloading",
            current: 7,
            total: 15,
          }}
        />
      );

      const progressDetails = container.querySelector(
        '[class*="progressDetails"]'
      );
      expect(progressDetails).toHaveTextContent("7 / 15 files");
    });
  });

  describe("Stage Display - Zipping", () => {
    it("should show zipping stage with correct icon and text", () => {
      render(
        <ZipProgressModal
          {...defaultProps}
          progress={{ ...defaultProps.progress, stage: "zipping" }}
        />
      );

      expect(screen.getByText("📦 Creating ZIP file")).toBeInTheDocument();
      expect(screen.getByText("Creating ZIP")).toBeInTheDocument();
      expect(screen.getByText("Compressing files")).toBeInTheDocument();
    });

    it("should not show file details during zipping stage", () => {
      render(
        <ZipProgressModal
          {...defaultProps}
          progress={{ ...defaultProps.progress, stage: "zipping" }}
        />
      );

      expect(screen.queryByText(/Processing file:/)).not.toBeInTheDocument();
      expect(
        screen.queryByText((content, element) => {
          return (
            (element?.textContent?.endsWith(" files") &&
              !element?.textContent?.includes("Compressing")) ||
            false
          );
        })
      ).not.toBeInTheDocument();
    });
  });

  describe("Stage Display - Finalizing", () => {
    it("should show finalizing stage with correct icon and text", () => {
      render(
        <ZipProgressModal
          {...defaultProps}
          progress={{ ...defaultProps.progress, stage: "finalizing" }}
        />
      );

      expect(screen.getByText("✨ Creating ZIP file")).toBeInTheDocument();
      expect(screen.getByText("Finalizing ZIP")).toBeInTheDocument();
      expect(screen.getByText("Preparing download")).toBeInTheDocument();
    });

    it("should not show file details during finalizing stage", () => {
      render(
        <ZipProgressModal
          {...defaultProps}
          progress={{ ...defaultProps.progress, stage: "finalizing" }}
        />
      );

      expect(screen.queryByText(/Processing file:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/files$/)).not.toBeInTheDocument();
    });
  });

  describe("Default Stage Handling", () => {
    it("should handle unknown stage with default icon and text", () => {
      render(
        <ZipProgressModal
          {...defaultProps}
          progress={{
            ...defaultProps.progress,
            stage: "unknown" as "downloading" | "zipping" | "finalizing",
          }}
        />
      );

      expect(screen.getByText("⏳ Creating ZIP file")).toBeInTheDocument();
      expect(screen.getByText("Processing files")).toBeInTheDocument();
    });
  });

  describe("Progress Bar", () => {
    it("should display correct percentage in progress bar", () => {
      const { container } = render(
        <ZipProgressModal
          {...defaultProps}
          progress={{ ...defaultProps.progress, percentage: 75 }}
        />
      );

      const progressBar = container.querySelector('[style*="width: 75%"]');
      expect(progressBar).toBeInTheDocument();
    });

    it("should display percentage text", () => {
      render(
        <ZipProgressModal
          {...defaultProps}
          progress={{ ...defaultProps.progress, percentage: 42 }}
        />
      );

      expect(screen.getByText("42%")).toBeInTheDocument();
    });

    it("should handle 0% progress", () => {
      const { container } = render(
        <ZipProgressModal
          {...defaultProps}
          progress={{ ...defaultProps.progress, percentage: 0 }}
        />
      );

      const progressBar = container.querySelector('[style*="width: 0%"]');
      expect(progressBar).toBeInTheDocument();
      expect(screen.getByText("0%")).toBeInTheDocument();
    });

    it("should handle 100% progress", () => {
      const { container } = render(
        <ZipProgressModal
          {...defaultProps}
          progress={{ ...defaultProps.progress, percentage: 100 }}
        />
      );

      const progressBar = container.querySelector('[style*="width: 100%"]');
      expect(progressBar).toBeInTheDocument();
      expect(screen.getByText("100%")).toBeInTheDocument();
    });
  });

  describe("Completion State", () => {
    it("should show completion message when progress is 100%", () => {
      render(
        <ZipProgressModal
          {...defaultProps}
          progress={{ ...defaultProps.progress, percentage: 100 }}
        />
      );

      expect(screen.getByText("ZIP download complete")).toBeInTheDocument();
      expect(screen.getByText("OK")).toBeInTheDocument();
    });

    it("should not show completion message when progress is less than 100%", () => {
      render(
        <ZipProgressModal
          {...defaultProps}
          progress={{ ...defaultProps.progress, percentage: 99 }}
        />
      );

      expect(
        screen.queryByText("ZIP download complete")
      ).not.toBeInTheDocument();
      expect(screen.queryByText("OK")).not.toBeInTheDocument();
    });

    it("should call onClose when OK button is clicked", () => {
      render(
        <ZipProgressModal
          {...defaultProps}
          progress={{ ...defaultProps.progress, percentage: 100 }}
        />
      );

      fireEvent.click(screen.getByText("OK"));
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe("Progress Values", () => {
    it("should handle edge case values correctly", () => {
      const { container } = render(
        <ZipProgressModal
          {...defaultProps}
          progress={{
            current: 0,
            total: 0,
            percentage: 0,
            currentFile: "",
            stage: "downloading",
          }}
        />
      );

      const progressDetails = container.querySelector(
        '[class*="progressDetails"]'
      );
      expect(progressDetails).toHaveTextContent("0 / 0 files");
      expect(
        screen.getByText((content) => content.includes("Processing file"))
      ).toBeInTheDocument();
    });

    it("should handle large numbers correctly", () => {
      const { container } = render(
        <ZipProgressModal
          {...defaultProps}
          progress={{
            current: 9999,
            total: 10000,
            percentage: 99,
            currentFile: "large-dataset.csv",
            stage: "downloading",
          }}
        />
      );

      const progressDetails = container.querySelector(
        '[class*="progressDetails"]'
      );
      expect(progressDetails).toHaveTextContent("9999 / 10000 files");
      expect(progressDetails).toHaveTextContent("large-dataset.csv");
    });
  });

  describe("File Name Display", () => {
    it("should display file names with special characters", () => {
      const { container } = render(
        <ZipProgressModal
          {...defaultProps}
          progress={{
            ...defaultProps.progress,
            currentFile: "file with spaces & symbols.txt",
            stage: "downloading",
          }}
        />
      );

      const progressDetails = container.querySelector(
        '[class*="progressDetails"]'
      );
      expect(progressDetails).toHaveTextContent(
        "file with spaces & symbols.txt"
      );
    });

    it("should display unicode file names", () => {
      const { container } = render(
        <ZipProgressModal
          {...defaultProps}
          progress={{
            ...defaultProps.progress,
            currentFile: "файл.txt",
            stage: "downloading",
          }}
        />
      );

      const progressDetails = container.querySelector(
        '[class*="progressDetails"]'
      );
      expect(progressDetails).toHaveTextContent("файл.txt");
    });

    it("should handle very long file names", () => {
      const longFileName = "a".repeat(100) + ".txt";
      const { container } = render(
        <ZipProgressModal
          {...defaultProps}
          progress={{
            ...defaultProps.progress,
            currentFile: longFileName,
            stage: "downloading",
          }}
        />
      );

      const progressDetails = container.querySelector(
        '[class*="progressDetails"]'
      );
      expect(progressDetails).toHaveTextContent(longFileName);
    });
  });

  describe("Modal Structure", () => {
    it("should render with proper modal structure", () => {
      const { container } = render(<ZipProgressModal {...defaultProps} />);

      expect(
        container.querySelector(`.${styles.modalOverlay}`) ||
          container.querySelector(".modalOverlay")
      ).toBeInTheDocument();
      expect(
        container.querySelector(`.${styles.modal}`) ||
          container.querySelector(".modal")
      ).toBeInTheDocument();
      expect(
        container.querySelector(`.${styles.modalHeader}`) ||
          container.querySelector(".modalHeader")
      ).toBeInTheDocument();
      expect(
        container.querySelector(`.${styles.modalContent}`) ||
          container.querySelector(".modalContent")
      ).toBeInTheDocument();
    });

    it("should have proper heading structure", () => {
      render(<ZipProgressModal {...defaultProps} />);

      const heading = screen.getByRole("heading", { level: 3 });
      expect(heading).toHaveTextContent("📥 Creating ZIP file");
    });
  });

  describe("Stage Transitions", () => {
    it("should update display when stage changes from downloading to zipping", () => {
      const { rerender } = render(<ZipProgressModal {...defaultProps} />);

      expect(screen.getByText("📥 Creating ZIP file")).toBeInTheDocument();
      expect(screen.getByText("Downloading files")).toBeInTheDocument();

      rerender(
        <ZipProgressModal
          {...defaultProps}
          progress={{ ...defaultProps.progress, stage: "zipping" }}
        />
      );

      expect(screen.getByText("📦 Creating ZIP file")).toBeInTheDocument();
      expect(screen.getByText("Creating ZIP")).toBeInTheDocument();
    });

    it("should update display when stage changes from zipping to finalizing", () => {
      const { rerender } = render(
        <ZipProgressModal
          {...defaultProps}
          progress={{ ...defaultProps.progress, stage: "zipping" }}
        />
      );

      expect(screen.getByText("📦 Creating ZIP file")).toBeInTheDocument();

      rerender(
        <ZipProgressModal
          {...defaultProps}
          progress={{ ...defaultProps.progress, stage: "finalizing" }}
        />
      );

      expect(screen.getByText("✨ Creating ZIP file")).toBeInTheDocument();
      expect(screen.getByText("Finalizing ZIP")).toBeInTheDocument();
    });
  });
});
