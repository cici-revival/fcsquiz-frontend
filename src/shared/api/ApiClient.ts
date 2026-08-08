import {
  ApiError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  InternalServerError,
} from "./errors";
import { authEvents } from "../events/authEvents";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

type TokensResponse = {
  access_token: string;
};

const csrfHeader = "X-Requested-By";
const csrfHeaderValue = "csquiz-admin";

type RefreshQueueItem = {
  resolve: (token: string | null) => void;
  reject: (error: Error) => void;
};

export class ApiClient {
  private isRefreshing = false;
  private refreshQueue: RefreshQueueItem[] = [];

  private accessToken: string | null = null;

  constructor(private readonly baseUrl: string) {}

  private buildHeaders(
    customHeaders?: HeadersInit,
    token?: string,
    body?: BodyInit | null,
  ): HeadersInit {
    const shouldSetJsonContentType = !(body instanceof FormData);

    return {
      ...(shouldSetJsonContentType ? { "Content-Type": "application/json" } : {}),
      [csrfHeader]: csrfHeaderValue,
      ...(customHeaders ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  // ПОКА НЕ ИСПОЛЬЗУЕТСЯ
  async logoutRequest(): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", [csrfHeader]: csrfHeaderValue },
      });
    } catch (e) {
      console.error("Logout request failed", e);
    }
  }

  private logout(): void {
    authEvents.dispatchEvent(new Event("logout"));
    this.accessToken = null;
  }

  private async refreshTokens(): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/adminka/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json", [csrfHeader]: csrfHeaderValue },
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          this.logout();
          return null;
        }
        throw new Error(`Refresh failed: ${response.status}`);
      }

      const tokens: TokensResponse = await response.json();
      this.accessToken = tokens.access_token;
      return this.accessToken;
    } catch (error) {
      console.error("Refresh token error:", error);
      this.logout();
      return null;
    }
  }

  private async refreshTokensWithQueue(): Promise<string | null> {
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.refreshQueue.push({ resolve, reject });
      });
    }

    this.isRefreshing = true;

    try {
      const newToken = await this.refreshTokens();
      this.refreshQueue.forEach(({ resolve }) => resolve(newToken));
      return newToken;
    } catch (error) {
      this.refreshQueue.forEach(({ reject }) => reject(error as Error));
      throw error;
    } finally {
      this.refreshQueue = [];
      this.isRefreshing = false;
    }
  }

  private async handleError(response: Response): Promise<never> {
    let errorData: unknown;
    let message: string;

    try {
      errorData = await response.json();
      if (typeof errorData === "object" && errorData) {
        if ("details" in errorData && errorData.details) {
          message = String(errorData.details);
        } else if ("message" in errorData && errorData.message) {
          message = String(errorData.message);
        } else {
          message = `API error ${response.status}`;
        }
      } else {
        message = `API error ${response.status}`;
      }
    } catch {
      errorData = await response.text().catch(() => "");
      message = String(errorData) || `API error ${response.status}`;
    }

    switch (response.status) {
      case 401:
        throw new UnauthorizedError(message);
      case 403:
        throw new ForbiddenError(message);
      case 404:
        throw new NotFoundError(message);
      case 500:
        throw new InternalServerError(message);
      default:
        throw new ApiError(message, response.status, response.statusText, errorData);
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }

  async request<T>(
    path: string,
    options: RequestInit & { method?: HttpMethod } = {},
    retryCount = 0,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const maxRetries = 1;

    let response = await fetch(url, {
      ...options,
      headers: this.buildHeaders(
        options.headers,
        this.accessToken ?? undefined,
        options.body ?? null,
      ),
      credentials: "include",
    });

    if (response.status === 401 && retryCount < maxRetries) {
      const newToken = await this.refreshTokensWithQueue();

      if (!newToken) {
        this.logout();
        throw new UnauthorizedError("Session expired");
      }

      return this.request<T>(path, options, retryCount + 1);
    }

    if (!response.ok) {
      await this.handleError(response);
    }

    return this.handleResponse<T>(response);
  }

  async get<T>(path: string, options?: RequestInit): Promise<T> {
    return this.request<T>(path, { ...options, method: "GET" });
  }

  async post<T>(path: string, body?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(path: string, body?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(path: string, options?: RequestInit): Promise<T> {
    return this.request<T>(path, { ...options, method: "DELETE" });
  }

  async patch<T>(path: string, body?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * Пытается обновить access по refresh_token (cookie). Используется при
   * инициализации, когда access уже истёк, но refresh ещё валиден. Возвращает
   * новый access_token или null.
   */
  async tryRestoreSession(): Promise<string | null> {
    return this.refreshTokensWithQueue();
  }
}
