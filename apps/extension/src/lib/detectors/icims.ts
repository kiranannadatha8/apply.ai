import { makeDetector, buildExtractor, presenceSignatureScore } from "./common";

const sels = {
  title: ["h1", ".job-title", "#job-title"],
  company: ['meta[property="og:site_name"]', ".company-name"],
  location: [".location", "#job-location", '[data-testid="job-location"]'],
  description: ["#job_description", ".job-description", "article"],
  applyUrl: ["a#apply", 'a[href*="apply"]'],
  postingDate: ["time[datetime]"],
};

const ICIMS = makeDetector({
  id: "icims",
  urlMatch: (u) => /icims\.com/i.test(u.hostname),
  isJobDetail: ({ doc }) =>
    !!(
      doc.querySelector("#job_description") ||
      doc.querySelector(".job-description")
    ),
  extract: buildExtractor(sels),
  signatureScore: (ctx) => presenceSignatureScore(ctx, sels),
});

export default ICIMS;
