import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Link2, Lock } from "lucide-react";

import type { ResumeRecord } from "@/features/resumes/types";

interface ResumeCardProps {
  resume: ResumeRecord;
  onUseAsBase: (resumeId: string) => void;
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatSection(section: string) {
  return section
    .split("_")
    .map((part) =>
      part.length <= 2
        ? part.toUpperCase()
        : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join(" ");
}

export function ResumeCard({ resume, onUseAsBase }: ResumeCardProps) {
  const savedDate = formatDate(resume.createdAt);
  const adaptedSections = resume.metrics?.sectionsAdapted ?? [];
  return (
    <Card className="h-full">
      <CardHeader className="gap-3">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-lg">
            {resume.name}
            <Badge variant={resume.kind === "master" ? "default" : "outline"}>
              {resume.kind === "master" ? "Master" : "Variant"}
            </Badge>
          </CardTitle>
          <CardDescription className="flex flex-col gap-1 text-sm leading-relaxed">
            {resume.kind === "master" ? (
              <>
                <span>
                  Immutable source of truth for generating job-specific
                  variants. Keep factual history accurate here.
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Lock className="size-3.5" />
                  Saved versions reference this resume.
                </span>
              </>
            ) : (
              <>
                <span>
                  Based on{" "}
                  {resume.baseResumeId ? (
                    <strong className="font-medium">Master Resume</strong>
                  ) : (
                    "a base resume"
                  )}
                  {resume.jobContext?.company
                    ? ` for ${resume.jobContext.company}`
                    : ""}{" "}
                  {resume.jobContext?.title
                    ? ` (${resume.jobContext.title})`
                    : ""}
                  .
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Link2 className="size-3.5" />
                  Immutable snapshot tied to its base resume.
                </span>
              </>
            )}
          </CardDescription>
        </div>
        <CardAction>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onUseAsBase(resume.id)}
          >
            Use as base for new variant
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-4">
        {resume.metrics?.keywordsAdded?.length ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Keywords emphasised</p>
            <div className="flex flex-wrap gap-2">
              {resume.metrics.keywordsAdded.slice(0, 6).map((keyword) => (
                <Badge key={keyword} variant="secondary">
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        {resume.jobContext ? (
          <div className="grid gap-1 text-sm">
            {resume.jobContext.title ? (
              <span className="font-medium">
                Target role:{" "}
                <span className="text-muted-foreground">
                  {resume.jobContext.title}
                </span>
              </span>
            ) : null}
            {resume.jobContext.company ? (
              <span className="font-medium">
                Company:{" "}
                <span className="text-muted-foreground">
                  {resume.jobContext.company}
                </span>
              </span>
            ) : null}
            {resume.jobContext.location ? (
              <span className="font-medium">
                Location:{" "}
                <span className="text-muted-foreground">
                  {resume.jobContext.location}
                </span>
              </span>
            ) : null}
          </div>
        ) : null}

        {adaptedSections.length ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Sections adapted</p>
            <div className="flex flex-wrap gap-2 text-xs">
              {adaptedSections.map((section) => (
                <Badge key={section} variant="outline">
                  {formatSection(section)}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        {resume.description ? (
          <p className="text-muted-foreground text-sm leading-relaxed">
            {resume.description}
          </p>
        ) : null}
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t border-border/70 pt-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <CalendarDays className="size-3.5" />
          Saved {savedDate}
        </span>
        <span>
          {resume.tags?.length ? `Tags: ${resume.tags.join(", ")}` : ""}
        </span>
      </CardFooter>
    </Card>
  );
}
