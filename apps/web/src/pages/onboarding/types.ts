export type Provenance = "rule" | "ai" | "user";

export interface Scored<T> {
  value: T | null;
  confidence: number; // 0..1
  source: Provenance;
  warnings?: string[];
}

export type LinkItem = {
  title: Scored<string[]>;
  url: Scored<string[]>;
};

type Location = {
  street: Scored<string>;
  city: Scored<string>;
  state: Scored<string>;
  zip: Scored<string>;
};

export interface ContactInfo {
  name: Scored<string>;
  email: Scored<string>;
  phone: Scored<string>;
  links: LinkItem[];
  location: Location;
}

export interface DateRange {
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  isCurrent?: boolean;
  source: Provenance;
  confidence: number;
}

export interface ExperienceItem {
  titleRaw?: string;
  companyRaw?: string;
  title: Scored<string>;
  company: Scored<string>;
  location: Scored<string>;
  dates: DateRange;
  bullets: Scored<string[]>;
}

export interface EducationItem {
  institutionRaw?: string;
  degreeRaw?: string;
  institution: Scored<string>;
  degree: Scored<string>;
  major: Scored<string>;
  gpa: Scored<string>;
  dates: DateRange;
}

export interface ProjectItem {
  titleRaw?: string;
  title: Scored<string>;
  bullets: Scored<string[]>;
  links: LinkItem[];
  technologies: Scored<string[]>;
  dates: DateRange;
}

export interface Skills {
  raw: Scored<string[]>;
  categorized: Scored<Record<string, string[]>>; // e.g., {languages:[], frameworks:[]}
}

export interface SectionSpan {
  name: string; // normalized section name
  startLine: number; // inclusive
  endLine: number; // exclusive
  score: number; // 0..1 (header match strength)
}

export interface ParseOptions {
  enableOCR?: boolean; // for scanned PDFs (not implemented by default)
  locale?: string; // e.g., 'en-US'
  maxPages?: number;
  skillTaxonomy?: Record<string, string[]>; // override taxonomy
  loggerLevel?: "silent" | "info" | "debug";
}

export interface ParseMeta {
  fileType: string;
  pageCount?: number;
  ocrUsed?: boolean;
}

export interface ResumeParseResult {
  meta: ParseMeta;
  contact: ContactInfo;
  sections: SectionSpan[];
  experience: ExperienceItem[];
  education: EducationItem[];
  projects: ProjectItem[];
  skills: Skills;
  summary: Scored<string>;
  warnings: string[];
  errors: string[];
}
