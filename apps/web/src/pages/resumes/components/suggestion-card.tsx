import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, RotateCcw, X } from "lucide-react";

import type { SectionSuggestion } from "@/features/resumes/types";
import { renderHighlightedText } from "./highlight";

interface SuggestionCardProps {
  suggestion: SectionSuggestion;
  sectionLabel?: string;
  onAccept: () => void;
  onReject: () => void;
  onReset: () => void;
  disabled?: boolean;
}

function statusToBadge(status: SectionSuggestion["status"]) {
  switch (status) {
    case "accepted":
      return {
        label: "Accepted",
        variant: "default" as const,
        className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-100",
      };
    case "rejected":
      return {
        label: "Rejected",
        variant: "outline" as const,
        className: "border-border/60 text-muted-foreground",
      };
    default:
      return {
        label: "Pending",
        variant: "secondary" as const,
        className: "bg-amber-500/15 text-amber-600 dark:text-amber-100",
      };
  }
}

export function SuggestionCard({
  suggestion,
  sectionLabel,
  onAccept,
  onReject,
  onReset,
  disabled = false,
}: SuggestionCardProps) {
  const badge = statusToBadge(suggestion.status);
  const isAccepted = suggestion.status === "accepted";
  const isRejected = suggestion.status === "rejected";
  return (
    <article className="rounded-xl border border-border/60 bg-card px-5 py-4 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {sectionLabel ?? "Resume Section"}
          </span>
          <h3 className="text-sm font-semibold leading-snug">
            {suggestion.summary}
          </h3>
        </div>
        <Badge variant={badge.variant} className={badge.className}>
          {badge.label}
        </Badge>
      </header>

      <div className="mt-3 space-y-2 text-sm leading-relaxed">
        {suggestion.content.map((line, index) => (
          <p
            key={`${suggestion.id}-content-${index}`}
            className="flex flex-wrap gap-x-1"
          >
            {renderHighlightedText(line, suggestion.keywords)}
          </p>
        ))}
      </div>

      {suggestion.keywords.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestion.keywords.map((keyword) => (
            <Badge key={keyword} variant="secondary">
              {keyword}
            </Badge>
          ))}
        </div>
      ) : null}

      <footer className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={isAccepted ? "secondary" : "default"}
          onClick={onAccept}
          className="gap-1"
          disabled={disabled}
        >
          <Check className="size-4" /> Accept
        </Button>
        <Button
          size="sm"
          variant={isRejected ? "secondary" : "outline"}
          onClick={onReject}
          className="gap-1"
          disabled={disabled}
        >
          <X className="size-4" /> Reject
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onReset}
          className="gap-1"
          disabled={disabled}
        >
          <RotateCcw className="size-4" /> Reset
        </Button>
      </footer>
    </article>
  );
}
