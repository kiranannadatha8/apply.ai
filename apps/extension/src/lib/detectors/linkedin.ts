import { makeDetector, buildExtractor, presenceSignatureScore } from "./common";

const sels = {
  title: ["h1", "[data-test-job-header-title]", ".top-card-layout__title"],
  company: [
    'a[href*="/company/"]',
    ".top-card-layout__second-subline a",
    'meta[property="og:site_name"]',
  ],
  location: [
    ".top-card-layout__first-subline",
    "[data-test-job-country",
    ".jobs-unified-top-card__primary-description span",
  ],
  description: [
    ".show-more-less-html__markup",
    "article",
    '[data-test="job-details"]',
  ],
  applyUrl: [
    'a[href*="apply"]',
    'a[aria-label*="Apply"]',
    "a.jobs-apply-button",
  ],
  postingDate: ["time[datetime]"],
};

const LinkedIn = makeDetector({
  id: "linkedin",
  urlMatch: (u) =>
    /linkedin\.com/i.test(u.hostname) && /\/jobs\/view\//i.test(u.pathname),
  isJobDetail: ({ doc }) =>
    !!(
      doc.querySelector(".show-more-less-html__markup") ||
      doc.querySelector("[data-test-job-header-title]")
    ),
  extract: buildExtractor(sels),
  signatureScore: (ctx) => presenceSignatureScore(ctx, sels),
});

export default LinkedIn;
