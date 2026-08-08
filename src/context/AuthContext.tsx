import {
  createContext,
  useState,
  useEffect,
  type ReactNode,
  useCallback,
} from "react";
import { jwtDecode } from "jwt-decode";
import { authEvents } from "../shared/events/authEvents";
import { adminkaApiClient } from "@shared/api/client";

export interface User {
  id: number;
  email?: string | null;
  phone?: string | null;
  first_name?: string | null;
  last_name?: string | null;
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
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      await adminkaApiClient.logoutRequest();
    } catch (err) {
      console.error("Server logout failed:", err);
    } finally {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      void logout();
    };
    authEvents.addEventListener("logout", handler);

    return () => {
      authEvents.removeEventListener("logout", handler);
    };
  }, [logout]);

  const setUserFromToken = useCallback((token: string) => {
    try {
      const decoded: any = jwtDecode(token);
      setUser({
        id: decoded.user_id || decoded.id,
        email: decoded.email,
        phone: decoded.phone,
        first_name: decoded.first_name,
        last_name: decoded.last_name,
      });
    } catch (error) {
      console.error("Invalid token:", error);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const accessToken = await adminkaApiClient.tryRestoreSession();
        if (accessToken) {
          setUserFromToken(accessToken);
        }
      } catch (error) {
        console.error("Session restore error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void initAuth();
  }, [setUserFromToken]);

  const login = useCallback(
    (tokens: Tokens) => {
      setUserFromToken(tokens.access_token);
    },
    [setUserFromToken],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
