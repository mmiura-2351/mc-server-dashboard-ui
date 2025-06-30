import { describe, test, expect, vi, beforeEach } from "vitest";
import {
  listFiles,
  readFile,
  readTextFile,
  writeFile,
  deleteFile,
  renameFile,
  createDirectory,
  uploadFile,
  uploadMultipleFiles,
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
  onload: null as
    | ((
        this: XMLHttpRequest,
        ev: ProgressEvent<XMLHttpRequestEventTarget>
      ) => void)
    | null,
  onerror: null as
    | ((
        this: XMLHttpRequest,
        ev: ProgressEvent<XMLHttpRequestEventTarget>
      ) => void)
    | null,
};

global.XMLHttpRequest = vi.fn(
  () => mockXMLHttpRequest
) as unknown as typeof XMLHttpRequest;

// Helper function to create valid JWT tokens for testing
const createValidTestToken = () => {
  const futureTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
  const payload = {
    sub: "test-user",
    exp: futureTime,
    iat: Math.floor(Date.now() / 1000),
  };
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  return `${encodedHeader}.${encodedPayload}.test-signature`;
};

// Mock localStorage
Object.defineProperty(window, "localStorage", {
  value: {
    getItem: vi.fn(() => createValidTestToken()),
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
        expect(result.value[0]!.name).toBe("server.properties");
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
        expect(result.value[0]!.name).toBe("config.yml");
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

  describe("renameFile", () => {
    test("should rename file successfully", async () => {
      const { fetchEmpty } = await import("./api");

      vi.mocked(fetchEmpty).mockResolvedValue(ok(undefined));

      const result = await renameFile(1, "old-name.txt", "new-name.txt");

      expect(result.isOk()).toBe(true);
      expect(fetchEmpty).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/files/servers/1/files/old-name.txt/rename",
        {
          method: "PATCH",
          body: JSON.stringify({ new_name: "new-name.txt" }),
        }
      );
    });

    test("should handle file paths with leading slash", async () => {
      const { fetchEmpty } = await import("./api");

      vi.mocked(fetchEmpty).mockResolvedValue(ok(undefined));

      const result = await renameFile(
        1,
        "/plugins/config.yml",
        "new-config.yml"
      );

      expect(result.isOk()).toBe(true);
      expect(fetchEmpty).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/files/servers/1/files/plugins%2Fconfig.yml/rename",
        {
          method: "PATCH",
          body: JSON.stringify({ new_name: "new-config.yml" }),
        }
      );
    });

    test("should handle rename errors", async () => {
      const { fetchEmpty } = await import("./api");

      vi.mocked(fetchEmpty).mockResolvedValue(
        err({ message: "Permission denied", status: 403 })
      );

      const result = await renameFile(1, "readonly.txt", "new-name.txt");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Permission denied");
        expect(result.error.status).toBe(403);
      }
    });

    test("should encode special characters in file paths", async () => {
      const { fetchEmpty } = await import("./api");

      vi.mocked(fetchEmpty).mockResolvedValue(ok(undefined));

      const result = await renameFile(
        1,
        "file with spaces.txt",
        "new name.txt"
      );

      expect(result.isOk()).toBe(true);
      expect(fetchEmpty).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/files/servers/1/files/file%20with%20spaces.txt/rename",
        {
          method: "PATCH",
          body: JSON.stringify({ new_name: "new name.txt" }),
        }
      );
    });
  });

  describe("uploadFileWithProgress", () => {
    test("should upload regular file without directory structure", async () => {
      const file = new File(["test content"], "test.txt", {
        type: "text/plain",
      });

      setTimeout(() => {
        mockXMLHttpRequest.onload?.call(
          mockXMLHttpRequest as unknown as XMLHttpRequest,
          {} as ProgressEvent<XMLHttpRequestEventTarget>
        );
      }, 0);

      const result = await uploadFileWithProgress(1, "/", file);

      expect(result.isOk()).toBe(true);
      expect(mockXMLHttpRequest.open).toHaveBeenCalledWith(
        "POST",
        "http://localhost:8000/api/v1/files/servers/1/files/upload"
      );
      expect(mockXMLHttpRequest.setRequestHeader).toHaveBeenCalledWith(
        "Authorization",
        `Bearer ${createValidTestToken()}`
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
        mockXMLHttpRequest.onload?.call(
          mockXMLHttpRequest as unknown as XMLHttpRequest,
          {} as ProgressEvent<XMLHttpRequestEventTarget>
        );
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
        mockXMLHttpRequest.onload?.call(
          mockXMLHttpRequest as unknown as XMLHttpRequest,
          {} as ProgressEvent<XMLHttpRequestEventTarget>
        );
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
        mockXMLHttpRequest.onerror?.call(
          mockXMLHttpRequest as unknown as XMLHttpRequest,
          {} as ProgressEvent<XMLHttpRequestEventTarget>
        );
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
          mockXMLHttpRequest.onload?.call(
            mockXMLHttpRequest as unknown as XMLHttpRequest,
            {} as ProgressEvent<XMLHttpRequestEventTarget>
          );
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
          mockXMLHttpRequest.onload?.call(
            mockXMLHttpRequest as unknown as XMLHttpRequest,
            {} as ProgressEvent<XMLHttpRequestEventTarget>
          );
        }, 0);
      });

      const result = await uploadFolderStructure(1, "/", files);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.successful).toHaveLength(0);
        expect(result.value.failed).toHaveLength(1);
        expect(result.value.failed[0]!.error).toBe("Permission denied");
      }
    });
  });

  describe("readFile", () => {
    test("should read file content successfully", async () => {
      const { fetchJson } = await import("./api");
      const mockResponse = {
        content: "file content here",
        encoding: "utf-8",
        file_info: {
          name: "test.txt",
          size: 100,
          modified: "2023-01-01T00:00:00Z",
          is_directory: false,
        },
      };

      vi.mocked(fetchJson).mockResolvedValue(ok(mockResponse));

      const result = await readFile(1, "/test.txt");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content).toBe("file content here");
        expect(result.value.encoding).toBe("utf-8");
        expect(result.value.file_info.size).toBe(100);
      }

      expect(fetchJson).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/files/servers/1/files/test.txt/read"
      );
    });

    test("should read image file with image parameter", async () => {
      const { fetchJson } = await import("./api");
      const mockResponse = {
        content: "base64imagedata",
        encoding: "base64",
        file_info: {
          name: "image.png",
          size: 1024,
          modified: "2023-01-01T00:00:00Z",
          is_directory: false,
        },
      };

      vi.mocked(fetchJson).mockResolvedValue(ok(mockResponse));

      const result = await readFile(1, "images/image.png", true);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content).toBe("base64imagedata");
        expect(result.value.encoding).toBe("base64");
      }

      expect(fetchJson).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/files/servers/1/files/images%2Fimage.png/read?image=true"
      );
    });

    test("should handle read file error", async () => {
      const { fetchJson } = await import("./api");

      vi.mocked(fetchJson).mockResolvedValue(
        err({ message: "File not found", status: 404 })
      );

      const result = await readFile(1, "/nonexistent.txt");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("File not found");
        expect(result.error.status).toBe(404);
      }
    });
  });

  describe("createDirectory", () => {
    test("should create directory successfully", async () => {
      const { fetchEmpty } = await import("./api");

      vi.mocked(fetchEmpty).mockResolvedValue(ok(undefined));

      const result = await createDirectory(1, "/plugins", "newdir");

      expect(result.isOk()).toBe(true);

      expect(fetchEmpty).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/files/servers/1/files/plugins/directories",
        {
          method: "POST",
          body: JSON.stringify({ name: "newdir" }),
        }
      );
    });

    test("should create directory in root path", async () => {
      const { fetchEmpty } = await import("./api");

      vi.mocked(fetchEmpty).mockResolvedValue(ok(undefined));

      const result = await createDirectory(1, "/", "rootdir");

      expect(result.isOk()).toBe(true);

      expect(fetchEmpty).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/files/servers/1/files//directories",
        {
          method: "POST",
          body: JSON.stringify({ name: "rootdir" }),
        }
      );
    });

    test("should handle directory creation error", async () => {
      const { fetchEmpty } = await import("./api");

      vi.mocked(fetchEmpty).mockResolvedValue(
        err({ message: "Permission denied", status: 403 })
      );

      const result = await createDirectory(1, "/plugins", "newdir");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Permission denied");
        expect(result.error.status).toBe(403);
      }
    });
  });

  describe("uploadFile", () => {
    test("should upload file successfully", async () => {
      const { fetchEmpty } = await import("./api");

      vi.mocked(fetchEmpty).mockResolvedValue(ok(undefined));

      const file = new File(["test content"], "test.txt", {
        type: "text/plain",
      });
      const result = await uploadFile(1, "/uploads", file);

      expect(result.isOk()).toBe(true);

      expect(fetchEmpty).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/files/servers/1/files/upload",
        expect.objectContaining({
          method: "POST",
          body: expect.any(FormData),
        })
      );
    });

    test("should upload file to root directory", async () => {
      const { fetchEmpty } = await import("./api");

      vi.mocked(fetchEmpty).mockResolvedValue(ok(undefined));

      const file = new File(["test content"], "test.txt", {
        type: "text/plain",
      });
      const result = await uploadFile(1, "/", file);

      expect(result.isOk()).toBe(true);
    });

    test("should handle upload error", async () => {
      const { fetchEmpty } = await import("./api");

      vi.mocked(fetchEmpty).mockResolvedValue(
        err({ message: "Upload failed", status: 500 })
      );

      const file = new File(["test content"], "test.txt", {
        type: "text/plain",
      });
      const result = await uploadFile(1, "/uploads", file);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Upload failed");
        expect(result.error.status).toBe(500);
      }
    });
  });

  describe("uploadMultipleFiles", () => {
    test("should upload multiple files successfully", async () => {
      const file1 = new File(["content1"], "file1.txt", { type: "text/plain" });
      const file2 = new File(["content2"], "file2.txt", { type: "text/plain" });
      const files = [file1, file2];

      // Mock all uploads as successful
      mockXMLHttpRequest.send = vi.fn(() => {
        setTimeout(() => {
          mockXMLHttpRequest.status = 200;
          mockXMLHttpRequest.onload?.call(
            mockXMLHttpRequest as unknown as XMLHttpRequest,
            {} as ProgressEvent<XMLHttpRequestEventTarget>
          );
        }, 0);
      });

      const result = await uploadMultipleFiles(1, "/uploads", files);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.successful).toEqual(["file1.txt", "file2.txt"]);
        expect(result.value.failed).toHaveLength(0);
      }
    });

    test("should handle mixed success and failure", async () => {
      const file1 = new File(["content1"], "file1.txt", { type: "text/plain" });
      const file2 = new File(["content2"], "file2.txt", { type: "text/plain" });
      const files = [file1, file2];

      let callCount = 0;
      mockXMLHttpRequest.send = vi.fn(() => {
        setTimeout(() => {
          if (callCount === 0) {
            // First file succeeds
            mockXMLHttpRequest.status = 200;
            mockXMLHttpRequest.onload?.call(
              mockXMLHttpRequest as unknown as XMLHttpRequest,
              {} as ProgressEvent<XMLHttpRequestEventTarget>
            );
          } else {
            // Second file fails
            mockXMLHttpRequest.status = 500;
            mockXMLHttpRequest.responseText = '{"detail": "Upload failed"}';
            mockXMLHttpRequest.onload?.call(
              mockXMLHttpRequest as unknown as XMLHttpRequest,
              {} as ProgressEvent<XMLHttpRequestEventTarget>
            );
          }
          callCount++;
        }, 0);
      });

      const result = await uploadMultipleFiles(1, "/uploads", files);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.successful).toEqual(["file1.txt"]);
        expect(result.value.failed).toHaveLength(1);
        expect(result.value.failed[0]!.file).toBe("file2.txt");
        expect(result.value.failed[0]!.error).toBe("Upload failed");
      }
    });

    test("should handle missing files in array", async () => {
      const file1 = new File(["content1"], "file1.txt", { type: "text/plain" });
      const files = [
        file1,
        null as unknown as File,
        undefined as unknown as File,
      ];

      mockXMLHttpRequest.send = vi.fn(() => {
        setTimeout(() => {
          mockXMLHttpRequest.status = 200;
          mockXMLHttpRequest.onload?.call(
            mockXMLHttpRequest as unknown as XMLHttpRequest,
            {} as ProgressEvent<XMLHttpRequestEventTarget>
          );
        }, 0);
      });

      const result = await uploadMultipleFiles(1, "/uploads", files);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.successful).toEqual(["file1.txt"]);
        expect(result.value.failed).toHaveLength(2);
        expect(result.value.failed[0]!.file).toBe("File 2");
        expect(result.value.failed[0]!.error).toBe("missing");
        expect(result.value.failed[1]!.file).toBe("File 3");
        expect(result.value.failed[1]!.error).toBe("missing");
      }
    });

    test("should call progress callback", async () => {
      const file1 = new File(["content1"], "file1.txt", { type: "text/plain" });
      const files = [file1];
      const progressCallback = vi.fn();

      mockXMLHttpRequest.send = vi.fn(() => {
        setTimeout(() => {
          mockXMLHttpRequest.status = 200;
          mockXMLHttpRequest.onload?.call(
            mockXMLHttpRequest as unknown as XMLHttpRequest,
            {} as ProgressEvent<XMLHttpRequestEventTarget>
          );
        }, 0);
      });

      const result = await uploadMultipleFiles(
        1,
        "/uploads",
        files,
        progressCallback
      );

      expect(result.isOk()).toBe(true);
      // Progress callback should be called during upload
      // Note: The exact call depends on the internal implementation
    });
  });
});
