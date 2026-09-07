import { createContext } from "react";

export interface User {
  id: string;
  email?: string | null;
  role: string;
}

export interface Tokens {
  access_token: string;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (tokens: Tokens) => void;
  logout: () => void;
  isAuthenticated: boolean;
  hasAdminAccess: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);
