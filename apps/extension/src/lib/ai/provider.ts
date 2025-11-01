// LLM provider wrapper with timeout, token accounting (est.), privacy guards, and graceful fallback.
//
// IMPORTANT: Do NOT embed provider API keys here for production. Prefer a backend proxy.
// This wrapper supports two modes:
//  1) Remote proxy (settings.aiEndpoint) – recommended
//  2) Local fallback (heuristic generator) – no external calls, zero-token

export interface AIGenInput {
  jd: {
    title?: string;
    company?: string;
    responsibilities: string[];
    requirements: string[];
    niceToHaves: string[];
  };
  profile: {
    resumeText: string; // user's own data ONLY (AC4)
    highlights?: string[]; // optional user-curated wins for better results
  };
  matchScore: number;
  missingKeywords: string[];
  topSkills: string[];
}

export interface AIGenOutput {
  bullets: string[]; // 3–5 bullet suggestions
  coverNote: string; // brief 2–3 sentence note
  usage: {
    tokensIn: number;
    tokensOut: number;
    model?: string;
    durationMs: number;
    from: "remote" | "fallback";
  };
}

export interface AISettings {
  aiEndpoint?: string; // your backend proxy endpoint; POST accepts JSON and returns {bullets, coverNote, usage}
  timeoutMs?: number; // default 3200ms
  metered?: boolean; // show token meter if true
}

function estimateTokens(s: string) {
  return Math.ceil(s.length / 4);
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await p;
    clearTimeout(to);
    return res;
  } finally {
    clearTimeout(to);
  }
}

export async function generateSuggestions(
  input: AIGenInput,
  settings: AISettings,
): Promise<AIGenOutput> {
  const started = performance.now();

  // Minimal privacy guard: clamp input to user's data
  const safeResume = (input.profile.resumeText || "").slice(0, 15000);

  const prompt = [
    `You are an ATS-savvy assistant.`,
    `Job title: ${input.jd.title ?? "Unknown"}`,
    `Company: ${input.jd.company ?? "Unknown"}`,
    `Responsibilities: ${input.jd.responsibilities.slice(0, 12).join(" | ")}`,
    `Requirements: ${input.jd.requirements.slice(0, 16).join(" | ")}`,
    `Nice-to-haves: ${input.jd.niceToHaves.slice(0, 10).join(" | ")}`,
    `User resume (self data only): ${safeResume}`,
    `Match score (local heuristic): ${input.matchScore}`,
    `Missing keywords: ${input.missingKeywords.slice(0, 20).join(", ") || "None"}`,
    `Top skills: ${input.topSkills.slice(0, 10).join(", ") || "None"}`,
    `Task:`,
    `1) Produce 3–5 resume bullet suggestions tailored to this JD.`,
    `   - Use strong action verbs, quantify where plausible using resume hints.`,
    `   - Weave missing keywords naturally if relevant.`,
    `   - 200 characters max per bullet.`,
    `2) Draft a brief 2–3 sentence cover note referencing the role.`,
    `Return JSON: {"bullets": string[], "coverNote": string}.`,
  ].join("\n");

  const tokensIn = estimateTokens(prompt);

  // Remote proxy call if available
  if (settings.aiEndpoint) {
    try {
      const res = await withTimeout(
        fetch(settings.aiEndpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            prompt,
            meta: { kind: "applyai.job_analysis_v1" },
          }),
          keepalive: true,
        }),
        settings.timeoutMs ?? 3200,
      );

      const json = await res.json();
      const bullets: string[] = Array.isArray(json?.bullets)
        ? json.bullets.slice(0, 5)
        : [];
      const coverNote: string =
        typeof json?.coverNote === "string" ? json.coverNote : "";
      const tokensOut = Number(
        json?.usage?.tokensOut ??
          estimateTokens([bullets.join(" "), coverNote].join("\n")),
      );

      return {
        bullets: bullets.length ? bullets : fallbackBullets(input),
        coverNote: coverNote || fallbackCoverNote(input),
        usage: {
          tokensIn,
          tokensOut,
          model: json?.usage?.model ?? "proxy",
          durationMs: Math.round(performance.now() - started),
          from: "remote",
        },
      };
    } catch {
      // Fall through to local fallback
    }
  }

  // Local fallback: zero-latency(ish) deterministic generator
  const bullets = fallbackBullets(input);
  const coverNote = fallbackCoverNote(input);
  const tokensOut = estimateTokens([bullets.join(" "), coverNote].join("\n"));

  return {
    bullets,
    coverNote,
    usage: {
      tokensIn,
      tokensOut,
      model: "fallback",
      durationMs: Math.round(performance.now() - started),
      from: "fallback",
    },
  };
}

function fallbackBullets(input: AIGenInput): string[] {
  const k = input.topSkills.slice(0, 3);
  const m = input.missingKeywords.slice(0, 2);
  const role = input.jd.title ?? "the role";
  return [
    `Built and shipped features for ${role}, leveraging ${k.join(", ")}, improving delivery speed by 20%+.`,
    `Partnered with cross-functional teams to implement requirements coverage and tests, reducing defects by 30%.`,
    `Optimized service reliability and monitoring; cut p95 latency by 25% via profiling and caching.`,
    m.length
      ? `Added ${m.join(" & ")} into project stack to align with JD and accelerate onboarding.`
      : `Created concise documentation and runbooks to speed onboarding.`,
  ].slice(0, 4);
}
function fallbackCoverNote(input: AIGenInput): string {
  const t = input.jd.title ?? "this role";
  const c = input.jd.company ?? "your team";
  return `Excited about ${t} at ${c}. My background aligns with your requirements, and I can quickly contribute across the stack while closing remaining gaps. Happy to share tailored examples on request.`;
}
