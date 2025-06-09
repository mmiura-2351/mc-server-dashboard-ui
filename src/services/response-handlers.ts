import type {
  ApiResponse,
  ResponseHandler,
  ApiRequestConfig,
  JsonResponse,
  EmptyResponse,
  BlobResponse,
} from "./api-types";

// Handler for JSON responses
export class JsonResponseHandler implements ResponseHandler {
  canHandle(response: Response, config: ApiRequestConfig): boolean {
    if (config.expectEmpty || config.expectBlob) {
      return false;
    }

    const contentType = response.headers.get("content-type");
    return contentType?.includes("application/json") ?? false;
  }

  async handle<T>(response: Response): Promise<ApiResponse<T>> {
    const data = await response.json();
    return {
      type: "json",
      data,
    } as JsonResponse<T>;
  }
}

// Handler for empty responses (common with DELETE, PUT, PATCH)
export class EmptyResponseHandler implements ResponseHandler {
  canHandle(response: Response, config: ApiRequestConfig): boolean {
    if (config.expectEmpty) {
      return true;
    }

    // Auto-detect empty responses
    const contentLength = response.headers.get("content-length");
    const contentType = response.headers.get("content-type");

    return (
      contentLength === "0" ||
      (!contentType?.includes("application/json") &&
        !contentType?.includes("application/octet-stream"))
    );
  }

  async handle<T>(): Promise<ApiResponse<T>> {
    return {
      type: "empty",
    } as EmptyResponse;
  }
}

// Handler for blob responses (file downloads)
export class BlobResponseHandler implements ResponseHandler {
  canHandle(response: Response, config: ApiRequestConfig): boolean {
    if (config.expectBlob) {
      return true;
    }

    const contentType = response.headers.get("content-type");
    return contentType?.includes("application/octet-stream") ?? false;
  }

  async handle<T>(response: Response): Promise<ApiResponse<T>> {
    const data = await response.blob();
    return {
      type: "blob",
      data,
    } as BlobResponse;
  }
}

// Fallback handler that attempts to detect response type
export class FallbackResponseHandler implements ResponseHandler {
  canHandle(): boolean {
    return true; // Always can handle as fallback
  }

  async handle<T>(response: Response): Promise<ApiResponse<T>> {
    try {
      // Try to get response text first
      const responseText = await response.clone().text();

      // If empty, return empty response
      if (!responseText.trim()) {
        return {
          type: "empty",
        } as EmptyResponse;
      }

      // Try to parse as JSON
      try {
        const data = JSON.parse(responseText);
        return {
          type: "json",
          data,
        } as JsonResponse<T>;
      } catch {
        // If JSON parsing fails, treat as blob
        const blob = await response.blob();
        return {
          type: "blob",
          data: blob,
        } as BlobResponse;
      }
    } catch {
      // Ultimate fallback - return empty
      return {
        type: "empty",
      } as EmptyResponse;
    }
  }
}

// Response handler manager
export class ResponseHandlerManager {
  private handlers: ResponseHandler[] = [
    new JsonResponseHandler(),
    new EmptyResponseHandler(),
    new BlobResponseHandler(),
    new FallbackResponseHandler(), // Must be last
  ];

  async handleResponse<T>(
    response: Response,
    config: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    for (const handler of this.handlers) {
      if (handler.canHandle(response, config)) {
        return handler.handle<T>(response);
      }
    }

    // This should never be reached due to FallbackResponseHandler
    throw new Error("No response handler available");
  }
}
