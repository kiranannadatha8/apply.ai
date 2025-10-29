import type { ResumeParseResult } from "@/pages/onboarding/types";
import { useAuth } from "@/stores/auth";

export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

export async function post<T>(path: string, body: any, token?: string | null) {
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "x-csrf-token": getCsrfFromCookie(),
  };
  let requestBody: BodyInit;
  if (body instanceof FormData) {
    requestBody = body;
  } else {
    headers["Content-Type"] = "application/json";
    requestBody = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: headers,
    credentials: "include",
    body: requestBody,
  });

  if (!res.ok) {
    let errorText: string;
    try {
      errorText = await res.text();
    } catch (e) {
      errorText = res.statusText;
    }
    throw new Error(errorText || "Request failed");
  }

  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return res.json() as Promise<T>;
  }
  return {} as Promise<T>; // Return empty object for non-json responses
}

export async function get<T>(path: string, token?: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    credentials: "include",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export const getMe = () => {
  return get<{ user: any }>("/v1/auth/me");
};

export const requestOtp = (email: string) => {
  return post<{ ok: true }>("/v1/auth/otp", { email });
};

export const verifyOtp = (email: string, code: string) => {
  return post<{ accessToken: string; user: { id: string; email: string } }>(
    "/v1/auth/otp/verify",
    { email, code },
  );
};

export const verifyMagic = (email: string, code: string) => {
  return post<{ accessToken: string }>("/v1/auth/magic/verify", {
    email,
    code,
  });
};

export const refresh = () => {
  return post<{ accessToken: string }>("/v1/auth/refresh", {});
};

export const logout = () => {
  return post<{ ok: true }>("/v1/auth/logout", {});
};

export const listSessions = () => {
  return get<{ sessions: any[] }>("/v1/auth/sessions");
};

export const revokeSession = (id: string) => {
  return post<{ ok: true }>("/v1/auth/sessions/revoke", { id });
};

export const oauthStart = (provider: string) => {
  return get<{ url: string }>(`/v1/auth/oauth/${provider}/start`);
};

export const oauthCallback = (provider: string, code: string) => {
  return get<{ accessToken: string }>(
    `/v1/auth/oauth/${provider}/callback`,
    code,
  );
};

export const createHandshake = () => {
  return post<{ id: string }>("/v1/auth/ext/handshake/create", {});
};

export const redeemHandshake = (id: string) => {
  return post<{ accessToken: string }>("/v1/auth/ext/session/redeem", { id });
};

export const resumeParser = (file: FormData) => {
  return post<ResumeParseResult>(
    "/v1/profile/resumes/parse",
    file,
    useAuth.getState().accessToken,
  );
};

function getCsrfFromCookie() {
  const m = document.cookie.match(/(?:^|; )csrf_token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}
