// Content entry that listens for messages and opens ApplyAI panels.
// Ensure Tailwind CSS is imported here (or a global content stylesheet).
import "./index.css";
import { openAutofillOverlay, closeAutofillOverlay } from "./autofill-overlay";
import { initManualAssist, triggerManualApply } from "./manual-assist";
import { initApplicationAssistant } from "./application-assistant";
import { openPanel, closePanel, togglePanel } from "./panel-host";
import { getCurrentDetection } from "@/lib/detect/context";
import type { DetectionResult } from "@/lib/detect/types";

// Listen for messages from banner or background
chrome.runtime.onMessage.addListener((msg, _sender, _send) => {
  switch (msg?.type) {
    case "applyai.panel.open":
      openPanel(msg.payload);
      break;
    case "applyai.panel.toggle":
      togglePanel(msg.payload?.tab);
      break;
    case "applyai.panel.close":
      closePanel();
      break;
    case "applyai.autofill.preview":
      openAutofillOverlay(msg.payload);
      break;
    case "applyai.autofill.close":
      closeAutofillOverlay();
      break;
    case "applyai.manualMappingsUpdated":
      triggerManualApply(100);
      break;
    default:
      break;
  }
});

initManualAssist();
initApplicationAssistant();

const PANEL_BUTTON_ID = "applyai-panel-btn";

let panelButton: HTMLButtonElement | null = null;
let shouldShowPanelButton = false;

function onDomReady(callback: () => void) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", callback, { once: true });
  } else {
    callback();
  }
}

function ensurePanelButton(): HTMLButtonElement {
  if (panelButton) return panelButton;

  const btn = document.createElement("button");
  btn.id = PANEL_BUTTON_ID;
  btn.type = "button";
  btn.setAttribute("aria-label", "Open ApplyAI panel");
  btn.style.position = "fixed";
  btn.style.bottom = "32px";
  btn.style.right = "32px";
  btn.style.zIndex = "2147483641";
  btn.style.width = "56px";
  btn.style.height = "56px";
  btn.style.borderRadius = "50%";
  btn.style.background = "#1a73e8";
  btn.style.boxShadow = "0 4px 18px rgba(15, 23, 42, 0.18)";
  btn.style.display = "none";
  btn.style.alignItems = "center";
  btn.style.justifyContent = "center";
  btn.style.border = "none";
  btn.style.cursor = "pointer";
  btn.style.color = "#fff";
  btn.style.fontSize = "28px";
  btn.style.transition = "background 0.2s ease, transform 0.2s ease";
  btn.innerHTML =
    '<svg width="28" height="28" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#fff"/><path d="M12 7v10M7 12h10" stroke="#1a73e8" stroke-width="2" stroke-linecap="round"/></svg>';

  btn.addEventListener("mouseenter", () => {
    btn.style.background = "#1765c1";
    btn.style.transform = "translateY(-2px)";
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.background = "#1a73e8";
    btn.style.transform = "translateY(0)";
  });
  btn.addEventListener("click", () => {
    openPanel();
  });

  panelButton = btn;
  return btn;
}

function showPanelButton() {
  shouldShowPanelButton = true;
  onDomReady(() => {
    const btn = ensurePanelButton();
    if (!shouldShowPanelButton) {
      btn.style.display = "none";
      return;
    }
    if (!btn.isConnected && document.body) {
      document.body.appendChild(btn);
    }
    btn.style.display = "flex";
  });
}

function hidePanelButton() {
  shouldShowPanelButton = false;
  if (panelButton) {
    panelButton.style.display = "none";
  }
}

function handleDetectionUpdate(det: DetectionResult | null) {
  if (det) {
    showPanelButton();
  } else {
    hidePanelButton();
  }
}

document.addEventListener(
  "applyai:detection",
  (event) => {
    const detection = (event as CustomEvent<DetectionResult | null>).detail;
    handleDetectionUpdate(detection ?? null);
  },
  false,
);

handleDetectionUpdate(getCurrentDetection());
