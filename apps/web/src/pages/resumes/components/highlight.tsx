import type { ReactNode } from "react";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function renderHighlightedText(
  text: string,
  keywords: string[],
  highlightClass = "bg-emerald-500/20 text-emerald-900 dark:text-emerald-100 px-1 rounded-sm",
): ReactNode[] {
  if (!keywords.length) return [text];
  const pattern = new RegExp(
    `(${keywords.map((keyword) => escapeRegex(keyword)).join("|")})`,
    "gi",
  );
  const parts = text.split(pattern);
  return parts.map((part, index) => {
    if (!part) return null;
    const isMatch = index % 2 === 1;
    if (isMatch) {
      return (
        <mark key={`${index}-${part}`} className={highlightClass}>
          {part}
        </mark>
      );
    }
    return <span key={`${index}-${part}`}>{part}</span>;
  });
}
