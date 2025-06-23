import type { AuthError } from "@/types/auth";

// Response type definitions for different API operations
export type ApiResponse<T> = JsonResponse<T> | EmptyResponse | BlobResponse;

export interface JsonResponse<T> {
  type: "json";
  data: T;
}

export interface EmptyResponse {
  type: "empty";
}

export interface BlobResponse {
  type: "blob";
  data: Blob;
}

// HTTP method types that typically return empty responses
export type EmptyResponseMethod = "DELETE" | "PUT" | "PATCH";

// HTTP method types that typically return JSON responses
export type JsonResponseMethod = "GET" | "POST";

// Request configuration with response type specification
export interface ApiRequestConfig extends Omit<RequestInit, "method"> {
  method?: string;
  expectEmpty?: boolean; // Explicitly expect empty response
  expectBlob?: boolean; // Explicitly expect blob response
  timeout?: number; // Request timeout in milliseconds
}

// Response handler interface
export interface ResponseHandler {
  canHandle(response: Response, config: ApiRequestConfig): boolean;
  handle<T>(response: Response): Promise<ApiResponse<T>>;
}

// Error handling types
export interface ApiError extends AuthError {
  type: "api_error";
  response?: Response;
}
