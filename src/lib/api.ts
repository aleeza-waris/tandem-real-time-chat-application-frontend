import axios, { type AxiosRequestConfig } from "axios";
import { clearSessionToken, getSessionToken } from "./session";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api").replace(/\/+$/, "");

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

type ApiErrorBody = {
  message?: string;
};

type ApiOptions = Omit<AxiosRequestConfig, "url" | "data"> & { body?: unknown };

export const apiClient = axios.create({
  baseURL: API_URL
});

apiClient.interceptors.request.use((config) => {
  const token = getSessionToken();
  if (token) config.headers.set("Authorization", `Bearer ${token}`);
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (!axios.isAxiosError<ApiErrorBody>(error)) {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const serverMessage = error.response?.data?.message;
    const requestUrl = error.config?.url || "";
    const isAuthSubmission = /\/auth\/(login|register|google)$/.test(requestUrl);
    if (
      status === 401 &&
      !isAuthSubmission &&
      getSessionToken() &&
      typeof window !== "undefined"
    ) {
      clearSessionToken();
      window.dispatchEvent(new Event("tandem:unauthorized"));
    }
    let message = "Unable to reach the server. Please try again.";

    if (status && status < 500 && serverMessage) {
      message = serverMessage;
    } else if (status) {
      message = "The server could not complete the request. Please try again.";
    }

    return Promise.reject(new Error(message));
  }
);

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { body, ...requestOptions } = options;
  const response = await apiClient.request<ApiEnvelope<T>>({
    ...requestOptions,
    url: path,
    data: body
  });
  return response.data.data;
}