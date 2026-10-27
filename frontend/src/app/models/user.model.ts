export interface User {
  id: string;
  name: string;
  email: string;
  target_role?: string;
  salary_target?: string;
  target_date?: string;
  current_focus?: string;
  personal_notes?: string;
  avatar_url?: string;
  provider?: string;
}

export interface AuthResponse {
  message?: string;
  token: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface TargetData {
  targetRole: string;
  salaryTarget: string;
  targetDate: string;
  currentFocus: string;
  personalNotes?: string;
}
