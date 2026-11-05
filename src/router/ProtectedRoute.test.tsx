import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AuthContext, type AuthContextType } from "@/context/context";
import { ProtectedRoute } from "./ProtectedRoute";

const adminUser = {
  id: "user-id",
  email: "admin@example.com",
  roles: ["admin"],
  permissions: ["adminka.access"],
};

function renderRoute(overrides: Partial<AuthContextType> = {}) {
  const value: AuthContextType = {
    user: adminUser,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: true,
    hasAdminAccess: true,
    ...overrides,
  };

  render(
    <AuthContext.Provider value={value}>
      <MemoryRouter>
        <ProtectedRoute>
          <div>Админка</div>
        </ProtectedRoute>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe("ProtectedRoute", () => {
  it.each([
    {
      name: "показывает загрузку во время восстановления сессии",
      context: { isLoading: true },
      expected: "Загрузка...",
    },
    {
      name: "не монтирует админку для пользователя без права adminka.access",
      context: {
        user: { ...adminUser, roles: ["user"], permissions: [] },
        hasAdminAccess: false,
      },
      expected: "Нет доступа к админке",
    },
    {
      name: "монтирует админку для пользователя с правом adminka.access",
      context: {},
      expected: "Админка",
    },
  ])("$name", ({ context, expected }) => {
    renderRoute(context);

    expect(screen.getByText(expected)).toBeInTheDocument();

    if (!context.hasAdminAccess && context.hasAdminAccess !== undefined) {
      expect(screen.queryByText("Админка")).not.toBeInTheDocument();
    }
  });

  it("завершает сессию с экрана отсутствия доступа", () => {
    const logout = vi.fn();
    renderRoute({
      user: { ...adminUser, roles: ["user"], permissions: [] },
      hasAdminAccess: false,
      logout,
    });

    fireEvent.click(screen.getByRole("button", { name: "Выйти" }));

    expect(logout).toHaveBeenCalledOnce();
  });
});
