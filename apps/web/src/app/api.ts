export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

export async function post<T>(path: string, body: any, token?: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "x-csrf-token": getCsrfFromCookie(),
    },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
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

function getCsrfFromCookie() {
  const m = document.cookie.match(/(?:^|; )csrf_token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}
