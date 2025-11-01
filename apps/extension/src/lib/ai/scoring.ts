// Local ATS-style matching: fast, explainable scoring to keep P95 <5s.

export interface MatchInput {
  jdRequired: string[]; // normalized keywords from JD requirements
  jdNice: string[]; // normalized keywords from JD nice-to-haves
  profileKeywords: string[]; // normalized keywords mined from user's resume/profile
}
export interface MatchOutput {
  score: number; // 0..100
  missing: string[]; // required/NTH terms not found in profile
  topSkills: string[]; // best-overlap terms sorted by weight
  detail: {
    reqHit: number;
    reqTotal: number;
    nthHit: number;
    nthTotal: number;
  };
}

export function computeMatch({
  jdRequired,
  jdNice,
  profileKeywords,
}: MatchInput): MatchOutput {
  const prof = new Set(profileKeywords);

  let reqHit = 0;
  const missing: string[] = [];
  for (const k of jdRequired) {
    if (prof.has(k)) reqHit++;
    else missing.push(k);
  }
  let nthHit = 0;
  for (const k of jdNice) {
    if (prof.has(k)) nthHit++;
    else missing.push(k);
  }

  const reqTotal = Math.max(1, jdRequired.length);
  const nthTotal = Math.max(1, jdNice.length);

  // Weighted score: req 80%, nice 20%
  const reqScore = reqHit / reqTotal;
  const nthScore = nthHit / nthTotal;

  const score = Math.round((reqScore * 0.8 + nthScore * 0.2) * 100);

  // Top skills = intersection ranked by a simple heuristic (shorter tokens later)
  const top = [...prof].filter(
    (k) => jdRequired.includes(k) || jdNice.includes(k),
  );
  top.sort((a, b) => {
    const aw = (jdRequired.includes(a) ? 2 : 1) + (a.length <= 4 ? 0 : 0.1);
    const bw = (jdRequired.includes(b) ? 2 : 1) + (b.length <= 4 ? 0 : 0.1);
    return bw - aw;
  });

  return {
    score,
    missing: Array.from(new Set(missing)),
    topSkills: top.slice(0, 10),
    detail: { reqHit, reqTotal, nthHit, nthTotal },
  };
}

export function normalizeKeywordsFromText(text: string): string[] {
  return text
    .replace(/[()/:,;|]/g, " ")
    .replace(/\s+/g, " ")
    .split(" ")
    .map((t) => t.toLowerCase().replace(/[^a-z0-9+#.\-]/g, ""))
    .filter((t) => t.length > 2);
}
