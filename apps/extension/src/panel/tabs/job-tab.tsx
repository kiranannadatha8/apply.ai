import { useMemo } from "react";
import { AlertTriangle, Sparkles, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePanelStore } from "@/state/panel-store";
import {
  AutofillProgress,
  type AutofillStatus,
} from "../components/autofill-progress";

export interface JobTabProps {
  jobTitle?: string;
  company?: string;
  atsScore?: number | null;
  missingKeywords?: string[];
  resumeMatch?: number | null;
  isAnalyzed: boolean;
  isSaved: boolean;
  stage?: string;
  onAnalyze: () => void;
  onSave: () => void;
  onAutofill: () => void;
  onCancelAutofill?: () => void;
  onStageChange: (value: string) => void;
  loading: boolean;
  autofillStatus: AutofillStatus;
  showCreateProfileCta?: boolean;
  onCreateProfile?: () => void;
}

const defaultKeywords = ["Leadership", "React", "Stakeholder Alignment"];

export function JobTab({
  jobTitle,
  company,
  atsScore,
  missingKeywords,
  resumeMatch,
  isAnalyzed,
  isSaved,
  stage,
  onAnalyze,
  onSave,
  onAutofill,
  onCancelAutofill,
  onStageChange,
  loading,
  autofillStatus,
  showCreateProfileCta,
  onCreateProfile,
}: JobTabProps) {
  const analysisStatus = usePanelStore((s) => s.analysisStatus);

  const placeholders = useMemo(
    () => ({
      ats: atsScore ?? (isAnalyzed ? 0 : null),
      missing: missingKeywords?.length ? missingKeywords : defaultKeywords,
      resume: resumeMatch ?? (isAnalyzed ? 0 : null),
    }),
    [atsScore, isAnalyzed, missingKeywords, resumeMatch],
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">Detected Job</span>
            <span className="text-lg font-semibold text-foreground">
              {jobTitle ?? <Skeleton className="h-5 w-44" />}
            </span>
            <span className="text-sm text-muted-foreground">
              {company ?? <Skeleton className="h-4 w-36" />}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3 text-center">
            <Metric
              label="ATS Score"
              value={
                placeholders.ats === null
                  ? "?"
                  : `${Math.round(placeholders.ats)}%`
              }
              highlight={isAnalyzed}
            />
            <Metric
              label="Missing Keywords"
              value={
                isAnalyzed
                  ? String(missingKeywords?.length ?? 0)
                  : placeholders.missing.length
              }
            />
            <Metric
              label="Resume Match"
              value={
                placeholders.resume === null
                  ? "?"
                  : `${Math.round(placeholders.resume)}%`
              }
            />
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {(isAnalyzed ? (missingKeywords ?? []) : placeholders.missing)
              .slice(0, 6)
              .map((kw) => (
                <Badge key={kw} variant="outline">
                  {kw}
                </Badge>
              ))}
          </div>

          <div className="flex flex-col gap-2 pt-2">
            {showCreateProfileCta ? (
              <Button
                size="lg"
                onClick={onCreateProfile}
                disabled={loading || !onCreateProfile}
              >
                <UserPlus className="h-4 w-4" />
                Create Profile to Get Started
              </Button>
            ) : (
              <>
                <Button
                  size="lg"
                  onClick={onAnalyze}
                  disabled={loading}
                  data-coachmark-target="analyze"
                >
                  <Sparkles className="h-4 w-4" />
                  {analysisStatus === "pending"
                    ? "Analyzing…"
                    : isAnalyzed
                      ? "Reanalyze Job"
                      : "Analyze Job"}
                </Button>
                <Button
                  onClick={onAutofill}
                  disabled={loading || !isAnalyzed}
                  data-coachmark-target="autofill"
                  title={
                    !isAnalyzed
                      ? "Analyze the job to unlock autofill"
                      : undefined
                  }
                >
                  Autofill Application
                </Button>
              </>
            )}
            <Button
              variant={isSaved ? "secondary" : "outline"}
              onClick={onSave}
              disabled={loading}
            >
              {isSaved ? "Saved" : "Save to My Jobs"}
            </Button>
            {isSaved ? (
              <StagePicker value={stage ?? "saved"} onChange={onStageChange} />
            ) : null}
          </div>
        </CardContent>
      </Card>

      {isAnalyzed ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              AI Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Personalize your resume bullets and cover letter with the missing
              keywords above. Tailor your summary to highlight direct matches.
            </p>
            <p>
              Need more? Jump into the Answers tab to generate bespoke responses
              for short-form questions.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {showCreateProfileCta || !isAnalyzed ? null : (
        <AutofillProgress status={autofillStatus} onCancel={onCancelAutofill} />
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-border bg-muted/50 px-3 py-2">
      <span className="text-lg font-semibold text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
      {highlight ? (
        <span className="mt-1 h-1 w-8 rounded-full bg-primary/70" />
      ) : null}
    </div>
  );
}

function StagePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm">
      <span className="text-muted-foreground">Stage</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange("saved")}
          className={stageClass(value === "saved")}
        >
          Saved
        </button>
        <button
          type="button"
          onClick={() => onChange("applied")}
          className={stageClass(value === "applied")}
        >
          Applied
        </button>
        <button
          type="button"
          onClick={() => onChange("interviewing")}
          className={stageClass(value === "interviewing")}
        >
          Interviewing
        </button>
      </div>
    </div>
  );
}

function stageClass(active: boolean) {
  return [
    "rounded-md px-2 py-1 text-xs font-medium transition",
    active
      ? "bg-primary text-primary-foreground"
      : "text-muted-foreground hover:bg-muted",
  ].join(" ");
}
