import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PanelHeader } from "./components/panel-header";
import { PanelFooter } from "./components/panel-footer";
import { JobTab } from "./tabs/job-tab";
import { MyJobsTab } from "./tabs/my-jobs-tab";
import { AnswersTab } from "./tabs/answers-tab";
import { TimelineTab } from "./tabs/timeline-tab";
import { SettingsRoot } from "./views/settings-root";
import {
  usePanelStore,
  type PanelMode,
  type PanelTab,
} from "@/state/panel-store";
import { useProfile } from "./hooks/useProfile";
import {
  useJobRecord,
  useSavedJobs,
  useSaveJob,
  useUpdateStage,
} from "./hooks/useJobRecords";
import { useAnalyzeJob } from "./hooks/useAnalyzeJob";
import { useTimeline } from "./hooks/useTimeline";
import { useDomainAutoApply } from "./hooks/useDomainAutoApply";
import { getCurrentDetection } from "@/lib/detect/context";
import type { DetectionResult } from "@/lib/detect/types";
import type { JobStage } from "@/lib/storage/jobStore";
import { cn } from "@/lib/utils";
import { EXT_STORAGE_KEYS } from "@/services/storage";
import { openWebApp } from "@/lib/web-app";
import { CoachMarks, type CoachMarkStep } from "./components/coach-marks";

const mockTemplates = [
  {
    id: "strengths",
    label: "Top Strengths",
    prompt: "What are your top strengths relative to this role?",
  },
  {
    id: "impact",
    label: "Impact Story",
    prompt: "Describe a high-impact project result that aligns with this job.",
  },
  {
    id: "culture",
    label: "Culture Fit",
    prompt: "Explain how you align with the company's values.",
  },
];

const TUTORIAL_STORAGE_KEY = "applyai.panelTutorial.completed.v1";

export function SidePanelRoot() {
  const surface = usePanelStore((s) => s.surface);
  const mode = usePanelStore((s) => s.mode);
  const activeTab = usePanelStore((s) => s.activeTab);
  const setActiveTab = usePanelStore((s) => s.setActiveTab);
  const setSurface = usePanelStore((s) => s.setSurface);
  const setMode = usePanelStore((s) => s.setMode);
  const setOpen = usePanelStore((s) => s.setOpen);
  const detection = usePanelStore((s) => s.detection);
  const setDetection = usePanelStore((s) => s.setDetection);
  const analysisStatus = usePanelStore((s) => s.analysisStatus);
  const setAnalysisStatus = usePanelStore((s) => s.setAnalysisStatus);
  const setAutofillStatus = usePanelStore((s) => s.setAutofillStatus);
  const pinnedJobUrl = usePanelStore((s) => s.pinnedJobUrl);
  const setPinnedJobUrl = usePanelStore((s) => s.setPinnedJobUrl);
  const autofillStatus = usePanelStore((s) => s.autofillStatus);
  const isOpen = usePanelStore((s) => s.isOpen);

  const panelRef = useRef<HTMLDivElement>(null);

  const [sessionState, setSessionState] = useState<
    "unknown" | "authenticated" | "loggedOut"
  >("unknown");
  const [tutorialStatus, setTutorialStatus] = useState<
    "unknown" | "pending" | "done"
  >("unknown");
  const [tutorialStep, setTutorialStep] = useState(0);
  const [jobsQuery, setJobsQuery] = useState("");
  const [timelineFilter, setTimelineFilter] = useState<"7d" | "30d">("7d");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const { profile, status: profileStatus } = useProfile();

  useEffect(() => {
    let cancelled = false;
    const chromeApi = (
      globalThis as typeof globalThis & {
        chrome?: typeof chrome;
      }
    ).chrome;

    if (!chromeApi?.storage?.local) {
      setSessionState("authenticated");
      return;
    }

    const evaluateSession = async () => {
      try {
        const result = await chromeApi.storage.local.get(
          EXT_STORAGE_KEYS.extToken,
        );
        if (cancelled) return;
        const token = result?.[EXT_STORAGE_KEYS.extToken];
        setSessionState(token ? "authenticated" : "loggedOut");
      } catch {
        if (!cancelled) {
          setSessionState("authenticated");
        }
      }
    };

    const listener: Parameters<
      typeof chrome.storage.onChanged.addListener
    >[0] = (changes, areaName) => {
      if (areaName !== "local") return;
      if (
        Object.prototype.hasOwnProperty.call(changes, EXT_STORAGE_KEYS.extToken)
      ) {
        evaluateSession();
      }
    };

    evaluateSession();
    chromeApi.storage.onChanged.addListener(listener);

    return () => {
      cancelled = true;
      chromeApi.storage.onChanged.removeListener(listener);
    };
  }, []);

  useEffect(() => {
    const chromeApi = (
      globalThis as typeof globalThis & {
        chrome?: typeof chrome;
      }
    ).chrome;

    if (!chromeApi?.storage?.local) {
      setTutorialStatus("done");
      return;
    }

    let cancelled = false;

    chromeApi.storage.local
      .get(TUTORIAL_STORAGE_KEY)
      .then((result) => {
        if (cancelled) return;
        setTutorialStatus(result?.[TUTORIAL_STORAGE_KEY] ? "done" : "pending");
      })
      .catch(() => {
        if (!cancelled) {
          setTutorialStatus("done");
        }
      });

    const listener: Parameters<
      typeof chrome.storage.onChanged.addListener
    >[0] = (changes, areaName) => {
      if (areaName !== "local") return;
      if (Object.prototype.hasOwnProperty.call(changes, TUTORIAL_STORAGE_KEY)) {
        const nextValue = changes[TUTORIAL_STORAGE_KEY].newValue;
        setTutorialStatus(nextValue ? "done" : "pending");
      }
    };

    chromeApi.storage.onChanged.addListener(listener);

    return () => {
      cancelled = true;
      chromeApi.storage.onChanged.removeListener(listener);
    };
  }, []);

  useEffect(() => {
    const current = getCurrentDetection();
    if (current) setDetection(current);
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<DetectionResult | null>).detail;
      setDetection(detail ?? null);
    };
    document.addEventListener("applyai:detection", handler as EventListener);
    return () => {
      document.removeEventListener(
        "applyai:detection",
        handler as EventListener,
      );
    };
  }, [setDetection]);

  useEffect(() => {
    let nextMode: PanelMode;
    if (sessionState === "unknown") {
      nextMode = "loading";
    } else if (sessionState === "loggedOut") {
      nextMode = "loggedOut";
    } else if (profileStatus === "pending") {
      nextMode = "loading";
    } else if (!profile) {
      nextMode = "zeroData";
    } else {
      nextMode = "ready";
    }

    if (nextMode !== mode) {
      setMode(nextMode);
    }
  }, [mode, profile, profileStatus, sessionState, setMode]);

  const jobUrl = pinnedJobUrl ?? detection?.url ?? null;

  const jobRecordQuery = useJobRecord(jobUrl);
  const savedJobsQuery = useSavedJobs();
  const timelineQuery = useTimeline(120);
  const analyzeMutation = useAnalyzeJob();
  const saveJobMutation = useSaveJob();
  const updateStageMutation = useUpdateStage();
  const currentDomain = useMemo(() => {
    if (!jobUrl) return null;
    try {
      return new URL(jobUrl).hostname;
    } catch {
      return null;
    }
  }, [jobUrl]);
  const autoApplyToggle = useDomainAutoApply(currentDomain);
  const tutorialSteps = useMemo<CoachMarkStep[]>(
    () => [
      {
        id: "analyze",
        selector: '[data-coachmark-target="analyze"]',
        title: "Analyze any job post",
        description:
          "Get an instant ATS match score and see the keywords you still need.",
      },
      {
        id: "autofill",
        selector: '[data-coachmark-target="autofill"]',
        title: "Autofill applications",
        description:
          "ApplyAI maps your profile to each form so you can submit in seconds.",
      },
      {
        id: "my-jobs",
        selector: '[data-coachmark-target="my-jobs-tab"]',
        title: "Track every application",
        description:
          "Use My Jobs to keep stages, notes, and timelines organised automatically.",
      },
    ],
    [],
  );

  useEffect(() => {
    if (jobRecordQuery.data?.matchScore) {
      setAnalysisStatus("ready");
    }
  }, [jobRecordQuery.data?.matchScore, setAnalysisStatus]);

  const footerQuota = useMemo(
    () => ({
      analyses: detection?.plan?.monthlyLimit
        ? Math.max(
            detection.plan.monthlyLimit - (detection.plan.monthlyUsed ?? 0),
            0,
          )
        : null,
      autofills: null,
    }),
    [detection?.plan?.monthlyLimit, detection?.plan?.monthlyUsed],
  );

  const jobTitle =
    detection?.fields.title ?? jobRecordQuery.data?.title ?? "Role";
  const jobCompany =
    detection?.fields.company ?? jobRecordQuery.data?.company ?? "Company";
  const jobDescription = detection?.fields.description ?? "";

  const jobRecord = jobRecordQuery.data ?? null;
  const isSaved = Boolean(jobRecord?.savedAt);
  const jobStage: JobStage = jobRecord?.stage ?? "saved";
  const isAnalyzed = Boolean(jobRecord?.matchScore);
  const jobMissing = jobRecord?.missingKeywords ?? [];
  const atsScore = jobRecord?.matchScore ?? null;

  const handleAnalyze = async () => {
    if (!jobUrl || !jobDescription) {
      return;
    }
    setAnalysisStatus("pending");
    chrome.runtime
      .sendMessage({
        type: "applyai.action.state",
        payload: { state: "loading" },
      })
      .catch(() => {});
    try {
      await analyzeMutation.mutateAsync({
        url: jobUrl,
        jdHtmlOrText: jobDescription,
        title: jobTitle,
        company: jobCompany,
        resumeText: profile?.resumeText ?? "",
        plan: detection?.plan,
      });
      setAnalysisStatus("ready");
      chrome.runtime
        .sendMessage({
          type: "applyai.action.state",
          payload: { state: "detected" },
        })
        .catch(() => {});
    } catch (error) {
      console.error("Analyze job failed", error);
      setAnalysisStatus("error");
      chrome.runtime
        .sendMessage({
          type: "applyai.action.state",
          payload: { state: "default" },
        })
        .catch(() => {});
    }
  };

  const handleSave = async () => {
    if (!jobUrl) return;
    await saveJobMutation.mutateAsync({
      url: jobUrl,
      title: jobTitle,
      company: jobCompany,
      matchScore: jobRecord?.matchScore ?? 0,
      missingKeywords: jobRecord?.missingKeywords ?? [],
      topSkills: jobRecord?.topSkills ?? [],
      bullets: jobRecord?.bullets ?? [],
      coverNote: jobRecord?.coverNote ?? "",
      savedAt: Date.now(),
      stage: "saved",
    });
  };

  const handleStageChange = (value: string) => {
    if (!jobUrl) return;
    updateStageMutation.mutate({ url: jobUrl, stage: value as JobStage });
  };

  const handleAvatarClick = () => {
    setSurface("settings");
  };

  const handleClose = () => {
    setOpen(false);
  };

  const jobList = useMemo(
    () =>
      (savedJobsQuery.data ?? []).map((job) => ({
        id: job.url,
        title: job.title ?? "Untitled role",
        company: job.company ?? "Unknown company",
        stage: job.stage ?? "saved",
        savedAt: job.savedAt ?? job.updatedAt,
        url: job.url,
      })),
    [savedJobsQuery.data],
  );

  useEffect(() => {
    if (selectedJobId && !jobList.some((job) => job.id === selectedJobId)) {
      setSelectedJobId(null);
    }
  }, [jobList, selectedJobId]);

  const selectedJob = useMemo(() => {
    if (!selectedJobId) return null;
    return jobList.find((job) => job.id === selectedJobId) ?? null;
  }, [jobList, selectedJobId]);

  const filteredTimeline = useMemo(() => {
    const base = timelineQuery.events ?? [];
    const horizon = timelineFilter === "7d" ? 7 : 30;
    const cutoff = Date.now() - horizon * 24 * 60 * 60 * 1000;
    return base.filter((event) => event.timestamp >= cutoff);
  }, [timelineFilter, timelineQuery.events]);

  const selectedJobTimeline = useMemo(() => {
    if (!selectedJobId) return [];
    return (timelineQuery.events ?? []).filter(
      (event) => event.url === selectedJobId,
    );
  }, [selectedJobId, timelineQuery.events]);

  const isZeroDataMode = mode === "zeroData";
  const tutorialVisible =
    tutorialStatus === "pending" &&
    mode === "ready" &&
    isOpen &&
    !isZeroDataMode &&
    !!jobUrl &&
    analysisStatus !== "pending";
  const effectiveTutorialStep = Math.min(
    tutorialStep,
    Math.max(tutorialSteps.length - 1, 0),
  );

  useEffect(() => {
    if (!tutorialVisible) {
      setTutorialStep(0);
    }
  }, [tutorialVisible]);

  const markTutorialDone = useCallback(() => {
    setTutorialStatus("done");
    const chromeApi = (
      globalThis as typeof globalThis & {
        chrome?: typeof chrome;
      }
    ).chrome;
    if (chromeApi?.storage?.local) {
      chromeApi.storage.local
        .set({ [TUTORIAL_STORAGE_KEY]: true })
        .catch(() => {});
    }
  }, []);

  const handleTutorialNext = useCallback(() => {
    setTutorialStep((prev) => {
      if (prev >= tutorialSteps.length - 1) {
        markTutorialDone();
        return prev;
      }
      return prev + 1;
    });
  }, [markTutorialDone, tutorialSteps.length]);

  const handleTutorialSkip = useCallback(() => {
    markTutorialDone();
  }, [markTutorialDone]);

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-y-0 right-0 z-2147483640 flex w-[380px] max-w-[420px] translate-x-full transition-transform duration-300 ease-out",
        isOpen && "pointer-events-auto translate-x-0",
      )}
    >
      <div
        ref={panelRef}
        className="applyai-theme relative flex h-full w-full flex-col bg-background shadow-2xl ring-1 ring-black/10"
      >
        <PanelHeader
          name={
            profile?.contact.fullName ?? profile?.contact.preferredName ?? "You"
          }
          email={profile?.contact.email ?? undefined}
          onAvatarClick={handleAvatarClick}
          onClose={handleClose}
        />

        <div className="flex-1 overflow-hidden">
          {surface === "settings" ? (
            <SettingsRoot
              email={profile?.contact.email ?? "unknown@app.ai"}
              planLabel="ApplyAI Trial"
              onLogout={() => {}}
              autoApplyMappings={autoApplyToggle.autoApply}
              autoApplyDisabled={
                autoApplyToggle.isLoading || autoApplyToggle.isUpdating
              }
              onToggleAutoApply={(next) => autoApplyToggle.toggle(next)}
              onBack={() => setSurface("main")}
            />
          ) : mode === "loggedOut" ? (
            <LoggedOutState
              onLogin={() => openWebApp("/login?utm_source=applyai-extension")}
              onSignup={() =>
                openWebApp("/onboarding?utm_source=applyai-extension")
              }
            />
          ) : (
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as PanelTab)}
              className="flex h-full flex-col"
            >
              <div className="px-4 pt-3">
                <TabsList className="grid h-10 w-full grid-cols-4">
                  <TabsTrigger value="job">Job</TabsTrigger>
                  <TabsTrigger
                    value="my-jobs"
                    data-coachmark-target="my-jobs-tab"
                  >
                    My Jobs
                  </TabsTrigger>
                  <TabsTrigger value="answers">Answers</TabsTrigger>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                </TabsList>
              </div>
              {surface === "main" ? (
                <ScrollArea className="flex-1 px-4 pb-4">
                  <div className="pb-16">
                    <TabsContent value="job" className="mt-4">
                      <JobTab
                        jobTitle={jobTitle}
                        company={jobCompany}
                        atsScore={atsScore}
                        missingKeywords={jobMissing}
                        resumeMatch={atsScore}
                        isAnalyzed={isAnalyzed}
                        isSaved={isSaved}
                        stage={jobStage}
                        onAnalyze={handleAnalyze}
                        onSave={handleSave}
                        onAutofill={() => setAutofillStatus("pending")}
                        onCancelAutofill={() => setAutofillStatus("idle")}
                        onStageChange={handleStageChange}
                        loading={
                          analysisStatus === "pending" ||
                          analyzeMutation.isPending ||
                          saveJobMutation.isPending ||
                          updateStageMutation.isPending
                        }
                        autofillStatus={autofillStatus}
                        showCreateProfileCta={isZeroDataMode}
                        onCreateProfile={() =>
                          openWebApp("/onboarding?utm_source=applyai-extension")
                        }
                      />
                    </TabsContent>
                    <TabsContent value="my-jobs" className="mt-4">
                      <MyJobsTab
                        jobs={jobList}
                        loading={savedJobsQuery.isLoading}
                        query={jobsQuery}
                        onQueryChange={setJobsQuery}
                        onSelectJob={(id) => {
                          setSelectedJobId((prev) => (prev === id ? null : id));
                          setPinnedJobUrl(id);
                        }}
                        onStageChange={(id, stage) =>
                          updateStageMutation.mutate({ url: id, stage })
                        }
                        onOpenJob={(url) => {
                          window.open(url, "_blank", "noopener,noreferrer");
                        }}
                        selectedJob={selectedJob}
                        selectedJobTimeline={selectedJobTimeline}
                        onCloseDetail={() => setSelectedJobId(null)}
                      />
                    </TabsContent>
                    <TabsContent value="answers" className="mt-4">
                      <AnswersTab
                        suggestions={mockTemplates}
                        onGenerate={async (prompt) =>
                          `Generated answer for:\n\n${prompt}`
                        }
                        onInsert={() => {}}
                        loading={false}
                      />
                    </TabsContent>
                    <TabsContent value="timeline" className="mt-4">
                      <TimelineTab
                        events={filteredTimeline.map((event) => ({
                          id: event.id,
                          type: event.type,
                          title: event.title,
                          url: event.url,
                          timestamp: event.timestamp,
                        }))}
                        loading={timelineQuery.isLoading}
                        filter={timelineFilter}
                        onFilterChange={setTimelineFilter}
                      />
                    </TabsContent>
                  </div>
                </ScrollArea>
              ) : null}
            </Tabs>
          )}
        </div>

        <PanelFooter
          analysesLeft={footerQuota.analyses}
          autofillsLeft={footerQuota.autofills}
          onUpgrade={() => {}}
        />

        {tutorialVisible ? (
          <CoachMarks
            panelRef={panelRef}
            steps={tutorialSteps}
            currentStep={effectiveTutorialStep}
            visible={tutorialVisible}
            onNext={handleTutorialNext}
            onSkip={handleTutorialSkip}
          />
        ) : null}
      </div>
    </div>
  );
}

function LoggedOutState({
  onLogin,
  onSignup,
}: {
  onLogin: () => void;
  onSignup: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <h2 className="text-lg font-semibold text-foreground">
        Welcome to ApplyAI
      </h2>
      <p className="text-sm text-muted-foreground">
        Sign in to analyze jobs, autofill applications, and track your search in
        one place.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onLogin}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
        >
          Log in
        </button>
        <button
          type="button"
          onClick={onSignup}
          className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
        >
          Create account
        </button>
      </div>
    </div>
  );
}
