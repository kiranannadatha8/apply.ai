// Content entry that listens for "Analyze" and opens the panel.
// Ensure Tailwind CSS is imported here (or a global content stylesheet).
import "./index.css";
import { openAnalysisPanel } from "./analysis-panel";

// Listen for messages from banner or background
chrome.runtime.onMessage.addListener((msg, _sender, _send) => {
  if (msg?.type === "applyai.analyzeJob") {
    // Expect payload: { url, jdHtmlOrText, title, company, resumeText?, plan? }
    openAnalysisPanel(msg.payload);
  }
});
