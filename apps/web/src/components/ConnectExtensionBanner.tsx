import { useState } from "react";
import { useAuth } from "../stores/auth";

export function ConnectExtensionBanner() {
  const token = useAuth((s) => s.accessToken);
  const [code, setCode] = useState<string | null>(null);
  if (!token) return null;
  async function gen() {
    const r = await fetch(
      `${import.meta.env.VITE_API_URL}/v1/auth/ext/handshake/create`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-csrf-token":
            document.cookie.match(/csrf_token=([^;]+)/)?.[1] ?? "",
        },
        credentials: "include",
      },
    );
    if (!r.ok) return;
    const d = await r.json();
    setCode(d.code);
    try {
      await navigator.clipboard.writeText(d.code);
    } catch {}
  }
  return (
    <div className="p-3 rounded border flex items-center justify-between">
      <div>
        <div className="font-medium">Connect your Chrome extension</div>
        <div className="text-sm text-slate-500">
          Generate a code and paste it in the extension popup.
        </div>
      </div>
      <button className="border px-3 py-1.5 rounded" onClick={gen}>
        Generate code
      </button>
      {code && <span className="ml-3 font-mono">{code}</span>}
    </div>
  );
}
