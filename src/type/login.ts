export interface LoginResponse {
  success: boolean;
  tag?: string;
  error?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
  browserId: string;
}

export interface User {
  username: string;
  password: string;
  tag: string;
}
