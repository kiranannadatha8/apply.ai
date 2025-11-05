import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import DashboardNavBar from "@/pages/dashboard/nav-bar";
import { useResumeLibrary } from "@/stores/resumes";
import type { VariantGenerationInput } from "@/features/resumes/types";

import { ResumeCard } from "./components/resume-card";
import { CreateVariantDialog } from "./components/create-variant-dialog";
import { GenerationProcessingDialog } from "./components/generation-processing-dialog";

const PROCESSING_MESSAGES = [
  "Analyzing keywords and intent from the job description…",
  "Mapping keywords to your selected resume sections…",
  "Preparing the interactive review workspace…",
];

export default function ResumesPage() {
  const navigate = useNavigate();
  const resumes = useResumeLibrary((state) => state.resumes);
  const masterResumeId = useResumeLibrary((state) => state.masterResumeId);
  const createVariantDraft = useResumeLibrary(
    (state) => state.createVariantDraft,
  );

  const masterResume = useMemo(
    () =>
      resumes.find((resume) => resume.id === masterResumeId) ??
      resumes.find((resume) => resume.kind === "master"),
    [resumes, masterResumeId],
  );
  const variants = useMemo(
    () => resumes.filter((resume) => resume.kind === "variant"),
    [resumes],
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [prefillBaseId, setPrefillBaseId] = useState<string | undefined>(
    undefined,
  );
  const [generating, setGenerating] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);

  useEffect(() => {
    if (!processing) {
      setProcessingStep(0);
      return;
    }
    const interval = window.setInterval(() => {
      setProcessingStep((prev) => (prev + 1) % PROCESSING_MESSAGES.length);
    }, 1800);
    return () => window.clearInterval(interval);
  }, [processing]);

  const openCreateDialog = (baseId?: string) => {
    setPrefillBaseId(baseId);
    setCreateOpen(true);
  };

  const handleGenerate = async (input: VariantGenerationInput) => {
    try {
      setGenerating(true);
      setProcessing(true);
      const draft = await createVariantDraft(input);
      setProcessing(false);
      setGenerating(false);
      toast.success("Variant generated! Review the highlighted changes.");
      navigate(`/resumes/review/${draft.id}`);
    } catch (error) {
      setProcessing(false);
      setGenerating(false);
      setPrefillBaseId(input.baseResumeId);
      setCreateOpen(true);
      const message =
        error instanceof Error
          ? error.message
          : "Unable to create the variant. Please try again.";
      toast.error(message);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <DashboardNavBar />
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 pb-16 pt-10 md:px-8">
        <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/50 px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" />
              Smart Resume Variant Generator
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                My Resumes
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Maintain your master resume, generate targeted variants, and
                keep an immutable history of what you sent to each company.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => openCreateDialog(masterResume?.id)}
              disabled={generating}
              className="gap-2"
            >
              <Plus className="size-4" />
              Create Smart Variant
            </Button>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          {masterResume ? (
            <div className="md:col-span-2">
              <ResumeCard
                key={masterResume.id}
                resume={masterResume}
                onUseAsBase={openCreateDialog}
              />
            </div>
          ) : null}
          {!variants.length ? (
            <div className="md:col-span-2">
              <Empty className="border border-dashed border-border/60">
                <EmptyHeader>
                  <EmptyTitle>No variants yet</EmptyTitle>
                  <EmptyDescription>
                    Generate a smart variant to tailor your resume for a
                    specific job description without touching your master copy.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          ) : (
            variants.map((resume) => (
              <ResumeCard
                key={resume.id}
                resume={resume}
                onUseAsBase={openCreateDialog}
              />
            ))
          )}
        </section>

        <CreateVariantDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          resumes={resumes}
          masterResumeId={masterResume?.id ?? masterResumeId}
          initialBaseId={prefillBaseId}
          onGenerate={async (input) => {
            setCreateOpen(false);
            await handleGenerate(input);
          }}
          generating={generating || processing}
        />

        <GenerationProcessingDialog
          open={processing}
          message={PROCESSING_MESSAGES[processingStep]}
          subtext="Ensuring factual data stays untouched while surfacing new keywords."
        />
      </div>
    </main>
  );
}
