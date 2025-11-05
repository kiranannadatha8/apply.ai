import { defineManifest } from "@crxjs/vite-plugin";

const manifest = defineManifest({
  manifest_version: 3,
  name: "ApplyAI",
  version: "0.1.0",
  description:
    "Analyze job posts, autofill applications, and track progress from a single ApplyAI side panel.",
  permissions: ["storage", "activeTab", "scripting", "tabs"],
  host_permissions: ["https://*/*", "http://*/*"],
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },
  content_scripts: [
    {
      matches: ["https://*/*", "http://*/*"],
      js: ["src/content/detection-runner.ts"],
      run_at: "document_start",
    },
    {
      matches: ["https://*/*", "http://*/*"],
      js: ["src/content/index.ts"],
      run_at: "document_idle",
    },
  ],
  icons: {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png",
  },
  action: {
    default_title: "ApplyAI",
    default_icon: {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png",
    },
  },
  web_accessible_resources: [
    {
      resources: ["icons/*.png"],
      matches: ["https://*/*", "http://*/*"],
    },
  ],
});

export default manifest;
