import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import type {
  ResumeSection,
  SectionSuggestion,
} from "@/features/resumes/types";
import { renderHighlightedText } from "./highlight";

interface VariantPreviewProps {
  sections: ResumeSection[];
  suggestionsBySection: Record<string, SectionSuggestion[]>;
}

function statusStyle(status: SectionSuggestion["status"]) {
  if (status === "accepted") {
    return {
      badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-200",
      container: "border-emerald-400/40 bg-emerald-500/10",
      label: "Accepted",
    } as const;
  }
  if (status === "rejected") {
    return {
      badge: "bg-muted text-muted-foreground",
      container: "border-muted/60 bg-muted/40 text-muted-foreground",
      label: "Rejected",
    } as const;
  }
  return {
    badge: "bg-amber-500/15 text-amber-600 dark:text-amber-100",
    container: "border-amber-400/40 bg-amber-500/10",
    label: "Pending",
  } as const;
}

export function VariantPreview({
  sections,
  suggestionsBySection,
}: VariantPreviewProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base font-semibold">New Variant</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {sections.map((section) => {
          const suggestions = suggestionsBySection[section.id] ?? [];
          const visibleSuggestions = suggestions.filter(
            (suggestion) => suggestion.status !== "rejected",
          );
          return (
            <section key={section.id} className="space-y-3">
              <header className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide">
                  {section.label}
                </h3>
                {suggestions.length ? (
                  <span className="text-muted-foreground text-xs">
                    {suggestions.length} suggestion
                    {suggestions.length === 1 ? "" : "s"}
                  </span>
                ) : null}
              </header>
              <ul className="space-y-2 text-sm">
                {section.content.map((item, index) => (
                  <li
                    key={`${section.id}-base-${index}`}
                    className="rounded-lg border border-transparent bg-background/40 px-3 py-2 leading-relaxed shadow-xs"
                  >
                    {item}
                  </li>
                ))}
                {visibleSuggestions.map((suggestion) => {
                  const style = statusStyle(suggestion.status);
                  return (
                    <li
                      key={suggestion.id}
                      className={`rounded-lg border px-3 py-3 leading-relaxed shadow-xs transition ${style.container}`}
                    >
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase">
                        <Badge variant="secondary" className={style.badge}>
                          {style.label}
                        </Badge>
                        <span className="text-muted-foreground">{suggestion.summary}</span>
                      </div>
                      <div className="mt-2 space-y-2">
                        {suggestion.content.map((line, lineIndex) => (
                          <p
                            key={`${suggestion.id}-line-${lineIndex}`}
                            className="flex flex-wrap gap-x-1 text-sm"
                          >
                            {renderHighlightedText(line, suggestion.keywords)}
                          </p>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </CardContent>
    </Card>
  );
}
