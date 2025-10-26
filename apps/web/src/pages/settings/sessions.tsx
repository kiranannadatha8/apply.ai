import { useEffect, useState } from "react";
import { fetchWithAuth } from "../../stores/auth";

export default function Sessions() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const r = await fetchWithAuth<{ sessions: any[] }>("/v1/auth/sessions");
      setRows(r.sessions);
    })();
  }, []);
  return (
    <div className="p-6">
      <h2 className="text-xl mb-4">Sessions</h2>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>Device</th>
            <th>IP</th>
            <th>Created</th>
            <th>Last Seen</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id} className="border-t">
              <td>{s.userAgent || "—"}</td>
              <td>{s.ip || "—"}</td>
              <td>{new Date(s.createdAt).toLocaleString()}</td>
              <td>{new Date(s.lastSeenAt).toLocaleString()}</td>
              <td>
                <button
                  className="text-red-600"
                  onClick={async () => {
                    await fetchWithAuth("/v1/auth/sessions/revoke", {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ sessionId: s.id }),
                    });
                    setRows(rows.filter((r) => r.id !== s.id));
                  }}
                >
                  Revoke
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
