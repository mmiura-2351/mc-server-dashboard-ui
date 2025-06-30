import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { DragDropZone, useDragDropZone } from "./DragDropZone";
import styles from "../../file-explorer.module.css";

// Helper function to create mock File objects
const createMockFile = (name: string, type: string = "text/plain"): File => {
  return new File(["content"], name, { type });
};

// Helper function to create mock FileList
const createMockFileList = (files: File[]): FileList => {
  const fileList: {
    length: number;
    item: (index: number) => File | null;
    [index: number]: File;
  } = {
    length: files.length,
    item: (index: number) => files[index] || null,
  };
  files.forEach((file, index) => {
    fileList[index] = file;
  });
  Object.setPrototypeOf(fileList, FileList.prototype);
  return fileList as FileList;
};

describe("DragDropZone", () => {
  const defaultProps = {
    isDragOver: false,
    onDragEnter: vi.fn(),
    onDragLeave: vi.fn(),
    onDragOver: vi.fn(),
    onDrop: vi.fn(),
    onFileUpload: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("should render children correctly", () => {
      render(
        <DragDropZone {...defaultProps}>
          <div>Test Content</div>
        </DragDropZone>
      );

      expect(screen.getByText("Test Content")).toBeInTheDocument();
    });

    it("should render without dragOver class when isDragOver is false", () => {
      const { container } = render(
        <DragDropZone {...defaultProps} isDragOver={false}>
          <div>Content</div>
        </DragDropZone>
      );

      const dragDropZone = container.firstChild as HTMLElement;
      expect(dragDropZone).not.toHaveClass("dragOver");
    });

    it("should render with dragOver class when isDragOver is true", () => {
      const { container } = render(
        <DragDropZone {...defaultProps} isDragOver={true}>
          <div>Content</div>
        </DragDropZone>
      );

      const dragDropZone = container.firstChild as HTMLElement;
      expect(dragDropZone).toHaveClass(styles.dragOver || "dragOver");
    });

    it("should render hidden file inputs", () => {
      const { container } = render(
        <DragDropZone {...defaultProps}>
          <div>Content</div>
        </DragDropZone>
      );

      const fileInputs = container.querySelectorAll('input[type="file"]');
      expect(fileInputs).toHaveLength(2);

      // Check first input (regular file input)
      expect(fileInputs[0]).toHaveAttribute("multiple");
      expect(fileInputs[0]).toHaveStyle({ display: "none" });

      // Check second input (folder input)
      expect(fileInputs[1]).toHaveAttribute("webkitdirectory");
      expect(fileInputs[1]).toHaveStyle({ display: "none" });
    });

    it("should render trigger buttons for testing", () => {
      render(
        <DragDropZone {...defaultProps}>
          <div>Content</div>
        </DragDropZone>
      );

      expect(screen.getByTestId("trigger-file-upload")).toBeInTheDocument();
      expect(screen.getByTestId("trigger-folder-upload")).toBeInTheDocument();
    });
  });

  describe("Drag and Drop Events", () => {
    it("should call onDragEnter when drag enter event occurs", () => {
      const { container } = render(
        <DragDropZone {...defaultProps}>
          <div>Content</div>
        </DragDropZone>
      );

      fireEvent.dragEnter(container.firstChild!);

      expect(defaultProps.onDragEnter).toHaveBeenCalledWith(
        expect.objectContaining({ type: "dragenter" })
      );
    });

    it("should call onDragLeave when drag leave event occurs", () => {
      const { container } = render(
        <DragDropZone {...defaultProps}>
          <div>Content</div>
        </DragDropZone>
      );

      fireEvent.dragLeave(container.firstChild!);

      expect(defaultProps.onDragLeave).toHaveBeenCalledWith(
        expect.objectContaining({ type: "dragleave" })
      );
    });

    it("should call onDragOver when drag over event occurs", () => {
      const { container } = render(
        <DragDropZone {...defaultProps}>
          <div>Content</div>
        </DragDropZone>
      );

      fireEvent.dragOver(container.firstChild!);

      expect(defaultProps.onDragOver).toHaveBeenCalledWith(
        expect.objectContaining({ type: "dragover" })
      );
    });

    it("should call onDrop when drop event occurs", () => {
      const { container } = render(
        <DragDropZone {...defaultProps}>
          <div>Content</div>
        </DragDropZone>
      );

      fireEvent.drop(container.firstChild!);

      expect(defaultProps.onDrop).toHaveBeenCalledWith(
        expect.objectContaining({ type: "drop" })
      );
    });
  });

  describe("File Input Handling", () => {
    it("should call onFileUpload when files are selected", () => {
      const { container } = render(
        <DragDropZone {...defaultProps}>
          <div>Content</div>
        </DragDropZone>
      );

      const fileInput = container.querySelector(
        'input[type="file"][multiple]'
      ) as HTMLInputElement;
      const mockFiles = [
        createMockFile("file1.txt"),
        createMockFile("file2.txt"),
      ];

      Object.defineProperty(fileInput, "files", {
        value: createMockFileList(mockFiles),
        writable: false,
      });

      fireEvent.change(fileInput);

      expect(defaultProps.onFileUpload).toHaveBeenCalledWith(mockFiles, false);
    });

    it("should reset file input value after selection", () => {
      const { container } = render(
        <DragDropZone {...defaultProps}>
          <div>Content</div>
        </DragDropZone>
      );

      const fileInput = container.querySelector(
        'input[type="file"][multiple]'
      ) as HTMLInputElement;
      const mockFiles = [createMockFile("file1.txt")];

      Object.defineProperty(fileInput, "files", {
        value: createMockFileList(mockFiles),
        writable: false,
      });

      fireEvent.change(fileInput);

      expect(fileInput.value).toBe("");
    });

    it("should not call onFileUpload when no files are selected", () => {
      const { container } = render(
        <DragDropZone {...defaultProps}>
          <div>Content</div>
        </DragDropZone>
      );

      const fileInput = container.querySelector(
        'input[type="file"][multiple]'
      ) as HTMLInputElement;

      Object.defineProperty(fileInput, "files", {
        value: null,
        writable: false,
      });

      fireEvent.change(fileInput);

      expect(defaultProps.onFileUpload).not.toHaveBeenCalled();
    });
  });

  describe("Folder Input Handling", () => {
    it("should call onFileUpload with folder flag when folder is selected", () => {
      const { container } = render(
        <DragDropZone {...defaultProps}>
          <div>Content</div>
        </DragDropZone>
      );

      const folderInput = container.querySelector(
        "input[webkitdirectory]"
      ) as HTMLInputElement;
      const mockFiles = [
        createMockFile("folder/file1.txt"),
        createMockFile("folder/file2.txt"),
      ];

      Object.defineProperty(folderInput, "files", {
        value: createMockFileList(mockFiles),
        writable: false,
      });

      fireEvent.change(folderInput);

      expect(defaultProps.onFileUpload).toHaveBeenCalledWith(mockFiles, true);
    });

    it("should reset folder input value after selection", () => {
      const { container } = render(
        <DragDropZone {...defaultProps}>
          <div>Content</div>
        </DragDropZone>
      );

      const folderInput = container.querySelector(
        "input[webkitdirectory]"
      ) as HTMLInputElement;
      const mockFiles = [createMockFile("folder/file1.txt")];

      Object.defineProperty(folderInput, "files", {
        value: createMockFileList(mockFiles),
        writable: false,
      });

      fireEvent.change(folderInput);

      expect(folderInput.value).toBe("");
    });

    it("should not call onFileUpload when no folder files are selected", () => {
      const { container } = render(
        <DragDropZone {...defaultProps}>
          <div>Content</div>
        </DragDropZone>
      );

      const folderInput = container.querySelector(
        "input[webkitdirectory]"
      ) as HTMLInputElement;

      Object.defineProperty(folderInput, "files", {
        value: null,
        writable: false,
      });

      fireEvent.change(folderInput);

      expect(defaultProps.onFileUpload).not.toHaveBeenCalled();
    });
  });

  describe("Trigger Functions", () => {
    it("should trigger file upload when trigger button is clicked", () => {
      const { container } = render(
        <DragDropZone {...defaultProps}>
          <div>Content</div>
        </DragDropZone>
      );

      const fileInput = container.querySelector(
        'input[type="file"][multiple]'
      ) as HTMLInputElement;
      const clickSpy = vi.spyOn(fileInput, "click");

      fireEvent.click(screen.getByTestId("trigger-file-upload"));

      expect(clickSpy).toHaveBeenCalled();
    });

    it("should trigger folder upload when trigger button is clicked", () => {
      const { container } = render(
        <DragDropZone {...defaultProps}>
          <div>Content</div>
        </DragDropZone>
      );

      const folderInput = container.querySelector(
        "input[webkitdirectory]"
      ) as HTMLInputElement;
      const clickSpy = vi.spyOn(folderInput, "click");

      fireEvent.click(screen.getByTestId("trigger-folder-upload"));

      expect(clickSpy).toHaveBeenCalled();
    });

    it("should not trigger file upload when disabled", () => {
      const { container } = render(
        <DragDropZone {...defaultProps} disabled={true}>
          <div>Content</div>
        </DragDropZone>
      );

      const fileInput = container.querySelector(
        'input[type="file"][multiple]'
      ) as HTMLInputElement;
      const clickSpy = vi.spyOn(fileInput, "click");

      fireEvent.click(screen.getByTestId("trigger-file-upload"));

      expect(clickSpy).not.toHaveBeenCalled();
    });

    it("should not trigger folder upload when disabled", () => {
      const { container } = render(
        <DragDropZone {...defaultProps} disabled={true}>
          <div>Content</div>
        </DragDropZone>
      );

      const folderInput = container.querySelector(
        "input[webkitdirectory]"
      ) as HTMLInputElement;
      const clickSpy = vi.spyOn(folderInput, "click");

      fireEvent.click(screen.getByTestId("trigger-folder-upload"));

      expect(clickSpy).not.toHaveBeenCalled();
    });
  });

  describe("Disabled State", () => {
    it("should default to enabled when disabled prop is not provided", () => {
      const { container } = render(
        <DragDropZone {...defaultProps}>
          <div>Content</div>
        </DragDropZone>
      );

      const fileInput = container.querySelector(
        'input[type="file"][multiple]'
      ) as HTMLInputElement;
      const clickSpy = vi.spyOn(fileInput, "click");

      fireEvent.click(screen.getByTestId("trigger-file-upload"));

      expect(clickSpy).toHaveBeenCalled();
    });

    it("should be enabled when disabled is explicitly false", () => {
      const { container } = render(
        <DragDropZone {...defaultProps} disabled={false}>
          <div>Content</div>
        </DragDropZone>
      );

      const fileInput = container.querySelector(
        'input[type="file"][multiple]'
      ) as HTMLInputElement;
      const clickSpy = vi.spyOn(fileInput, "click");

      fireEvent.click(screen.getByTestId("trigger-file-upload"));

      expect(clickSpy).toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty file arrays", () => {
      const { container } = render(
        <DragDropZone {...defaultProps}>
          <div>Content</div>
        </DragDropZone>
      );

      const fileInput = container.querySelector(
        'input[type="file"][multiple]'
      ) as HTMLInputElement;

      Object.defineProperty(fileInput, "files", {
        value: createMockFileList([]),
        writable: false,
      });

      fireEvent.change(fileInput);

      expect(defaultProps.onFileUpload).toHaveBeenCalledWith([], false);
    });

    it("should handle files with special characters in names", () => {
      const { container } = render(
        <DragDropZone {...defaultProps}>
          <div>Content</div>
        </DragDropZone>
      );

      const fileInput = container.querySelector(
        'input[type="file"][multiple]'
      ) as HTMLInputElement;
      const mockFiles = [
        createMockFile("file with spaces.txt"),
        createMockFile("file-with-dashes.txt"),
        createMockFile("файл.txt"),
      ];

      Object.defineProperty(fileInput, "files", {
        value: createMockFileList(mockFiles),
        writable: false,
      });

      fireEvent.change(fileInput);

      expect(defaultProps.onFileUpload).toHaveBeenCalledWith(mockFiles, false);
    });

    it("should handle large number of files", () => {
      const { container } = render(
        <DragDropZone {...defaultProps}>
          <div>Content</div>
        </DragDropZone>
      );

      const fileInput = container.querySelector(
        'input[type="file"][multiple]'
      ) as HTMLInputElement;
      const mockFiles = Array.from({ length: 100 }, (_, i) =>
        createMockFile(`file${i}.txt`)
      );

      Object.defineProperty(fileInput, "files", {
        value: createMockFileList(mockFiles),
        writable: false,
      });

      fireEvent.change(fileInput);

      expect(defaultProps.onFileUpload).toHaveBeenCalledWith(mockFiles, false);
    });
  });
});

describe("useDragDropZone hook", () => {
  function TestComponent() {
    const {
      fileInputRef,
      folderInputRef,
      triggerFileUpload,
      triggerFolderUpload,
    } = useDragDropZone();

    return (
      <div>
        <input ref={fileInputRef} type="file" data-testid="file-input" />
        <input ref={folderInputRef} type="file" data-testid="folder-input" />
        <button onClick={triggerFileUpload} data-testid="trigger-file">
          Trigger File
        </button>
        <button onClick={triggerFolderUpload} data-testid="trigger-folder">
          Trigger Folder
        </button>
      </div>
    );
  }

  it("should provide refs for file and folder inputs", () => {
    render(<TestComponent />);

    expect(screen.getByTestId("file-input")).toBeInTheDocument();
    expect(screen.getByTestId("folder-input")).toBeInTheDocument();
  });

  it("should trigger file input click when triggerFileUpload is called", () => {
    render(<TestComponent />);

    const fileInput = screen.getByTestId("file-input");
    const clickSpy = vi.spyOn(fileInput, "click");

    fireEvent.click(screen.getByTestId("trigger-file"));

    expect(clickSpy).toHaveBeenCalled();
  });

  it("should trigger folder input click when triggerFolderUpload is called", () => {
    render(<TestComponent />);

    const folderInput = screen.getByTestId("folder-input");
    const clickSpy = vi.spyOn(folderInput, "click");

    fireEvent.click(screen.getByTestId("trigger-folder"));

    expect(clickSpy).toHaveBeenCalled();
  });

  it("should handle null refs gracefully", () => {
    function TestComponentWithNullRefs() {
      const { triggerFileUpload, triggerFolderUpload } = useDragDropZone();

      // Don't attach refs to inputs
      return (
        <div>
          <button onClick={triggerFileUpload} data-testid="trigger-file">
            Trigger File
          </button>
          <button onClick={triggerFolderUpload} data-testid="trigger-folder">
            Trigger Folder
          </button>
        </div>
      );
    }

    render(<TestComponentWithNullRefs />);

    // Should not throw when refs are null
    expect(() => {
      fireEvent.click(screen.getByTestId("trigger-file"));
      fireEvent.click(screen.getByTestId("trigger-folder"));
    }).not.toThrow();
  });
});
