import { type Result } from "neverthrow";
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
  RefreshTokenRequest,
  RefreshTokenResponse,
} from "@/types/auth";
import { fetchWithErrorHandling, fetchWithErrorHandlingInternal } from "@/services/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";


export async function login(
  credentials: LoginRequest
): Promise<Result<LoginResponse, AuthError>> {
  const formData = new FormData();
  formData.append("username", credentials.username);
  formData.append("password", credentials.password);

  return fetchWithErrorHandlingInternal<LoginResponse>(
    `${API_BASE_URL}/api/v1/auth/token`,
    {
      method: "POST",
      headers: {},
      body: formData,
    }
  );
}

export async function refreshToken(
  refreshTokenData: RefreshTokenRequest
): Promise<Result<RefreshTokenResponse, AuthError>> {
  return fetchWithErrorHandlingInternal<RefreshTokenResponse>(
    `${API_BASE_URL}/api/v1/auth/refresh`,
    {
      method: "POST",
      body: JSON.stringify(refreshTokenData),
    }
  );
}

export async function register(
  userData: UserCreate
): Promise<Result<User, AuthError>> {
  return fetchWithErrorHandling<User>(`${API_BASE_URL}/api/v1/users/register`, {
    method: "POST",
    body: JSON.stringify(userData),
  }, true); // Skip auto-refresh for registration
}

export async function getCurrentUser(
  token: string
): Promise<Result<User, AuthError>> {
  return fetchWithErrorHandlingInternal<User>(`${API_BASE_URL}/api/v1/users/me`, {
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
  return fetchWithErrorHandlingInternal<UserWithToken>(
    `${API_BASE_URL}/api/v1/users/me`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(userData),
    }
  );
}

export async function updatePassword(
  token: string,
  passwordData: PasswordUpdate
): Promise<Result<UserWithToken, AuthError>> {
  return fetchWithErrorHandlingInternal<UserWithToken>(
    `${API_BASE_URL}/api/v1/users/me/password`,
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
  return fetchWithErrorHandlingInternal<{ message: string }>(
    `${API_BASE_URL}/api/v1/users/me`,
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
  return fetchWithErrorHandlingInternal<User[]>(`${API_BASE_URL}/api/v1/users/`, {
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
  return fetchWithErrorHandlingInternal<{ message: string }>(
    `${API_BASE_URL}/api/v1/users/${userId}`,
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
  return fetchWithErrorHandlingInternal<User>(
    `${API_BASE_URL}/api/v1/users/approve/${userId}`,
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
  return fetchWithErrorHandlingInternal<User>(
    `${API_BASE_URL}/api/v1/users/role/${userId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: bodyString,
    }
  );
}
