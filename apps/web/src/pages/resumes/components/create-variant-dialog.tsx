import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Info } from "lucide-react";

import type {
  ResumeRecord,
  ResumeSection,
  ResumeSectionKind,
  VariantGenerationInput,
} from "@/features/resumes/types";

interface CreateVariantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resumes: ResumeRecord[];
  masterResumeId: string;
  initialBaseId?: string;
  onGenerate: (input: VariantGenerationInput) => Promise<void>;
  generating?: boolean;
}

interface ValidationState {
  jobDescription?: string;
  sections?: string;
}

function getDefaultSections(resume?: ResumeRecord): ResumeSectionKind[] {
  if (!resume) return [];
  return resume.sections
    .filter((section) => section.allowAdaptation !== false)
    .map((section) => section.kind);
}

function getSectionOptionId(section: ResumeSection) {
  return `section-option-${section.id}`;
}

export function CreateVariantDialog({
  open,
  onOpenChange,
  resumes,
  masterResumeId,
  initialBaseId,
  onGenerate,
  generating,
}: CreateVariantDialogProps) {
  const masterFallbackId =
    masterResumeId ??
    (resumes.find((resume) => resume.kind === "master")?.id ?? resumes[0]?.id);
  const [selectedBaseId, setSelectedBaseId] = useState<string | undefined>(
    initialBaseId ?? masterFallbackId,
  );
  const baseResume = useMemo(
    () => resumes.find((resume) => resume.id === selectedBaseId),
    [resumes, selectedBaseId],
  );
  const [jobDescription, setJobDescription] = useState("");
  const [selectedSections, setSelectedSections] = useState<ResumeSectionKind[]>(
    getDefaultSections(baseResume),
  );
  const [errors, setErrors] = useState<ValidationState>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setJobDescription("");
      setSelectedSections(getDefaultSections(baseResume));
      setErrors({});
      setSubmitting(false);
      return;
    }
    const resolvedBaseId = initialBaseId ?? masterFallbackId;
    setSelectedBaseId(resolvedBaseId);
  }, [open, initialBaseId, masterFallbackId, baseResume]);

  useEffect(() => {
    if (!open) return;
    setSelectedSections(getDefaultSections(baseResume));
  }, [baseResume, open]);

  const sectionOptions = baseResume?.sections ?? [];

  const handleToggleSection = (
    kind: ResumeSectionKind,
    nextChecked: boolean,
  ) => {
    setSelectedSections((prev) =>
      nextChecked
        ? prev.includes(kind)
          ? prev
          : [...prev, kind]
        : prev.filter((value) => value !== kind),
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!baseResume) return;
    const trimmedDescription = jobDescription.trim();
    const validation: ValidationState = {};
    if (!trimmedDescription) {
      validation.jobDescription = "Please paste the job description.";
    }
    if (!selectedSections.length) {
      validation.sections = "Select at least one section to adapt.";
    }
    if (Object.keys(validation).length) {
      setErrors(validation);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await onGenerate({
        jobDescription: trimmedDescription,
        baseResumeId: baseResume.id,
        sectionsToAdapt: selectedSections,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader className="gap-3">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="size-5 text-primary" />
            Create a New Smart Variant
          </DialogTitle>
          <DialogDescription>
            Provide the job description, choose the base resume, and decide
            which sections to adapt. We&apos;ll handle the rest.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-6"
          onSubmit={handleSubmit}
          noValidate
        >
          <fieldset className="flex flex-col gap-2">
            <Label htmlFor="job-description">Paste the Job Description</Label>
            <Textarea
              id="job-description"
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              placeholder="Paste the role overview, responsibilities, and requirements here..."
              rows={8}
            />
            {errors.jobDescription ? (
              <p className="text-destructive text-sm">{errors.jobDescription}</p>
            ) : (
              <p className="text-muted-foreground text-sm">
                We only use this to tailor the variant — nothing is saved until
                you approve it.
              </p>
            )}
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <Label>Adapt from</Label>
            <Select
              value={selectedBaseId}
              onValueChange={(value) => setSelectedBaseId(value)}
            >
              <SelectTrigger className="w-full justify-between">
                <SelectValue placeholder="Choose a resume" />
              </SelectTrigger>
              <SelectContent align="start">
                {resumes.map((resume) => (
                  <SelectItem key={resume.id} value={resume.id}>
                    <span className="flex flex-col">
                      <span className="font-medium">{resume.name}</span>
                      {resume.kind === "variant" && resume.jobContext?.company ? (
                        <span className="text-muted-foreground text-xs">
                          Based on {resume.jobContext.company}
                        </span>
                      ) : null}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-sm">
              You can start from your master resume or any existing variant.
            </p>
          </fieldset>

          <fieldset className="flex flex-col gap-3">
            <Label>Select sections to adapt</Label>
            <div className="space-y-3 rounded-lg border border-dashed border-border/60 p-4">
              {!sectionOptions.length ? (
                <p className="text-muted-foreground text-sm">
                  The selected resume doesn&apos;t have sections yet.
                </p>
              ) : (
                sectionOptions.map((section) => {
                  const checked = selectedSections.includes(section.kind);
                  const caution = section.allowAdaptation === false;
                  return (
                    <div
                      key={section.id}
                      className="group flex flex-col gap-1 rounded-md border border-transparent px-2 py-1 transition hover:border-border"
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={getSectionOptionId(section)}
                          checked={checked}
                          onCheckedChange={(value) =>
                            handleToggleSection(section.kind, value === true)
                          }
                        />
                        <div className="flex flex-1 flex-col gap-1">
                          <Label
                            htmlFor={getSectionOptionId(section)}
                            className="flex items-center gap-2 text-sm"
                          >
                            {section.label}
                            {caution ? (
                              <Badge
                                variant="outline"
                                className="border-amber-500/50 text-amber-500"
                              >
                                Caution
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Recommended</Badge>
                            )}
                          </Label>
                          {section.helperText ? (
                            <p className="text-muted-foreground flex items-start gap-1 text-xs leading-relaxed">
                              <Info className="mt-[2px] size-3.5 text-amber-500" />
                              {section.helperText}
                            </p>
                          ) : null}
                          {!section.helperText && caution ? (
                            <p className="text-muted-foreground text-xs">
                              We strongly recommend reviewing factual updates
                              manually to protect accuracy.
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {errors.sections ? (
              <p className="text-destructive text-sm">{errors.sections}</p>
            ) : (
              <p className="text-muted-foreground text-sm">
                Toggle off any sections you want to keep untouched. Factual
                fields remain unchecked by default.
              </p>
            )}
          </fieldset>

          <DialogFooter className="gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting || generating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                submitting || generating || !baseResume || !jobDescription.trim()
              }
            >
              {submitting || generating ? "Generating..." : "Generate Variant"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
