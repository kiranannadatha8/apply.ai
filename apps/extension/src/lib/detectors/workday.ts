import { makeDetector, buildExtractor, presenceSignatureScore } from "./common";

const sels = {
  title: [
    '[data-automation-id="jobPostingHeader"] h1',
    '[data-automation-id="jobPostingHeader"] h2',
    '[data-automation-id="jobPostingTitle"]',
    "h1",
  ],
  company: ['[data-automation-id="company"]', 'meta[property="og:site_name"]'],
  location: [
    '[data-automation-id="locations"]',
    '[data-automation-id="jobPostingInfo"] [data-automation-id="locations"]',
    ".css-1gty6cv", // fallback
  ],
  description: [
    '[data-automation-id="richTextDescription"]',
    '[data-automation-id="jobPostingDescription"]',
    "#job-description-container",
  ],
  applyUrl: [
    'a[data-automation-id="applyButton"]',
    'a[href*="Apply"]',
    'a[aria-label*="Apply"]',
  ],
  postingDate: ["time[datetime]", '[data-automation-id="listedDate"] time'],
};

const Workday = makeDetector({
  id: "workday",
  urlMatch: (u) =>
    /workday/i.test(u.hostname) || /myworkdayjobs\.com/i.test(u.toString()),
  isJobDetail: ({ doc }) =>
    !!(
      doc.querySelector('[data-automation-id="jobPostingHeader"]') ||
      doc.querySelector('[data-automation-id="richTextDescription"]')
    ),
  extract: buildExtractor(sels),
  signatureScore: (ctx) => presenceSignatureScore(ctx, sels),
});

export default Workday;
