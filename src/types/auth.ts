interface UserBase {
  username: string;
  email: string;
}

export interface UserCreate extends UserBase {
  password: string;
}

export interface User extends UserBase {
  id: number;
  is_active: boolean;
  is_approved: boolean;
  role: Role;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export enum Role {
  ADMIN = "admin",
  OPERATOR = "operator",
  USER = "user",
}

export interface UserUpdate {
  username?: string;
  email?: string;
}

export interface PasswordUpdate {
  current_password: string;
  new_password: string;
}

export interface UserDelete {
  password: string;
}

export interface RoleUpdate {
  role: Role;
}

export interface UserWithToken {
  user: User;
  access_token: string;
  refresh_token?: string;
  token_type: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface AuthError {
  message: string;
  status?: number;
}
