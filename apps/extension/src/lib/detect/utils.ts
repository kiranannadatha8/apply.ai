export const VERSION = "2025.10.30-1";

export function $(sel: string, root: ParentNode = document): Element | null {
  return root.querySelector(sel);
}
export function $all(sel: string, root: ParentNode = document): Element[] {
  return Array.from(root.querySelectorAll(sel));
}
export function text(el?: Element | null): string | undefined {
  if (!el) return undefined;
  const t =
    (el as HTMLElement).innerText?.trim() ||
    el.textContent?.trim() ||
    undefined;
  return t || undefined;
}
export function html(el?: Element | null): string | undefined {
  if (!el) return undefined;
  return (el as HTMLElement).innerHTML?.trim() || undefined;
}
export function attr(
  el: Element | null | undefined,
  name: string,
): string | undefined {
  return el?.getAttribute(name) || undefined;
}
export function first<T>(
  ...vals: (T | undefined | null | "")[]
): T | undefined {
  for (const v of vals) if (v && String(v).trim() !== "") return v as T;
  return undefined;
}
export function toAbsoluteUrl(
  href?: string,
  base?: string,
): string | undefined {
  try {
    if (!href) return undefined;
    return new URL(href, base || location.href).toString();
  } catch {
    return undefined;
  }
}
export function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

// JSON-LD JobPosting extractor (fast + robust)
export function extractJobFromJsonLd(
  doc: Document,
): Partial<import("./types").JobFields> {
  const scripts = $all('script[type="application/ld+json"]', doc);
  for (const s of scripts) {
    try {
      const raw = s.textContent?.trim();
      if (!raw) continue;
      const data = JSON.parse(raw);
      const objs = Array.isArray(data) ? data : [data];
      for (const obj of objs) {
        const type = obj["@type"] || obj.type;
        if (!type) continue;
        const isJob = (Array.isArray(type) ? type : [type]).some((t: string) =>
          /JobPosting/i.test(t),
        );
        if (!isJob) continue;
        const company =
          obj.hiringOrganization?.name ||
          obj.hiringOrganization ||
          obj.creator?.name ||
          obj.publisher?.name;
        // jobLocation can be object or array
        const locObj = Array.isArray(obj.jobLocation)
          ? obj.jobLocation[0]
          : obj.jobLocation;
        const address = locObj?.address;
        const location = address
          ? [
              address.addressLocality,
              address.addressRegion,
              address.addressCountry,
            ]
              .filter(Boolean)
              .join(", ")
          : obj.jobLocation?.addressLocality ||
            obj.jobLocation?.name ||
            obj.applicantLocationRequirements?.name;

        return {
          title: obj.title || obj.name,
          company: typeof company === "string" ? company : company?.name,
          location,
          description: obj.description, // often HTML
          applyUrl:
            obj.hiringOrganization?.sameAs ||
            obj.employmentType?.applyUrl ||
            obj.url ||
            obj.applicationUrl,
          postingDate: obj.datePosted || obj.validFrom || obj.datePublished,
        };
      }
    } catch {
      /* ignore bad JSON-LD */
    }
  }
  return {};
}

// cheap content readiness utility
export function onReady(cb: () => void) {
  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  )
    cb();
  else document.addEventListener("DOMContentLoaded", cb, { once: true });
}
