import { setExtToken, clearExtToken } from "../services/storage";

chrome.runtime.onInstalled.addListener(() => {
  console.log("apply.ai extension installed");
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "REDEEM_HANDSHAKE") {
    (async () => {
      try {
        const r = await fetch(
          (import.meta as any).env?.VITE_API_URL ??
            "http://localhost:8080" + "/v1/auth/ext/session/redeem",
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ code: msg.code }),
          },
        );
        if (!r.ok) throw new Error(await r.text());
        const data = await r.json();
        await setExtToken(data.extToken);
        sendResponse({ ok: true });
      } catch (e: any) {
        sendResponse({ ok: false, error: String(e?.message || e) });
      }
    })();
    return true;
  }
  if (msg?.type === "CLEAR_EXT_TOKEN") {
    clearExtToken().then(() => sendResponse({ ok: true }));
    return true;
  }
});
