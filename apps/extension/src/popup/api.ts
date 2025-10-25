import { apiFetch } from "../services/api";
export async function checkTokenValid(token: string) {
  try {
    await apiFetch("/v1/health", {}, token);
    return true;
  } catch {
    return false;
  }
}
