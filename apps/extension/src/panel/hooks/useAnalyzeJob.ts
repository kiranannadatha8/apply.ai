import { useMutation, useQueryClient } from "@tanstack/react-query";
import { normalizeJD } from "@/lib/ai/normalizer";
import {
  computeMatch,
  normalizeKeywordsFromText,
} from "@/lib/ai/scoring";
import { generateSuggestions } from "@/lib/ai/provider";
import {
  saveJobRecord,
  type JobAnalysisRecord,
} from "@/lib/storage/jobStore";
import { logTimelineEvent } from "@/lib/storage/timelineStore";
import { emitAnalysisTelemetry } from "@/lib/telemetry-analysis";

export interface AnalyzeJobInput {
  url: string;
  jdHtmlOrText: string;
  title?: string;
  company?: string;
  resumeText?: string;
  plan?: { metered?: boolean; monthlyLimit?: number; monthlyUsed?: number };
}

export interface AnalyzeJobResult {
  record: JobAnalysisRecord;
  missingKeywords: string[];
  topSkills: string[];
  score: number;
}

function safeDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

export function useAnalyzeJob() {
  const qc = useQueryClient();
  return useMutation<AnalyzeJobResult, Error, AnalyzeJobInput>({
    mutationFn: async (input) => {
      const started = performance.now();
      const jd = normalizeJD(input.jdHtmlOrText, input.title, input.company);
      const resumeText = (input.resumeText ?? "").slice(0, 20000);
      const profileKw = normalizeKeywordsFromText(resumeText);
      const reqKw = jd.requirements.flatMap(normalizeKeywordsFromText);
      const nthKw = jd.niceToHaves.flatMap(normalizeKeywordsFromText);
      const match = computeMatch({
        jdRequired: reqKw,
        jdNice: nthKw,
        profileKeywords: profileKw,
      });

      const ai = await generateSuggestions(
        {
          jd: {
            title: jd.titleGuess ?? input.title,
            company: jd.companyGuess ?? input.company,
            responsibilities: jd.responsibilities,
            requirements: jd.requirements,
            niceToHaves: jd.niceToHaves,
          },
          profile: { resumeText },
          matchScore: match.score,
          missingKeywords: match.missing,
          topSkills: match.topSkills,
        },
        {
          aiEndpoint: undefined,
          timeoutMs: 3200,
          metered: input.plan?.metered,
        },
      );

      const record = await saveJobRecord({
        url: input.url,
        title: input.title ?? jd.titleGuess,
        company: input.company ?? jd.companyGuess,
        matchScore: match.score,
        missingKeywords: match.missing,
        topSkills: match.topSkills,
        bullets: ai.bullets,
        coverNote: ai.coverNote,
        tokens: {
          in: ai.usage.tokensIn,
          out: ai.usage.tokensOut,
          model: ai.usage.model,
        },
        updatedAt: Date.now(),
      });

      await logTimelineEvent({
        type: "analyzed",
        title: record.title ?? record.url,
        url: record.url,
        metadata: { score: match.score },
      });

      await emitAnalysisTelemetry({
        kind: "job_analysis_v1",
        url: input.url,
        domain: safeDomain(input.url),
        latencyMs: Math.round(performance.now() - started),
        tokensIn: ai.usage.tokensIn,
        tokensOut: ai.usage.tokensOut,
        model: ai.usage.model,
        score: match.score,
        reqHit: match.detail.reqHit,
        reqTotal: match.detail.reqTotal,
        nthHit: match.detail.nthHit,
        nthTotal: match.detail.nthTotal,
        ts: Date.now(),
      });

      return {
        record,
        missingKeywords: match.missing,
        topSkills: match.topSkills,
        score: match.score,
      };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["job-record", res.record.url] });
      qc.invalidateQueries({ queryKey: ["job-records"] });
      qc.invalidateQueries({ queryKey: ["timeline-events"] });
    },
  });
}
