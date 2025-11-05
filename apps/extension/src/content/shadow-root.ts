import styles from "./index.css?inline";

const STYLE_ATTR = "data-applyai-style";

function injectStyles(shadow: ShadowRoot) {
  if (shadow.querySelector(`style[${STYLE_ATTR}="true"]`)) return;
  const styleTag = document.createElement("style");
  styleTag.setAttribute(STYLE_ATTR, "true");
  styleTag.textContent = styles;
  shadow.appendChild(styleTag);
}

export function ensurePersistentShadowHost(id: string) {
  let host = document.getElementById(id) as HTMLDivElement | null;
  if (!host) {
    host = document.createElement("div");
    host.id = id;
    // Prefer appending to document.body to avoid interfering with <html> styles.
    // If body is not available yet (early injection), fall back to document.documentElement.
    const mountTarget = document.body ?? document.documentElement;
    mountTarget.appendChild(host);
  }
  const shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });
  injectStyles(shadow);
  return { host, shadow };
}

export function createShadowHost(id: string) {
  const host = document.createElement("div");
  host.id = id;
  const shadow = host.attachShadow({ mode: "open" });
  injectStyles(shadow);
  return { host, shadow };
}
