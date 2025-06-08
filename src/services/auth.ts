import { ok, err, type Result } from "neverthrow";
import type {
  LoginRequest,
  LoginResponse,
  UserCreate,
  User,
  AuthError,
  UserUpdate,
  PasswordUpdate,
  UserDelete,
  RoleUpdate,
  UserWithToken,
} from "@/types/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchWithErrorHandling<T>(
  url: string,
  options?: RequestInit
): Promise<Result<T, AuthError>> {
  try {
    // Only add Content-Type header if not already specified and body is not FormData
    const headers: HeadersInit = { ...options?.headers };

    // Don't add Content-Type for FormData (browser will set it automatically)
    if (!(options?.body instanceof FormData)) {
      const headersObj = new Headers(headers);
      if (!headersObj.has("Content-Type")) {
        headersObj.set("Content-Type", "application/json");
      }

      const requestOptions: RequestInit = {
        ...options,
        headers: headersObj,
      };

      const response = await fetch(url, requestOptions);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "An error occurred";

        try {
          const errorData = JSON.parse(errorText);

          // Handle FastAPI validation errors (422)
          if (response.status === 422 && Array.isArray(errorData.detail)) {
            // Extract validation error messages
            const validationErrors = errorData.detail
              .map((error: any) => {
                const field = error.loc ? error.loc.join(".") : "field";
                return `${field}: ${error.msg}`;
              })
              .join(", ");
            errorMessage = `Validation error: ${validationErrors}`;
          } else if (errorData.detail) {
            // Handle standard FastAPI errors
            errorMessage = errorData.detail;
          } else {
            // Fallback for other error formats
            errorMessage = errorText || `HTTP ${response.status}`;
          }
        } catch {
          errorMessage = errorText || `HTTP ${response.status}`;
        }

        return err({
          message: errorMessage,
          status: response.status,
        });
      }

      const data = await response.json();
      return ok(data);
    } else {
      // For FormData, use original headers without modification
      const requestOptions: RequestInit = {
        ...options,
        headers,
      };

      const response = await fetch(url, requestOptions);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "An error occurred";

        try {
          const errorData = JSON.parse(errorText);

          // Handle FastAPI validation errors (422)
          if (response.status === 422 && Array.isArray(errorData.detail)) {
            // Extract validation error messages
            const validationErrors = errorData.detail
              .map((error: any) => {
                const field = error.loc ? error.loc.join(".") : "field";
                return `${field}: ${error.msg}`;
              })
              .join(", ");
            errorMessage = `Validation error: ${validationErrors}`;
          } else if (errorData.detail) {
            // Handle standard FastAPI errors
            errorMessage = errorData.detail;
          } else {
            // Fallback for other error formats
            errorMessage = errorText || `HTTP ${response.status}`;
          }
        } catch {
          errorMessage = errorText || `HTTP ${response.status}`;
        }

        return err({
          message: errorMessage,
          status: response.status,
        });
      }

      const data = await response.json();
      return ok(data);
    }
  } catch (error) {
    return err({
      message: error instanceof Error ? error.message : "Network error",
    });
  }
}

export async function login(
  credentials: LoginRequest
): Promise<Result<LoginResponse, AuthError>> {
  const formData = new FormData();
  formData.append("username", credentials.username);
  formData.append("password", credentials.password);

  return fetchWithErrorHandling<LoginResponse>(`${API_BASE_URL}/auth/token`, {
    method: "POST",
    headers: {},
    body: formData,
  });
}

export async function register(
  userData: UserCreate
): Promise<Result<User, AuthError>> {
  return fetchWithErrorHandling<User>(`${API_BASE_URL}/users/register`, {
    method: "POST",
    body: JSON.stringify(userData),
  });
}

export async function getCurrentUser(
  token: string
): Promise<Result<User, AuthError>> {
  return fetchWithErrorHandling<User>(`${API_BASE_URL}/users/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function updateUserInfo(
  token: string,
  userData: UserUpdate
): Promise<Result<UserWithToken, AuthError>> {
  return fetchWithErrorHandling<UserWithToken>(`${API_BASE_URL}/users/me`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(userData),
  });
}

export async function updatePassword(
  token: string,
  passwordData: PasswordUpdate
): Promise<Result<UserWithToken, AuthError>> {
  return fetchWithErrorHandling<UserWithToken>(
    `${API_BASE_URL}/users/me/password`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(passwordData),
    }
  );
}

export async function deleteAccount(
  token: string,
  deleteData: UserDelete
): Promise<Result<{ message: string }, AuthError>> {
  return fetchWithErrorHandling<{ message: string }>(
    `${API_BASE_URL}/users/me`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(deleteData),
    }
  );
}

export async function getAllUsers(
  token: string
): Promise<Result<User[], AuthError>> {
  return fetchWithErrorHandling<User[]>(`${API_BASE_URL}/users/`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function deleteUserByAdmin(
  token: string,
  userId: number
): Promise<Result<{ message: string }, AuthError>> {
  return fetchWithErrorHandling<{ message: string }>(
    `${API_BASE_URL}/users/${userId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

export async function approveUser(
  token: string,
  userId: number
): Promise<Result<User, AuthError>> {
  return fetchWithErrorHandling<User>(
    `${API_BASE_URL}/users/approve/${userId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

export async function updateUserRole(
  token: string,
  userId: number,
  roleData: RoleUpdate
): Promise<Result<User, AuthError>> {
  const bodyString = JSON.stringify(roleData);
  return fetchWithErrorHandling<User>(`${API_BASE_URL}/users/role/${userId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: bodyString,
  });
}
