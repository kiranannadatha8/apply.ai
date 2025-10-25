import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import { usePopup } from "./state";
import { Button } from "./components/Button";
import { getExtToken } from "../services/storage";

function openWeb(path: string) {
  chrome.tabs.create({
    url: `${(import.meta as any).env?.VITE_WEB_ORIGIN ?? "http://localhost:5173"}${path}`,
  });
}

function Welcome() {
  const { setScreen } = usePopup();
  return (
    <div style={{ padding: 12, width: 320 }}>
      <h3 style={{ marginBottom: 8 }}>Welcome to apply.ai</h3>
      <p style={{ color: "#64748b", marginBottom: 12 }}>
        Sign in on the website to get started.
      </p>
      <Button
        onClick={() => {
          openWeb("/login?src=ext");
          setScreen("connect");
        }}
      >
        Continue on website
      </Button>
    </div>
  );
}

function Connect() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ok">(
    "idle",
  );
  return (
    <div style={{ padding: 12, width: 320 }}>
      <h3>Connect Extension</h3>
      <p style={{ color: "#64748b" }}>
        On the website, click <b>Connect Extension</b> to generate a code, then
        paste it here.
      </p>
      <input
        placeholder="Paste code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        style={{
          width: "100%",
          padding: 8,
          margin: "8px 0",
          borderRadius: 8,
          border: "1px solid rgba(0,0,0,.1)",
        }}
      />
      <Button
        onClick={() => {
          setStatus("loading");
          chrome.runtime.sendMessage(
            { type: "REDEEM_HANDSHAKE", code },
            (resp) => {
              if (resp?.ok) {
                setStatus("ok");
                location.reload();
              } else {
                setStatus("error");
              }
            },
          );
        }}
      >
        {status === "loading" ? "Connecting…" : "Redeem & Connect"}
      </Button>
      {status === "error" && (
        <p style={{ color: "#ef4444", marginTop: 8 }}>
          Invalid or expired code. Generate a new one.
        </p>
      )}
    </div>
  );
}

function Connected() {
  return (
    <div style={{ padding: 12, width: 320 }}>
      <h3>Connected ✓</h3>
      <p style={{ color: "#64748b" }}>
        You can now analyze and autofill job applications.
      </p>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <Button onClick={() => openWeb("/settings/sessions")}>
          Manage sessions
        </Button>
      </div>
    </div>
  );
}

function Expired() {
  const { setScreen } = usePopup();
  return (
    <div style={{ padding: 12, width: 320 }}>
      <h3>Connection expired</h3>
      <p style={{ color: "#64748b" }}>
        Reconnect to continue using the extension.
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <Button
          onClick={() => {
            openWeb("/settings/devices");
            setScreen("connect");
          }}
        >
          Open website
        </Button>
        <Button onClick={() => setScreen("connect")}>I have a code</Button>
      </div>
    </div>
  );
}

function Popup() {
  const screen = usePopup((s) => s.screen);
  const setScreen = usePopup((s) => s.setScreen);
  useEffect(() => {
    (async () => {
      const token = await getExtToken();
      if (!token) {
        setScreen("welcome");
        return;
      }
      // We consider token presence as connected (API calls will handle 401 and show reconnect in panel).
      setScreen("connected");
    })();
  }, []);
  if (screen === "welcome") return <Welcome />;
  if (screen === "connect") return <Connect />;
  if (screen === "expired") return <Expired />;
  return <Connected />;
}

createRoot(document.getElementById("root")!).render(<Popup />);
