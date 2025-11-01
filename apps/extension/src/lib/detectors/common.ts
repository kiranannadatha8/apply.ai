import type { Detector, DetectorContext, JobFields } from "../detect/types";
import { $, first, html, text, toAbsoluteUrl } from "../detect/utils";

// Utility to build selector-based field extraction with multi-candidate fallbacks
export function buildExtractor(selectors: {
  title?: string[];
  company?: string[];
  location?: string[];
  description?: string[];
  applyUrl?: string[];
  postingDate?: string[];
}): (ctx: DetectorContext) => Partial<JobFields> {
  return ({ doc, url }) => {
    const pickText = (arr?: string[]) =>
      first(...(arr ?? []).map((s) => text($(s, doc))));
    const pickHtml = (arr?: string[]) =>
      first(...(arr ?? []).map((s) => html($(s, doc))));
    const pickHref = (arr?: string[]) => {
      for (const s of arr ?? []) {
        const el = $(s, doc) as HTMLAnchorElement | null;
        const href = el?.getAttribute("href") || el?.dataset?.href;
        const abs = toAbsoluteUrl(href || undefined, url.toString());
        if (abs) return abs;
      }
      return undefined;
    };
    const pickDate = (arr?: string[]) => {
      for (const s of arr ?? []) {
        const el = $(s, doc);
        const dt = el?.getAttribute("datetime") || text(el);
        if (!dt) continue;
        const iso = new Date(dt);
        if (!isNaN(+iso)) return iso.toISOString();
      }
      return undefined;
    };

    return {
      title: pickText(selectors.title),
      company: pickText(selectors.company),
      location: pickText(selectors.location),
      description: pickHtml(selectors.description),
      applyUrl: pickHref(selectors.applyUrl),
      postingDate: pickDate(selectors.postingDate),
    };
  };
}

// Generic signature score: presence of title + description nodes boosts confidence.
export function presenceSignatureScore(
  ctx: DetectorContext,
  sel: { title?: string[]; description?: string[] },
): number {
  const t = sel.title?.some((s) => !!$(s, ctx.doc)) ? 0.6 : 0;
  const d = sel.description?.some((s) => !!$(s, ctx.doc)) ? 0.4 : 0;
  return t + d;
}

export const makeDetector = (
  def: Omit<Detector, "id"> & { id: Detector["id"] },
): Detector => def;
