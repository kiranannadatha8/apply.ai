import { useState } from "react";
import { useAuth } from "../../stores/auth";

export default function Devices() {
  const token = useAuth((s) => s.accessToken)!;
  const [code, setCode] = useState<string | null>(null);
  const [copyOk, setCopyOk] = useState(false);

  async function createHandshake() {
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
    if (!r.ok) throw new Error(await r.text());
    const data = await r.json();
    setCode(data.code);
    try {
      await navigator.clipboard.writeText(data.code);
      setCopyOk(true);
    } catch {}
  }
  return (
    <div className="p-6 max-w-xl">
      <h2 className="text-xl font-semibold mb-2">Devices</h2>
      <p className="text-slate-500 mb-4">
        Link the Chrome extension to your account.
      </p>
      <button className="border px-3 py-2 rounded" onClick={createHandshake}>
        Generate code
      </button>
      {code && (
        <div className="mt-4 p-3 border rounded">
          <div className="text-sm text-slate-500 mb-1">
            One-time code (valid 10 minutes):
          </div>
          <div className="font-mono text-lg">{code}</div>
          <div className="text-sm mt-2">
            {copyOk
              ? "Copied to clipboard."
              : "Copy failed — select and copy manually."}
          </div>
        </div>
      )}
    </div>
  );
}
