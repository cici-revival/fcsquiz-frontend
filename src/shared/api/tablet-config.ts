// @shared/lib/api/tabletConfig.ts
import type { TabletGameState } from "@/types/api";
import { ApiError, NotFoundError, InternalServerError } from "./errors";
import { getApiBaseUrl } from "@shared/config/runtimeConfig";

const TABLET_API_BASE_URL = getApiBaseUrl();

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

interface ApiRequestOptions extends RequestInit {
  method?: HttpMethod
  path: string
}

async function tabletApiRequest<T>({ path, method = 'GET', headers, ...rest }: ApiRequestOptions): Promise<T> {
  const url = `${TABLET_API_BASE_URL}${path}`

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(headers ?? {}),
    },
    ...rest,
  })

  if (!response.ok) {
    let errorData: unknown;

    try {
      errorData = await response.json();
    } catch {
      errorData = await response.text().catch(() => '');
    }

    const errorMessage = typeof errorData === 'object' && errorData !== null && 'message' in errorData
      ? String((errorData as any).message)
      : `Tablet API error ${response.status}: ${response.statusText}`;

    switch (response.status) {
      case 404:
        throw new NotFoundError(errorMessage);
      case 500:
        throw new InternalServerError(errorMessage);
      default:
        throw new ApiError(
          errorMessage,
          response.status,
          response.statusText,
          errorData
        );
    }
  }

  return (await response.json()) as T;
}

export const tabletApi = {
  getGameState(): Promise<TabletGameState> {
    return tabletApiRequest<TabletGameState>({
      path: '/v1/game/state',
      method: 'GET'
    });
  },
};
