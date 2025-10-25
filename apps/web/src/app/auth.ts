import { create } from "zustand";
import { get, post } from "./api";

interface AuthState {
  accessToken: string | null;
  setToken: (t: string | null) => void;
}
export const useAuth = create<AuthState>((set) => ({
  accessToken: null,
  setToken: (t) => set({ accessToken: t }),
}));

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
    try {
      const r = await post<{ accessToken: string }>("/v1/auth/refresh", {});
      useAuth.getState().setToken(r.accessToken);
      return fetchWithAuth<T>(path, init);
    } catch {
      throw new Error("Unauthorized");
    }
  }
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}
