import { jsonInit, request } from "./http";

export interface User {
  id: number;
  email: string;
  name: string;
  created_at: number;
  last_login_at: number | null;
  auth_required?: boolean;
}

export interface AuthConfig {
  auth_required: boolean;
  signup_enabled: boolean;
  first_user: boolean;
}

const B = "/api/backend/v1/auth";

export const getAuthConfig = () => request<AuthConfig>(`${B}/config`);
export const getMe = () => request<User>(`${B}/me`);
export const login = (email: string, password: string) => request<User>(`${B}/login`, jsonInit("POST", { email, password }));
export const signup = (name: string, email: string, password: string) =>
  request<User>(`${B}/signup`, jsonInit("POST", { name, email, password }));
export const logout = () => request<void>(`${B}/logout`, jsonInit("POST"));
export const updateProfile = (name: string) => request<User>(`${B}/me`, jsonInit("PATCH", { name }));
export const changePassword = (current_password: string, new_password: string) =>
  request<{ status: string }>(`${B}/password`, jsonInit("POST", { current_password, new_password }));
