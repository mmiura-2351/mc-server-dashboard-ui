import { describe, test, expect, vi, beforeEach } from "vitest";
import {
  listFiles,
  readTextFile,
  writeFile,
  deleteFile,
  uploadFileWithProgress,
  uploadFolderStructure,
} from "./files";
import { ok, err } from "neverthrow";

// Mock the API module
vi.mock("./api", () => ({
  fetchJson: vi.fn(),
  fetchEmpty: vi.fn(),
}));

// Mock XMLHttpRequest
const mockXMLHttpRequest = {
  open: vi.fn(),
  send: vi.fn(),
  setRequestHeader: vi.fn(),
  upload: {
    addEventListener: vi.fn(),
  },
  addEventListener: vi.fn(),
  status: 200,
  responseText: '{"success": true}',
  onload: null as any,
  onerror: null as any,
};

global.XMLHttpRequest = vi.fn(() => mockXMLHttpRequest) as any;

// Mock localStorage
Object.defineProperty(window, "localStorage", {
  value: {
    getItem: vi.fn(() => "test-token"),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
  writable: true,
});

describe("File service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockXMLHttpRequest.status = 200;
    mockXMLHttpRequest.responseText = '{"success": true}';
  });

  describe("listFiles", () => {
    test("should return files for root path", async () => {
      const { fetchJson } = await import("./api");
      const mockResponse = {
        files: [
          {
            name: "server.properties",
            type: "text",
            is_directory: false,
            size: 1024,
            modified: "2023-01-01T00:00:00Z",
            path: "/server.properties",
            permissions: { read: true, write: true, execute: false },
          },
        ],
        current_path: "/",
        total_files: 1,
      };

      vi.mocked(fetchJson).mockResolvedValue(ok(mockResponse));

      const result = await listFiles(1, "/");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].name).toBe("server.properties");
      }
    });

    test("should handle subdirectory paths", async () => {
      const { fetchJson } = await import("./api");
      const mockResponse = {
        files: [
          {
            name: "config.yml",
            type: "text",
            is_directory: false,
            size: 512,
            modified: "2023-01-01T00:00:00Z",
            path: "/plugins/config.yml",
            permissions: { read: true, write: true, execute: false },
          },
        ],
        current_path: "/plugins",
        total_files: 1,
      };

      vi.mocked(fetchJson).mockResolvedValue(ok(mockResponse));

      const result = await listFiles(1, "/plugins");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].name).toBe("config.yml");
      }

      // Check the URL was called with correct path encoding
      expect(fetchJson).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/files/servers/1/files?path=plugins"
      );
    });

    test("should handle API errors", async () => {
      const { fetchJson } = await import("./api");

      vi.mocked(fetchJson).mockResolvedValue(
        err({ message: "Server error", status: 500 })
      );

      const result = await listFiles(1, "/");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Server error");
      }
    });
  });

  describe("readTextFile", () => {
    test("should read file content", async () => {
      const { fetchJson } = await import("./api");
      const mockResponse = {
        content: "server-port=25565",
        encoding: "utf-8",
        file_info: {
          name: "server.properties",
          size: 17,
          modified: "2023-01-01T00:00:00Z",
          permissions: { read: true, write: true, execute: false },
        },
        is_image: false,
        image_data: null,
      };

      vi.mocked(fetchJson).mockResolvedValue(ok(mockResponse));

      const result = await readTextFile(1, "server.properties");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content).toBe("server-port=25565");
        expect(result.value.encoding).toBe("utf-8");
      }
    });
  });

  describe("writeFile", () => {
    test("should write file content", async () => {
      const { fetchEmpty } = await import("./api");

      vi.mocked(fetchEmpty).mockResolvedValue(ok(undefined));

      const result = await writeFile(1, "server.properties", {
        content: "server-port=25566",
        encoding: "utf-8",
        create_backup: true,
      });

      expect(result.isOk()).toBe(true);
    });
  });

  describe("deleteFile", () => {
    test("should delete file", async () => {
      const { fetchEmpty } = await import("./api");

      vi.mocked(fetchEmpty).mockResolvedValue(ok(undefined));

      const result = await deleteFile(1, "old-file.txt");

      expect(result.isOk()).toBe(true);
    });
  });

  describe("uploadFileWithProgress", () => {
    test("should upload regular file without directory structure", async () => {
      const file = new File(["test content"], "test.txt", {
        type: "text/plain",
      });

      setTimeout(() => {
        mockXMLHttpRequest.onload?.();
      }, 0);

      const result = await uploadFileWithProgress(1, "/", file);

      expect(result.isOk()).toBe(true);
      expect(mockXMLHttpRequest.open).toHaveBeenCalledWith(
        "POST",
        "http://localhost:8000/api/v1/files/servers/1/files/upload"
      );
      expect(mockXMLHttpRequest.setRequestHeader).toHaveBeenCalledWith(
        "Authorization",
        "Bearer test-token"
      );
    });

    test("should upload file with webkitRelativePath preserving folder structure", async () => {
      const file = new File(["test content"], "test.txt", {
        type: "text/plain",
      });

      // Mock webkitRelativePath
      Object.defineProperty(file, "webkitRelativePath", {
        value: "folder/subfolder/test.txt",
        writable: false,
        enumerable: true,
        configurable: false,
      });

      setTimeout(() => {
        mockXMLHttpRequest.onload?.();
      }, 0);

      const result = await uploadFileWithProgress(1, "folder/subfolder", file);

      expect(result.isOk()).toBe(true);
      expect(mockXMLHttpRequest.send).toHaveBeenCalled();
    });

    test("should handle upload errors", async () => {
      const file = new File(["test content"], "test.txt", {
        type: "text/plain",
      });
      mockXMLHttpRequest.status = 500;
      mockXMLHttpRequest.responseText = '{"detail": "Upload failed"}';

      setTimeout(() => {
        mockXMLHttpRequest.onload?.();
      }, 0);

      const result = await uploadFileWithProgress(1, "/", file);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Upload failed");
      }
    });

    test("should handle network errors", async () => {
      const file = new File(["test content"], "test.txt", {
        type: "text/plain",
      });

      setTimeout(() => {
        mockXMLHttpRequest.onerror?.();
      }, 0);

      const result = await uploadFileWithProgress(1, "/", file);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Network error during upload");
      }
    });
  });

  describe("uploadFolderStructure", () => {
    test("should group files by directory structure", async () => {
      const file1 = new File(["content1"], "file1.txt", { type: "text/plain" });
      const file2 = new File(["content2"], "file2.txt", { type: "text/plain" });

      // Mock webkitRelativePath for folder structure
      Object.defineProperty(file1, "webkitRelativePath", {
        value: "testfolder/file1.txt",
        writable: false,
        enumerable: true,
        configurable: false,
      });

      Object.defineProperty(file2, "webkitRelativePath", {
        value: "testfolder/subdir/file2.txt",
        writable: false,
        enumerable: true,
        configurable: false,
      });

      const files = [file1, file2];

      // Mock all uploads as successful
      mockXMLHttpRequest.send = vi.fn(() => {
        setTimeout(() => {
          mockXMLHttpRequest.status = 200;
          mockXMLHttpRequest.onload?.();
        }, 0);
      });

      const result = await uploadFolderStructure(1, "/", files);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.successful).toHaveLength(2);
        expect(result.value.failed).toHaveLength(0);
      }
    });

    test("should handle individual file upload errors", async () => {
      const file1 = new File(["content1"], "file1.txt", { type: "text/plain" });

      Object.defineProperty(file1, "webkitRelativePath", {
        value: "testfolder/file1.txt",
        writable: false,
        enumerable: true,
        configurable: false,
      });

      const files = [file1];

      // Mock upload failure
      mockXMLHttpRequest.send = vi.fn(() => {
        setTimeout(() => {
          mockXMLHttpRequest.status = 500;
          mockXMLHttpRequest.responseText = '{"detail": "Permission denied"}';
          mockXMLHttpRequest.onload?.();
        }, 0);
      });

      const result = await uploadFolderStructure(1, "/", files);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.successful).toHaveLength(0);
        expect(result.value.failed).toHaveLength(1);
        expect(result.value.failed[0].error).toBe("Permission denied");
      }
    });
  });
});
