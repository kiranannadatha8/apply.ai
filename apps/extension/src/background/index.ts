// Minimal background to log telemetry and (optionally) forward to an API later.
chrome.runtime.onMessage.addListener((msg, _sender, _sendResponse) => {
  if (msg?.type === "applyai.telemetry") {
    // Dev log
    console.debug("[ApplyAI][telemetry]", msg.payload);
  }
  if (msg?.type === "applyai.analyzeJob") {
    // If banner sends only URL, we can pull JD from content tab via another message.
    // For MVP we assume the content side has JD in memory and will open directly.
    if (_sender.tab?.id) {
      chrome.tabs.sendMessage(_sender.tab.id, {
        type: "applyai.analyzeJob",
        payload: msg.payload,
      });
    }
  }
  if (msg?.type === "applyai.assistToMap") {
    // Open ApplyAI mapping UI (E07) — placeholder route for now
    chrome.tabs.create({
      url: `https://app.applyai.local/mapping?src=${encodeURIComponent(msg.payload.url)}`,
    });
  }
});
