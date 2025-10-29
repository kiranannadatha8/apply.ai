import { ProjectItem, Scored } from "../../types/onboarding.types";
import { parseDateRange } from "../../utils/date";
import { bulletize } from "../../utils/text";

const PROJECT_HEADER_PATTERNS: RegExp[] = [
  /^(?<name>[^(\[]+?)\s*(?:[\(\[](?<dates>[^\])]+)[\)\]])?$/u,
  /^(?<name>[^(\[]+?)\s*[-\u2013\u2014]\s*(?<description>.+)$/u,
];

const PROJECT_LINK_PATTERNS: RegExp[] = [
  /^(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\/tree\/[A-Za-z0-9_.-]+)?/,
  /^(?:https?:\/\/)?(?:www\.)?[A-Za-z0-9_.-]+\.[A-Za-z]{2,}(?:\/[A-Za-z0-9_.-]+)*(?:\?[A-Za-z0-9_.-]+=[A-Za-z0-9_.-]+(?:&[A-Za-z0-9_.-]+=[A-Za-z0-9_.-]+)*)?/,
];

export function extractProjects(blocks: { lines: string[] }[]): ProjectItem[] {
  const items: ProjectItem[] = [];

  for (const b of blocks) {
    if (b.lines.length === 0) continue;

    const header = b.lines[0];
    let m: RegExpMatchArray | null = null;
    for (const pat of PROJECT_HEADER_PATTERNS) {
      m = header.match(pat);
      if (m) break;
    }

    const links: string[] = [];
    for (const line of b.lines) {
      for (const pat of PROJECT_LINK_PATTERNS) {
        const linkMatch = line.match(pat);
        if (linkMatch) {
          links.push(linkMatch[0]);
        }
      }
    }

    const titleRaw = m?.groups?.["name"]?.trim();
    const datesRaw = m?.groups?.["dates"]?.trim();

    const datesParsed = parseDateRange(datesRaw || "");

    const bulletStartIdx = 1;
    const bulletLines = b.lines
      .slice(bulletStartIdx)
      .filter(
        (l) => /^(?:[-\u2013\u2014\u2022\u00B7\*]|\•)/.test(l) || l.length > 0,
      );

    const bullets = bulletize(bulletLines).filter((s) => s.length > 2);

    const mk = <T>(v: T | null, conf: number): Scored<T> => ({
      value: v,
      confidence: conf,
      source: "rule",
    });

    items.push({
      titleRaw,
      title: mk(titleRaw || null, titleRaw ? 0.9 : 0),
      dates: {
        start: datesParsed.start,
        end: datesParsed.end,
        isCurrent: datesParsed.isCurrent,
        confidence: datesParsed.confidence,
        source: "rule",
      },
      bullets: mk(bullets, bullets.length ? 0.85 : 0),
      links: mk(links, links.length ? 0.9 : 0),
    });
  }
  return items;
}
