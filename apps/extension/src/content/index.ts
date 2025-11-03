// Content entry that listens for messages and opens ApplyAI panels.
// Ensure Tailwind CSS is imported here (or a global content stylesheet).
import "./index.css";
import { openAnalysisPanel } from "./analysis-panel";
import {
  openAutofillOverlay,
  closeAutofillOverlay,
} from "./autofill-overlay";

// Listen for messages from banner or background
chrome.runtime.onMessage.addListener((msg, _sender, _send) => {
  switch (msg?.type) {
    case "applyai.analyzeJob":
      // Expect payload: { url, jdHtmlOrText, title, company, resumeText?, plan? }
      openAnalysisPanel(msg.payload);
      break;
    case "applyai.autofill.preview":
      openAutofillOverlay(msg.payload);
      break;
    case "applyai.autofill.close":
      closeAutofillOverlay();
      break;
    default:
      break;
  }
});
