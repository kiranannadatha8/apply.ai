import { Button } from "@/components/ui/button";
import EducationStep from "./Education";
import ExperienceStep from "./Experience";
import ProjectsStep from "./Project";
import SkillsStep from "./Skills";
import Stepper from "./Stepper";
import UploadStep from "./Upload";
import { Check, Loader2 } from "lucide-react";
import { useMemo, type Dispatch, type SetStateAction } from "react";
import type {
  ContactInfo,
  EducationItem,
  ExperienceItem,
  ProjectItem,
  ResumeParseResult,
} from "../types";
import type { Steps } from "@/lib/types";
import DetailsStep from "./Details";

interface WrapperProps {
  stepIndex: number;
  setStepIndex: Dispatch<SetStateAction<number>>;
  profile: ResumeParseResult;
  setProfile: Dispatch<SetStateAction<ResumeParseResult>>;
  analyzing: boolean;
  setAnalyzing: (analyzing: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  handleResumeUpload: (file: File) => void;
  updateEducation: (
    index: number,
    field: keyof EducationItem,
    value: string,
  ) => void;
  updateExperience: (
    index: number,
    field: keyof ExperienceItem,
    value: string | string[],
  ) => void;
  updateProject: (
    index: number,
    field: keyof ProjectItem,
    value: string | string[],
  ) => void;
  skillsText: string;
  setSkillsText: (skillsText: string) => void;
  summary?: string;
  updateDetails: (field: keyof ContactInfo, value: string) => void;
}

const Wrapper = ({
  stepIndex,
  setStepIndex,
  profile,
  setProfile,
  analyzing,
  setAnalyzing,
  error,
  setError,
  handleResumeUpload,
  updateEducation,
  updateExperience,
  updateProject,
  skillsText,
  setSkillsText,
  summary,
  updateDetails,
}: WrapperProps) => {
  const steps: Steps[] = [
    { key: "upload", label: "Upload Resume" },
    { key: "details", label: "Personal Details" },
    { key: "education", label: "Education" },
    { key: "skills", label: "Skills" },
    { key: "experience", label: "Experience" },
    { key: "projects", label: "Projects" },
  ];

  type StepKey = (typeof steps)[number]["key"];

  const currentStep = useMemo<StepKey>(() => steps[stepIndex].key, [stepIndex]);

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Let&apos;s get your profile ready
        </h1>
        <p className="text-muted-foreground">
          Upload your latest resume and confirm the details we detected to
          tailor job matches and application flows.
        </p>
      </header>

      <Stepper currentIndex={stepIndex} steps={steps} />

      {error ? (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {currentStep === "upload" ? (
        <UploadStep analyzing={analyzing} onFileSelected={handleResumeUpload} />
      ) : null}

      {currentStep === "details" ? (
        <DetailsStep
          contact={profile.contact}
          onAdd={() =>
            setProfile((prev) => ({
              ...prev,
              contact: {
                ...prev.contact,
                links: {
                  value: [],
                  confidence: 1,
                  source: "user",
                },
              },
            }))
          }
          onRemove={() => {}}
          onUpdate={updateDetails}
        />
      ) : null}

      {currentStep === "education" ? (
        <EducationStep
          educations={profile.education}
          onAdd={() =>
            setProfile((prev) => ({
              ...prev,
              education: [
                ...prev.education,
                {
                  institution: { value: "", confidence: 1, source: "user" },
                  degree: { value: "", confidence: 1, source: "user" },
                  major: { value: "", confidence: 1, source: "user" },
                  gpa: { value: "", confidence: 1, source: "user" },
                  dates: {
                    start: "",
                    end: "",
                    isCurrent: false,
                    source: "user",
                    confidence: 1,
                  },
                },
              ],
            }))
          }
          onRemove={(index) =>
            setProfile((prev) => ({
              ...prev,
              education: prev.education.filter((_, idx) => idx !== index),
            }))
          }
          onUpdate={updateEducation}
        />
      ) : null}

      {currentStep === "skills" ? (
        <SkillsStep
          skillsText={skillsText}
          reviewSummary={summary}
          onChange={setSkillsText}
        />
      ) : null}

      {currentStep === "experience" ? (
        <ExperienceStep
          experiences={profile.experience}
          onAdd={() =>
            setProfile((prev) => ({
              ...prev,
              experience: [
                ...prev.experience,
                {
                  company: { value: "", confidence: 1, source: "user" },
                  title: { value: "", confidence: 1, source: "user" },
                  location: { value: "", confidence: 1, source: "user" },
                  dates: {
                    start: "",
                    end: "",
                    isCurrent: false,
                    source: "user",
                    confidence: 1,
                  },
                  bullets: { value: [], confidence: 1, source: "user" },
                },
              ],
            }))
          }
          onRemove={(index) =>
            setProfile((prev) => ({
              ...prev,
              experience: prev.experience.filter((_, idx) => idx !== index),
            }))
          }
          onUpdate={updateExperience}
        />
      ) : null}

      {currentStep === "projects" ? (
        <ProjectsStep
          projects={profile.projects}
          onAdd={() =>
            setProfile((prev) => ({
              ...prev,
              projects: [
                ...prev.projects,
                {
                  title: { value: "", confidence: 1, source: "user" },
                  bullets: { value: [], confidence: 1, source: "user" },
                  links: { value: [], confidence: 1, source: "user" },
                  dates: {
                    start: "",
                    end: "",
                    isCurrent: false,
                    source: "user",
                    confidence: 1,
                  },
                },
              ],
            }))
          }
          onRemove={(index) =>
            setProfile((prev) => ({
              ...prev,
              projects: prev.projects.filter((_, idx) => idx !== index),
            }))
          }
          onUpdate={updateProject}
        />
      ) : null}

      <footer className="flex items-center justify-between border-t border-border pt-4">
        <Button
          variant="ghost"
          disabled={stepIndex === 0 || analyzing}
          onClick={() => setStepIndex((idx) => Math.max(0, idx - 1))}
        >
          Back
        </Button>
        <div className="flex items-center gap-3">
          {stepIndex < steps.length - 1 ? (
            <Button
              onClick={() => {
                if (currentStep === "skills") {
                  setProfile((prev) => ({
                    ...prev,
                    skillsText: skillsText
                      .split(/[,\n]/)
                      .map((skill) => skill.trim())
                      .filter(Boolean)
                      .map((name) => ({ name })),
                  }));
                }
                setStepIndex((idx) => Math.min(steps.length - 1, idx + 1));
              }}
              disabled={
                analyzing ||
                (currentStep === "education" && !profile.education.length)
              }
            >
              Next
            </Button>
          ) : (
            <Button onClick={() => console.log("finish")} disabled={analyzing}>
              {analyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Completing
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" /> Finish
                </>
              )}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
};

export default Wrapper;
