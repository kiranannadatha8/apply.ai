import crypto from "node:crypto";

const STRIP_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "utm_id",
  "trk",
]);

export function canonicalizeUrl(input?: string | null) {
  if (!input) return { canonical: null, hash: null, host: null };
  try {
    const u = new URL(input);
    const host = u.host.toLowerCase();
    // keep only path, drop most query params
    const clean = new URL(`${u.protocol}//${host}${u.pathname}`);
    // some platforms use stable ids in query; if you want, whitelist here
    for (const [k, v] of u.searchParams) {
      if (!STRIP_PARAMS.has(k)) {
        // OPTIONAL: whitelist stable ids e.g. gh_jid
        if (k === "gh_jid" || k === "jobId") {
          clean.searchParams.set(k, v);
        }
      }
    }
    const canonical = clean.toString();
    const hash = crypto.createHash("sha256").update(canonical).digest("hex");
    return { canonical, hash, host };
  } catch {
    return { canonical: null, hash: null, host: null };
  }
}
