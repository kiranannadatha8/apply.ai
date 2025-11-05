import { create } from "zustand";

import {
  buildVariantSectionsFromDraft,
  generateVariantDraft,
} from "@/features/resumes/generator";
import { initialResumes, MASTER_RESUME_ID } from "@/features/resumes/dummy-data";
import type {
  ResumeRecord,
  ResumeSectionKind,
  SectionSuggestion,
  SuggestionStatus,
  VariantDraft,
  VariantGenerationInput,
} from "@/features/resumes/types";

interface ResumeLibraryState {
  resumes: ResumeRecord[];
  drafts: Record<string, VariantDraft>;
  activeDraftId: string | null;
  masterResumeId: string;
  createVariantDraft: (
    input: VariantGenerationInput,
  ) => Promise<VariantDraft>;
  setDraftName: (draftId: string, name: string) => void;
  setSuggestionStatus: (
    draftId: string,
    suggestionId: string,
    status: SuggestionStatus,
  ) => void;
  acceptAllSuggestions: (draftId: string) => void;
  rejectAllSuggestions: (draftId: string) => void;
  toggleSuggestion: (draftId: string, suggestionId: string) => void;
  saveDraftAsVariant: (draftId: string) => ResumeRecord | null;
  discardDraft: (draftId: string) => void;
  setActiveDraft: (draftId: string | null) => void;
}

function sortResumes(resumes: ResumeRecord[]) {
  return [...resumes].sort((a, b) => {
    if (a.kind !== b.kind) {
      return a.kind === "master" ? -1 : 1;
    }
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return bTime - aTime;
  });
}

function updateSuggestionStatus(
  suggestions: SectionSuggestion[],
  suggestionId: string,
  status: SuggestionStatus,
) {
  return suggestions.map((suggestion) =>
    suggestion.id === suggestionId
      ? { ...suggestion, status }
      : suggestion,
  );
}

function flipSuggestionStatus(status: SuggestionStatus): SuggestionStatus {
  if (status === "accepted") return "rejected";
  if (status === "rejected") return "accepted";
  return "accepted";
}

function collectAdaptedSections(
  draft: VariantDraft,
  statuses: SuggestionStatus[] = ["accepted"],
): ResumeSectionKind[] {
  const allowed = new Set(statuses);
  const sections = new Set<ResumeSectionKind>();
  for (const suggestion of draft.suggestions) {
    if (allowed.has(suggestion.status)) {
      const section = draft.sections.find(
        (candidate) => candidate.id === suggestion.sectionId,
      );
      if (section) sections.add(section.kind);
    }
  }
  return Array.from(sections);
}

export const useResumeLibrary = create<ResumeLibraryState>((set, get) => ({
  resumes: sortResumes(initialResumes),
  drafts: {},
  activeDraftId: null,
  masterResumeId: MASTER_RESUME_ID,
  async createVariantDraft(input) {
    const baseResume = get().resumes.find(
      (resume) => resume.id === input.baseResumeId,
    );
    if (!baseResume) throw new Error("Base resume not found.");
    const draft = await generateVariantDraft(input, baseResume);
    set((state) => ({
      drafts: { ...state.drafts, [draft.id]: draft },
      activeDraftId: draft.id,
    }));
    return draft;
  },
  setDraftName(draftId, name) {
    set((state) => {
      const draft = state.drafts[draftId];
      if (!draft) return {};
      return {
        drafts: {
          ...state.drafts,
          [draftId]: { ...draft, name },
        },
      };
    });
  },
  setSuggestionStatus(draftId, suggestionId, status) {
    set((state) => {
      const draft = state.drafts[draftId];
      if (!draft) return {};
      return {
        drafts: {
          ...state.drafts,
          [draftId]: {
            ...draft,
            suggestions: updateSuggestionStatus(
              draft.suggestions,
              suggestionId,
              status,
            ),
          },
        },
      };
    });
  },
  acceptAllSuggestions(draftId) {
    set((state) => {
      const draft = state.drafts[draftId];
      if (!draft) return {};
      return {
        drafts: {
          ...state.drafts,
          [draftId]: {
            ...draft,
            suggestions: draft.suggestions.map((suggestion) => ({
              ...suggestion,
              status: "accepted",
            })),
          },
        },
      };
    });
  },
  rejectAllSuggestions(draftId) {
    set((state) => {
      const draft = state.drafts[draftId];
      if (!draft) return {};
      return {
        drafts: {
          ...state.drafts,
          [draftId]: {
            ...draft,
            suggestions: draft.suggestions.map((suggestion) => ({
              ...suggestion,
              status: "rejected",
            })),
          },
        },
      };
    });
  },
  toggleSuggestion(draftId, suggestionId) {
    set((state) => {
      const draft = state.drafts[draftId];
      if (!draft) return {};
      return {
        drafts: {
          ...state.drafts,
          [draftId]: {
            ...draft,
            suggestions: draft.suggestions.map((suggestion) =>
              suggestion.id === suggestionId
                ? {
                    ...suggestion,
                    status: flipSuggestionStatus(suggestion.status),
                  }
                : suggestion,
            ),
          },
        },
      };
    });
  },
  saveDraftAsVariant(draftId) {
    const state = get();
    const draft = state.drafts[draftId];
    if (!draft) return null;
    const acceptedSuggestions = draft.suggestions.filter(
      (suggestion) => suggestion.status === "accepted",
    );
    const resolvedSections = buildVariantSectionsFromDraft(draft);
    const createdAt = new Date().toISOString();
    const variant: ResumeRecord = {
      id: `resume-variant-${crypto.randomUUID()}`,
      kind: "variant",
      name: draft.name,
      createdAt,
      baseResumeId: draft.baseResumeId,
      description: `Generated from ${draft.jobContext.title ?? "target role"}.`,
      sections: resolvedSections,
      jobContext: {
        title: draft.jobContext.title,
        company: draft.jobContext.company,
        location: draft.jobContext.location,
      },
      metrics: {
        keywordsAdded: Array.from(
          new Set(
            acceptedSuggestions.flatMap((suggestion) => suggestion.keywords),
          ),
        ),
        sectionsAdapted: collectAdaptedSections(draft),
      },
      tags: draft.jobContext.keywords.slice(0, 3),
    };
    set((current) => {
      const restDrafts = { ...current.drafts };
      delete restDrafts[draftId];
      const nextResumes = sortResumes([...current.resumes, variant]);
      return {
        drafts: restDrafts,
        activeDraftId:
          current.activeDraftId === draftId ? null : current.activeDraftId,
        resumes: nextResumes,
      };
    });
    return variant;
  },
  discardDraft(draftId) {
    set((state) => {
      if (!state.drafts[draftId]) return {};
      const rest = { ...state.drafts };
      delete rest[draftId];
      return {
        drafts: rest,
        activeDraftId:
          state.activeDraftId === draftId ? null : state.activeDraftId,
      };
    });
  },
  setActiveDraft(draftId) {
    set({ activeDraftId: draftId });
  },
}));
