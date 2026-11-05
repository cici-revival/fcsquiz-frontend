import {
  useState,
  useEffect,
  type ReactNode,
  useCallback,
} from "react";
import { jwtDecode } from "jwt-decode";
import { authEvents } from "../shared/events/authEvents";
import { adminkaApiClient } from "@shared/api/client";
import { AuthContext, type Tokens, type User } from "./context";

interface AccessTokenClaims {
  id: string;
  email?: string | null;
  roles?: string[];
  permissions?: string[];
}

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
      const decoded = jwtDecode<AccessTokenClaims>(token);
      setUser({
        id: decoded.id,
        email: decoded.email,
        roles: decoded.roles ?? [],
        permissions: decoded.permissions ?? [],
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
        hasAdminAccess: user?.permissions.includes("adminka.access") ?? false,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
