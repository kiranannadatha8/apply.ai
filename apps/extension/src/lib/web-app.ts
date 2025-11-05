const DEFAULT_WEB_APP_BASE = "https://app.applyai.com";

function normalizeBaseUrl(raw: string): string {
  try {
    const url = new URL(raw);
    const formatted = url.toString();
    return formatted.endsWith("/")
      ? formatted.slice(0, -1)
      : formatted;
  } catch {
    return DEFAULT_WEB_APP_BASE;
  }
}

export const WEB_APP_BASE_URL = normalizeBaseUrl(
  typeof import.meta.env.VITE_WEB_APP_URL === "string" &&
    import.meta.env.VITE_WEB_APP_URL.length
    ? import.meta.env.VITE_WEB_APP_URL
    : DEFAULT_WEB_APP_BASE,
);

export function resolveWebAppUrl(path?: string): string {
  if (!path) return WEB_APP_BASE_URL;
  try {
    const base = WEB_APP_BASE_URL.endsWith("/")
      ? WEB_APP_BASE_URL
      : `${WEB_APP_BASE_URL}/`;
    return new URL(path, base).toString();
  } catch {
    return WEB_APP_BASE_URL;
  }
}

export function openWebApp(path?: string) {
  const url = resolveWebAppUrl(path);
  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
