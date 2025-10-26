import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { post } from "../app/api";

interface AuthState {
  accessToken: string | null;
  setToken: (t: string | null) => void;
}

export const useAuth = create(
  persist<AuthState>(
    (set) => ({
      accessToken: null,
      setToken: (t) => set({ accessToken: t }),
    }),
    {
      name: "auth-token-storage",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export async function fetchWithAuth<T>(path: string, init?: RequestInit) {
  const token = useAuth.getState().accessToken;

  const res = await fetch(
    `${import.meta.env.VITE_API_URL || "http://localhost:8080"}${path}`,
    {
      ...init,
      headers: {
        "content-type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers || {}),
      },
      credentials: "include",
    },
  );
  if (res.status === 401) {
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((): Promise<T> => {
          return fetchWithAuth<T>(path, init);
        })
        .catch((err) => {
          return Promise.reject(err);
        });
    }

    isRefreshing = true;

    try {
      const r = await post<{ accessToken: string }>("/v1/auth/refresh", {});
      useAuth.getState().setToken(r.accessToken);
      processQueue(null, r.accessToken);
      return fetchWithAuth<T>(path, init);
    } catch (err) {
      processQueue(err, null);
      useAuth.getState().setToken(null);
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  }
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}
