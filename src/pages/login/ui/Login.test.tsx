import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminkaApi } from "@/shared/api/adminkaApi";
import { useAuth } from "@/shared/hooks/useAuth";
import Login from "./Login";

const navigate = vi.fn();

vi.mock("@/shared/api/adminkaApi", () => ({
  adminkaApi: {
    authByEmail: vi.fn(),
    confirmMagicLink: vi.fn(),
  },
}));

vi.mock("@/shared/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const original = await importOriginal<typeof import("react-router-dom")>();

  return {
    ...original,
    useNavigate: () => navigate,
    useSearchParams: () => [new URLSearchParams("token=magic-token")],
  };
});

vi.mock("react-hot-toast", () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("Login", () => {
  beforeEach(() => {
    navigate.mockReset();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "admin-id", email: "admin@example.com", role: "admin" },
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: true,
      hasAdminAccess: true,
    });
  });

  it("подтверждает magic link, даже если в браузере уже есть сессия", async () => {
    vi.mocked(adminkaApi.confirmMagicLink).mockReturnValue(new Promise(() => {}));

    render(<Login />);

    await waitFor(() => {
      expect(adminkaApi.confirmMagicLink).toHaveBeenCalledWith({ token: "magic-token" });
    });
    expect(navigate).not.toHaveBeenCalled();
  });
});
