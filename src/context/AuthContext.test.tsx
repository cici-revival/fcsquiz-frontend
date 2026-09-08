import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useContext } from "react";
import { render, waitFor, act } from "@testing-library/react";
import { AuthProvider } from "./AuthContext";
import { AuthContext } from "./context";
import { adminkaApiClient } from "@shared/api/client";
import { authEvents } from "@shared/events/authEvents";

vi.mock("@shared/api/client", () => ({
  adminkaApiClient: {
    tryRestoreSession: vi.fn(),
    logoutRequest: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("jwt-decode", () => ({
  jwtDecode: (token: string) => {
    if (token === "expired-access") {
      return { exp: Math.floor(Date.now() / 1000) - 60 };
    }
    if (token === "valid-access") {
      return {
        id: "user-id",
        email: "a@b.c",
        role: "admin",
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
    }
    throw new Error("invalid token");
  },
}));

function Probe() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("AuthContext missing");
  return (
    <div>
      <span data-testid="user">{ctx.user ? ctx.user.id : "none"}</span>
      <span data-testid="role">{ctx.user?.role ?? "none"}</span>
      <span data-testid="authenticated">
        {ctx.isAuthenticated ? "yes" : "no"}
      </span>
      <span data-testid="loading">{ctx.isLoading ? "yes" : "no"}</span>
      <button data-testid="login" onClick={() => ctx.login({ access_token: "valid-access" })}>
        login
      </button>
      <button data-testid="logout" onClick={() => ctx.logout()}>
        logout
      </button>
    </div>
  );
}

describe("AuthContext — in-memory token storage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(adminkaApiClient.tryRestoreSession).mockReset();
    vi.mocked(adminkaApiClient.logoutRequest).mockReset();
    vi.mocked(adminkaApiClient.logoutRequest).mockResolvedValue(undefined);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("does not write access_token or refresh_token to localStorage on login", async () => {
    vi.mocked(adminkaApiClient.tryRestoreSession).mockResolvedValue(null);

    const { getByTestId } = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(getByTestId("loading").textContent).toBe("no"));

    await act(async () => {
      getByTestId("login").click();
    });

    expect(localStorage.getItem("access_token")).toBeNull();
    expect(localStorage.getItem("refresh_token")).toBeNull();
    expect(getByTestId("user").textContent).toBe("user-id");
    expect(getByTestId("role").textContent).toBe("admin");
    expect(getByTestId("authenticated").textContent).toBe("yes");
  });

  it("does not read access_token or refresh_token from localStorage on mount", async () => {
    localStorage.setItem("access_token", "valid-access");
    localStorage.setItem("refresh_token", "leaked-refresh");
    vi.mocked(adminkaApiClient.tryRestoreSession).mockResolvedValue(null);

    const { getByTestId } = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(getByTestId("loading").textContent).toBe("no"));

    expect(getByTestId("user").textContent).toBe("none");
    expect(getByTestId("authenticated").textContent).toBe("no");
  });

  it("calls /refresh via adminkaApiClient.tryRestoreSession on mount and sets user when it succeeds", async () => {
    vi.mocked(adminkaApiClient.tryRestoreSession).mockResolvedValue("valid-access");

    const { getByTestId } = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(adminkaApiClient.tryRestoreSession).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getByTestId("user").textContent).toBe("user-id"));
    expect(getByTestId("authenticated").textContent).toBe("yes");
  });

  it("leaves the user signed out when /refresh returns null on mount", async () => {
    vi.mocked(adminkaApiClient.tryRestoreSession).mockResolvedValue(null);

    const { getByTestId } = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(adminkaApiClient.tryRestoreSession).toHaveBeenCalled());
    expect(getByTestId("user").textContent).toBe("none");
    expect(getByTestId("authenticated").textContent).toBe("no");
  });

  it("logout clears the in-memory user and never touches localStorage", async () => {
    vi.mocked(adminkaApiClient.tryRestoreSession).mockResolvedValue("valid-access");

    const { getByTestId } = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(getByTestId("user").textContent).toBe("user-id"));

    await act(async () => {
      getByTestId("logout").click();
    });

    expect(getByTestId("user").textContent).toBe("none");
    expect(localStorage.getItem("access_token")).toBeNull();
    expect(localStorage.getItem("refresh_token")).toBeNull();
  });

  it("reacts to the global logout event", async () => {
    vi.mocked(adminkaApiClient.tryRestoreSession).mockResolvedValue("valid-access");

    const { getByTestId } = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(getByTestId("user").textContent).toBe("user-id"));

    act(() => {
      authEvents.dispatchEvent(new Event("logout"));
    });

    await waitFor(() => expect(getByTestId("user").textContent).toBe("none"));
  });
});
