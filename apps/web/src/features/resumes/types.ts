export type ResumeKind = "master" | "variant";

export type ResumeSectionKind =
  | "summary"
  | "experience_bullets"
  | "experience_metadata"
  | "skills"
  | "education";

export interface ResumeSection {
  id: string;
  kind: ResumeSectionKind;
  label: string;
  content: string[];
  /**
   * When false, we recommend avoiding automated edits because the section
   * contains factual data that should be confirmed manually.
   */
  allowAdaptation?: boolean;
  helperText?: string;
}

export interface ResumeRecord {
  id: string;
  kind: ResumeKind;
  name: string;
  createdAt: string;
  baseResumeId?: string;
  description?: string;
  sections: ResumeSection[];
  tags?: string[];
  jobContext?: {
    title?: string;
    company?: string;
    location?: string;
  };
  metrics?: {
    keywordsAdded?: string[];
    sectionsAdapted?: ResumeSectionKind[];
  };
}

export type SuggestionStatus = "pending" | "accepted" | "rejected";

export interface SectionSuggestion {
  id: string;
  sectionId: string;
  changeType: "addition" | "replacement";
  summary: string;
  content: string[];
  status: SuggestionStatus;
  keywords: string[];
  rationale?: string;
}

export interface VariantDraft {
  id: string;
  name: string;
  baseResumeId: string;
  createdAt: string;
  jobDescription: string;
  jobContext: {
    title?: string;
    company?: string;
    location?: string;
    keywords: string[];
  };
  sections: ResumeSection[];
  suggestions: SectionSuggestion[];
  sectionsToAdapt: ResumeSectionKind[];
}

export interface VariantGenerationInput {
  jobDescription: string;
  baseResumeId: string;
  sectionsToAdapt: ResumeSectionKind[];
  presetVariantName?: string;
}
