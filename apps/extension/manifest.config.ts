export default {
  manifest_version: 3,
  name: "apply.ai",
  version: "0.1.0",
  action: { default_popup: "popup.html" },
  permissions: ["storage", "scripting", "activeTab"],
  host_permissions: ["https://*/*", "http://*/*"],
  background: { service_worker: "src/background/index.ts" },
  content_scripts: [
    {
      matches: ["https://*/*", "http://*/*"],
      js: ["src/content/detect.ts"],
      run_at: "document_idle",
    },
  ],
} as const;
