import { ApiClient } from "@/shared/api/ApiClient";
import { getApiBaseUrl } from "@shared/config/runtimeConfig";

const API_BASE_URL = getApiBaseUrl();

export const adminkaApiClient = new ApiClient(API_BASE_URL);
