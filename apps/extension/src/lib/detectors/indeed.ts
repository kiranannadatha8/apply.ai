import { makeDetector, buildExtractor, presenceSignatureScore } from "./common";

const sels = {
  title: ["h1.jobsearch-JobInfoHeader-title", "h1 span", "h1"],
  company: [
    "div.jobsearch-CompanyInfoContainer a",
    '[data-testid="inlineHeader-companyName"]',
    'meta[property="og:site_name"]',
  ],
  location: [
    "div.jobsearch-CompanyInfoContainer div",
    '[data-testid="inlineHeader-companyLocation"]',
    ".jobsearch-JobInfoHeader-subtitle div:nth-child(2)",
  ],
  description: [
    "#jobDescriptionText",
    '[data-testid="jobDescriptionText"]',
    "article",
  ],
  applyUrl: ['a[href*="apply"]', 'a[aria-label*="Apply"]'],
  postingDate: ["time[datetime]"],
};

const Indeed = makeDetector({
  id: "indeed",
  urlMatch: (u) => /indeed\./i.test(u.hostname) && /viewjob/i.test(u.pathname),
  isJobDetail: ({ doc }) =>
    !!(
      doc.querySelector("#jobDescriptionText") ||
      doc.querySelector(".jobsearch-JobInfoHeader-title")
    ),
  extract: buildExtractor(sels),
  signatureScore: (ctx) => presenceSignatureScore(ctx, sels),
});

export default Indeed;
