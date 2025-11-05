import { createRoot, type Root } from "react-dom/client";
import { SidePanelApp } from "@/panel";
import { usePanelStore, type PanelTab } from "@/state/panel-store";
import { ensurePersistentShadowHost } from "./shadow-root";

let host: HTMLDivElement | null = null;
let container: HTMLDivElement | null = null;
let root: Root | null = null;

function ensureMount() {
  if (!host) {
    const result = ensurePersistentShadowHost("applyai-sidepanel-host");
    host = result.host;
    const existing = result.shadow.querySelector<HTMLDivElement>(
      "#applyai-sidepanel-root",
    );
    container =
      existing ??
      (() => {
        const el = document.createElement("div");
        el.id = "applyai-sidepanel-root";
        result.shadow.appendChild(el);
        return el;
      })();
  }

  if (!root && container) {
    root = createRoot(container);
    root.render(<SidePanelApp />);
  }
}

export interface PanelOpenOptions {
  tab?: PanelTab;
}

export function openPanel(options?: PanelOpenOptions) {
  ensureMount();
  const store = usePanelStore.getState();
  if (options?.tab) {
    store.setActiveTab(options.tab);
  }
  store.setOpen(true);
}

export function closePanel() {
  const store = usePanelStore.getState();
  store.setOpen(false);
}

export function togglePanel(tab?: PanelTab) {
  ensureMount();
  const store = usePanelStore.getState();
  if (tab) {
    store.setActiveTab(tab);
  }
  store.toggle(tab);
}
