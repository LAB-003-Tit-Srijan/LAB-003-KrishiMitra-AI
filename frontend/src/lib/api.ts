import axios from "axios";
import { useAppStore } from "./store";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api"
});

export function setAccessToken(token: string) {
  api.defaults.headers.common.Authorization = `Bearer ${token}`;
}

export function clearAccessToken() {
  delete api.defaults.headers.common.Authorization;
}

export function bootstrapSession() {
  if (typeof window === "undefined") return;
  const accessToken = localStorage.getItem("neurolearn_access_token");
  const refreshToken = localStorage.getItem("neurolearn_refresh_token");
  if (accessToken) {
    setAccessToken(accessToken);
    useAppStore.getState().setAccessToken(accessToken);
  }
  if (refreshToken) {
    useAppStore.getState().setRefreshToken(refreshToken);
  }
}

let isRefreshing = false;
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const original = error.config;
    if (status !== 401 || original?._retry) throw error;
    const refreshToken = useAppStore.getState().refreshToken || localStorage.getItem("neurolearn_refresh_token");
    if (!refreshToken || isRefreshing) throw error;
    isRefreshing = true;
    try {
      const { data } = await api.post("/auth/refresh", { refreshToken });
      original._retry = true;
      setAccessToken(data.accessToken);
      localStorage.setItem("neurolearn_access_token", data.accessToken);
      localStorage.setItem("neurolearn_refresh_token", data.refreshToken);
      document.cookie = `neurolearn_access_token=${data.accessToken}; Path=/; Max-Age=86400; SameSite=Lax`;
      useAppStore.getState().setAccessToken(data.accessToken);
      useAppStore.getState().setRefreshToken(data.refreshToken);
      isRefreshing = false;
      return api(original);
    } catch (refreshError) {
      isRefreshing = false;
      localStorage.removeItem("neurolearn_access_token");
      localStorage.removeItem("neurolearn_refresh_token");
      useAppStore.getState().setAccessToken(null);
      useAppStore.getState().setRefreshToken(null);
      useAppStore.getState().setUser(null);
      clearAccessToken();
      throw refreshError;
    }
  }
);
if (typeof window !== "undefined") {
  bootstrapSession();
}