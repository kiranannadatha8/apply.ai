import { useState } from "react";
import Wrapper from "./components/Wrapper";
import { resumeParser } from "@/app/api";
import type {
  ContactInfo,
  EducationItem,
  ExperienceItem,
  ProjectItem,
  Provenance,
  ResumeParseResult,
} from "./types";

const emptyScoredString = {
  value: null,
  confidence: 0,
  source: "rule" as Provenance,
  warnings: [],
};

const emptyScoredStringArray = {
  value: [],
  confidence: 0,
  source: "rule" as Provenance,
  warnings: [],
};

const emptyLocation = {
  street: { ...emptyScoredString },
  city: { ...emptyScoredString },
  state: { ...emptyScoredString },
  zip: { ...emptyScoredString },
};

const emptyLinks = {
  title: { ...emptyScoredString },
  url: { ...emptyScoredString },
};

const emptyProject: ProjectItem = {
  title: { ...emptyScoredString },
  links: [{ ...emptyLinks }],
  technologies: { ...emptyScoredStringArray },
  bullets: { ...emptyScoredStringArray },
  dates: {
    startMonth: "",
    startYear: "",
    endMonth: "",
    endYear: "",
    isCurrent: false,
    source: "rule" as Provenance,
    confidence: 0,
  },
};

export const EMPTY_RESUME_PARSE_RESULT: ResumeParseResult = {
  meta: {
    fileType: "",
    pageCount: 0,
    ocrUsed: false,
  },
  contact: {
    name: { ...emptyScoredString },
    email: { ...emptyScoredString },
    phone: { ...emptyScoredString },
    links: [{ ...emptyLinks }],
    location: { ...emptyLocation },
  },
  sections: [],
  experience: [],
  education: [],
  projects: [{ ...emptyProject }],
  skills: {
    raw: { ...emptyScoredStringArray },
    categorized: {
      value: {},
      confidence: 0,
      source: "rule" as Provenance,
    },
  },
  summary: { ...emptyScoredString },
  warnings: [],
  errors: [],
};

export const OnboardingPage = () => {
  const [stepIndex, setStepIndex] = useState(0);
  const [profile, setProfile] = useState<ResumeParseResult>(
    EMPTY_RESUME_PARSE_RESULT,
  );
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skillsText, setSkillsText] = useState<string>("");

  const handleResumeUpload = async (file: File) => {
    setAnalyzing(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("resume", file);
      const response = await resumeParser(formData);
      setProfile(response);
      setStepIndex(1);
    } catch (err: any) {
      setError(err.message ?? "Unable to analyze resume. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const updateDetails = (field: keyof ContactInfo, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const updateEducation = (
    index: number,
    field: keyof EducationItem,
    value: string,
  ) => {
    setProfile((prev) => {
      const next = [...prev.education];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, education: next };
    });
  };

  const updateExperience = (
    index: number,
    field: keyof ExperienceItem,
    value: string | string[],
  ) => {
    setProfile((prev) => {
      const next = [...prev.experience];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, experience: next };
    });
  };

  const updateProject = (
    index: number,
    field: keyof ProjectItem,
    value: string | string[],
  ) => {
    setProfile((prev) => {
      const next = [...prev.projects];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, projects: next };
    });
  };

  return (
    <Wrapper
      stepIndex={stepIndex}
      setStepIndex={setStepIndex}
      profile={profile}
      setProfile={setProfile}
      analyzing={analyzing}
      setAnalyzing={setAnalyzing}
      error={error}
      setError={setError}
      handleResumeUpload={handleResumeUpload}
      updateEducation={updateEducation}
      updateExperience={updateExperience}
      updateProject={updateProject}
      skillsText={skillsText}
      setSkillsText={setSkillsText}
      updateDetails={updateDetails}
    />
  );
};

export default OnboardingPage;
