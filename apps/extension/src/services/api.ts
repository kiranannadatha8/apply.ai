const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8080";
export async function apiFetch<T>(
  path: string,
  opts: RequestInit = {},
  token?: string,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "content-type": "application/json",
      ...(opts.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "omit", // extension never sends cookies
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}
