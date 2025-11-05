import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Sparkles, FileDown, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import DashboardNavBar from "@/pages/dashboard/nav-bar";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";

import {
  useResumeLibrary,
} from "@/stores/resumes";
import type {
  ResumeRecord,
  SectionSuggestion,
  VariantDraft,
} from "@/features/resumes/types";
import { BaseResumeView } from "../components/base-resume-view";
import { VariantPreview } from "../components/variant-preview";
import { SuggestionCard } from "../components/suggestion-card";

const PROCESS_STEPS = [
  { key: "pending", label: "Pending", dotClass: "bg-amber-500" },
  { key: "accepted", label: "Accepted", dotClass: "bg-emerald-500" },
  { key: "rejected", label: "Rejected", dotClass: "bg-muted-foreground" },
] as const;

function groupSuggestionsBySection(
  suggestions: SectionSuggestion[],
): Record<string, SectionSuggestion[]> {
  return suggestions.reduce<Record<string, SectionSuggestion[]>>(
    (acc, suggestion) => {
      if (!acc[suggestion.sectionId]) {
        acc[suggestion.sectionId] = [suggestion];
      } else {
        acc[suggestion.sectionId].push(suggestion);
      }
      return acc;
    },
    {},
  );
}

function sortSuggestions(suggestions: SectionSuggestion[]) {
  const order = { pending: 0, accepted: 1, rejected: 2 } as const;
  return [...suggestions].sort(
    (a, b) => order[a.status] - order[b.status],
  );
}

export default function ReviewVariantPage() {
  const navigate = useNavigate();
  const params = useParams<{ draftId: string }>();
  const draftId = params.draftId ?? "";
  const rawDraft = useResumeLibrary((state) => state.drafts[draftId]);
  const setDraftName = useResumeLibrary((state) => state.setDraftName);
  const setSuggestionStatus = useResumeLibrary((state) => state.setSuggestionStatus);
  const acceptAllSuggestions = useResumeLibrary((state) => state.acceptAllSuggestions);
  const rejectAllSuggestions = useResumeLibrary((state) => state.rejectAllSuggestions);
  const saveDraftAsVariant = useResumeLibrary((state) => state.saveDraftAsVariant);
  const discardDraft = useResumeLibrary((state) => state.discardDraft);
  const resumes = useResumeLibrary((state) => state.resumes);

  const [snapshot, setSnapshot] = useState<VariantDraft | null>(rawDraft ?? null);
  const [exportOpen, setExportOpen] = useState(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [postSaveOpen, setPostSaveOpen] = useState(false);
  const [savedVariant, setSavedVariant] = useState<ResumeRecord | null>(null);

  useEffect(() => {
    if (rawDraft) {
      setSnapshot(rawDraft);
    }
  }, [rawDraft]);

  const draft = rawDraft ?? snapshot;
  const isInteractive = Boolean(rawDraft);

  const baseResume = useMemo(() => {
    if (!draft) return undefined;
    return resumes.find((resume) => resume.id === draft.baseResumeId);
  }, [draft, resumes]);

  const suggestionsBySection = useMemo(() => {
    if (!draft) return {};
    return groupSuggestionsBySection(draft.suggestions);
  }, [draft]);

  const sortedSuggestions = useMemo(() => {
    if (!draft) return [];
    return sortSuggestions(draft.suggestions);
  }, [draft]);

  const statusBreakdown = useMemo(() => {
    if (!draft) return { pending: 0, accepted: 0, rejected: 0 };
    return draft.suggestions.reduce(
      (acc, suggestion) => {
        acc[suggestion.status] += 1;
        return acc;
      },
      { pending: 0, accepted: 0, rejected: 0 },
    );
  }, [draft]);

  const totalSuggestions = statusBreakdown.pending + statusBreakdown.accepted + statusBreakdown.rejected;

  if (!draft) {
    return (
      <main className="flex min-h-screen flex-col bg-background">
        <DashboardNavBar />
        <div className="mx-auto flex w-full max-w-4xl flex-1 items-center justify-center px-4 py-24">
          <Empty className="border border-dashed border-border/60">
            <EmptyHeader>
              <EmptyTitle>Variant not found</EmptyTitle>
              <EmptyDescription>
                The draft you&apos;re looking for has been saved or discarded. Head
                back to your resume library to continue.
              </EmptyDescription>
            </EmptyHeader>
            <Button onClick={() => navigate("/resumes")}>Return to My Resumes</Button>
          </Empty>
        </div>
      </main>
    );
  }

  const handleAccept = (suggestionId: string) => {
    if (!isInteractive) return;
    setSuggestionStatus(draft.id, suggestionId, "accepted");
  };

  const handleReject = (suggestionId: string) => {
    if (!isInteractive) return;
    setSuggestionStatus(draft.id, suggestionId, "rejected");
  };

  const handleReset = (suggestionId: string) => {
    if (!isInteractive) return;
    setSuggestionStatus(draft.id, suggestionId, "pending");
  };

  const handleSave = () => {
    const saved = saveDraftAsVariant(draft.id);
    if (!saved) {
      toast.error("We couldn’t save this variant. Please try again.");
      return;
    }
    setSavedVariant(saved);
    setPostSaveOpen(true);
    toast.success("Variant saved to your resume library.");
  };

  const handleDiscard = () => {
    discardDraft(draft.id);
    toast.info("Draft discarded.");
    navigate("/resumes");
  };

  const company = draft.jobContext.company;
  const title = draft.jobContext.title;

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <DashboardNavBar />
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 pb-16 pt-10 md:px-8">
        <header className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground">
                <Sparkles className="size-3.5 text-primary" />
                Review New Variant
              </div>
              <div className="flex flex-col gap-3">
                <Input
                  value={draft.name}
                  onChange={(event) =>
                    isInteractive && setDraftName(draft.id, event.target.value)
                  }
                  disabled={!isInteractive}
                />
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {company ? `Targeting ${company}` : "Customize your resume for this job."}
                  {title ? ` — Role: ${title}` : ""}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => setExportOpen(true)}
                disabled={!isInteractive && !savedVariant}
                className="gap-2"
              >
                <FileDown className="size-4" /> Export
              </Button>
              <Button
                variant="outline"
                onClick={() => setConfirmDiscardOpen(true)}
                className="gap-2"
              >
                <Trash2 className="size-4" /> Discard
              </Button>
              <Button onClick={handleSave} disabled={!isInteractive}>
                Save
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border/70 bg-muted/30 px-4 py-3 text-sm">
            <span className="font-medium">{totalSuggestions} smart suggestions</span>
            <div className="flex flex-wrap gap-3 text-xs">
              {PROCESS_STEPS.map((step) => (
                <span key={step.key} className="flex items-center gap-1">
                  <span className={`size-2 rounded-full ${step.dotClass}`} />
                  {step.label}: {statusBreakdown[step.key as keyof typeof statusBreakdown]}
                </span>
              ))}
            </div>
            <div className="ml-auto flex gap-2 text-xs">
              <Button
                size="sm"
                variant="outline"
                onClick={() => isInteractive && acceptAllSuggestions(draft.id)}
                disabled={!isInteractive || !statusBreakdown.pending}
              >
                Accept all
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => isInteractive && rejectAllSuggestions(draft.id)}
                disabled={!isInteractive || !statusBreakdown.pending}
              >
                Reject all
              </Button>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <BaseResumeView
            resumeName={baseResume?.name ?? "Base Resume"}
            sections={draft.sections}
          />
          <VariantPreview
            sections={draft.sections}
            suggestionsBySection={suggestionsBySection}
          />
        </div>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">AI Suggestions</h2>
          <div className="grid gap-4">
            {sortedSuggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                sectionLabel={draft.sections.find((section) => section.id === suggestion.sectionId)?.label}
                onAccept={() => handleAccept(suggestion.id)}
                onReject={() => handleReject(suggestion.id)}
                onReset={() => handleReset(suggestion.id)}
                disabled={!isInteractive}
              />
            ))}
          </div>
        </section>
      </div>

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export variant</DialogTitle>
            <DialogDescription>
              Choose a download format. All exports use ATS-safe text layouts.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => {
                toast.success("PDF export queued. You’ll find it in your downloads.");
                setExportOpen(false);
              }}
            >
              Export as PDF
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => {
                toast.success("DOCX export queued. You’ll find it in your downloads.");
                setExportOpen(false);
              }}
            >
              Export as DOCX
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDiscardOpen} onOpenChange={setConfirmDiscardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard this draft?</DialogTitle>
            <DialogDescription>
              This action removes the variant and can’t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-between">
            <Button variant="ghost" onClick={() => setConfirmDiscardOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDiscard}>
              Discard draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={postSaveOpen} onOpenChange={setPostSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Variant saved!</DialogTitle>
            <DialogDescription>
              {savedVariant?.name ?? "Your variant"} is now in your resume library.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              You can link this resume to a job or export it immediately.
            </p>
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="secondary"
              onClick={() => {
                toast.info("Job linking coming soon.");
              }}
            >
              Link to Job
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setPostSaveOpen(false);
                setExportOpen(true);
              }}
            >
              Export
            </Button>
            <Button
              onClick={() => {
                setPostSaveOpen(false);
                navigate("/resumes");
              }}
            >
              Finish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
