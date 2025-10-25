import { useEffect } from "react";
import { post } from "../../app/api";
import { useAuth } from "../../app/auth";
export default function Magic() {
  const setToken = useAuth((s) => s.setToken);
  useEffect(() => {
    const token = new URLSearchParams(location.search).get("token");
    if (!token) return;
    (async () => {
      const r = await post<{ accessToken: string }>("/v1/auth/magic/verify", {
        token,
      });
      setToken(r.accessToken);
      location.href = "/onboarding";
    })();
  }, []);
  return <div className="p-8">Signing you in…</div>;
}
