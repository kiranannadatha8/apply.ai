import { makeDetector, buildExtractor, presenceSignatureScore } from "./common";

const sels = {
  title: ["h1", '[data-testid*="JobPostingHeader"] h1', "header h1"],
  company: ['meta[property="og:site_name"]'],
  location: [
    '[data-testid*="JobPostingHeader"] [data-testid*="Location"]',
    'section [aria-label*="Location"]',
    ".location",
  ],
  description: ['[data-testid*="JobDescription"]', "article", "#content"],
  applyUrl: ['a[href*="apply"]', 'a[aria-label*="Apply"]'],
  postingDate: ["time[datetime]"],
};

const Ashby = makeDetector({
  id: "ashby",
  urlMatch: (u) =>
    /ashbyhq\.com/i.test(u.hostname) || /jobs\.ashbyhq\.com/i.test(u.hostname),
  isJobDetail: ({ doc }) =>
    !!(
      doc.querySelector('[data-testid*="JobPostingHeader"]') ||
      doc.querySelector("article")
    ),
  extract: buildExtractor(sels),
  signatureScore: (ctx) => presenceSignatureScore(ctx, sels),
});

export default Ashby;
