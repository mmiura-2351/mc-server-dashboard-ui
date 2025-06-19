import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { UploadModal, type UploadState } from "./UploadModal";

// Mock translation hook
const translations: Record<string, string> = {
  "files.uploadProgress": "Upload Progress",
  "files.uploadingFiles": "Uploading files...",
  "files.completed": "Completed",
  "files.failed": "Failed",
  "files.close": "Close",
};

const mockT = vi.fn((key: string, params?: Record<string, string>) => {
  let translation = translations[key] || key;
  if (params) {
    Object.entries(params).forEach(([paramKey, paramValue]) => {
      translation = translation.replace(`{${paramKey}}`, paramValue);
    });
  }
  return translation;
});

vi.mock("@/contexts/language", () => ({
  useTranslation: () => ({ t: mockT, locale: "en" }),
}));

const mockUploadState: UploadState = {
  isUploading: false,
  progress: [
    {
      filename: "test-file.txt",
      percentage: 100,
      loaded: 1024,
      total: 1024,
    },
  ],
  completed: ["test-file.txt"],
  failed: [],
};

const defaultProps = {
  isOpen: true,
  uploadState: mockUploadState,
  onClose: vi.fn(),
  onReset: vi.fn(),
};

describe("UploadModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders upload modal when open", () => {
    render(<UploadModal {...defaultProps} />);

    expect(screen.getByText("Upload Progress")).toBeInTheDocument();
    expect(screen.getAllByText("test-file.txt")).toHaveLength(2); // Once in progress, once in completed
  });

  it("does not render when closed", () => {
    const { container } = render(
      <UploadModal {...defaultProps} isOpen={false} />
    );

    expect(container.firstChild).toBeNull();
  });

  it("shows uploading state", () => {
    const uploadingState = {
      ...mockUploadState,
      isUploading: true,
    };

    render(<UploadModal {...defaultProps} uploadState={uploadingState} />);

    expect(screen.getByText("Uploading files...")).toBeInTheDocument();
  });

  it("shows completed files", () => {
    render(<UploadModal {...defaultProps} />);

    expect(screen.getByText("Completed (1)")).toBeInTheDocument();
  });

  it("shows failed files", () => {
    const failedState = {
      ...mockUploadState,
      failed: [{ file: "failed-file.txt", error: "Upload failed" }],
    };

    render(<UploadModal {...defaultProps} uploadState={failedState} />);

    expect(screen.getByText("Failed (1)")).toBeInTheDocument();
    expect(screen.getByText("failed-file.txt")).toBeInTheDocument();
    expect(screen.getByText("Upload failed")).toBeInTheDocument();
  });

  it("handles close button click when not uploading", () => {
    render(<UploadModal {...defaultProps} />);

    fireEvent.click(screen.getByText("Close"));
    expect(defaultProps.onReset).toHaveBeenCalled();
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("disables close button when uploading", () => {
    const uploadingState = {
      ...mockUploadState,
      isUploading: true,
    };

    render(<UploadModal {...defaultProps} uploadState={uploadingState} />);

    const closeButton = screen.getByText("×");
    expect(closeButton).toBeDisabled();
  });
});
