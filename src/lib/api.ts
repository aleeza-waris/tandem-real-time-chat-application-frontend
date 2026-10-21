import axios, { type AxiosRequestConfig } from "axios";

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
  baseURL: API_URL,
  withCredentials: true
});

apiClient.interceptors.response.use(  
  (response) => response,
  (error: unknown) => {
    if (!axios.isAxiosError<ApiErrorBody>(error)) {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const serverMessage = error.response?.data?.message;
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
