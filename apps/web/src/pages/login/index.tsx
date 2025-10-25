import { useState } from "react";
import { post } from "../../app/api";
import { useAuth } from "../../app/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const setToken = useAuth((s) => s.setToken);

  async function send() {
    await post("/v1/auth/otp", { email });
    setSent(true);
  }
  async function verify() {
    const r = await post<{ accessToken: string }>("/v1/auth/otp/verify", {
      email,
      code,
    });
    setToken(r.accessToken);
    location.href = "/onboarding";
  }

  async function google() {
    const { url } = await fetch(
      `${import.meta.env.VITE_API_URL}/v1/auth/oauth/google/start`,
      { credentials: "include" },
    ).then((r) => r.json());
    location.href = url;
  }

  return (
    <div className="max-w-sm mx-auto p-8">
      <h1 className="text-2xl font-semibold mb-4">Sign in to apply.ai</h1>
      <input
        className="border p-2 w-full mb-2"
        placeholder="you@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {!sent ? (
        <button className="btn" onClick={send}>
          Email me a code
        </button>
      ) : (
        <div className="space-y-2">
          <input
            className="border p-2 w-full"
            placeholder="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button className="btn w-full" onClick={verify}>
            Verify
          </button>
        </div>
      )}

      <div className="my-4 text-center text-sm text-gray-500">or</div>
      <button className="btn w-full" onClick={google}>
        Continue with Google
      </button>
    </div>
  );
}
