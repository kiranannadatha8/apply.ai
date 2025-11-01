import { makeDetector, buildExtractor, presenceSignatureScore } from "./common";

const sels = {
  title: ["#jobTitle", "h1", ".job-title"],
  company: ["#companyName", ".company-name", 'meta[property="og:site_name"]'],
  location: ["#jobLocation", ".location", '[data-testid="job-location"]'],
  description: ["#jobDescriptionText", ".job-description", "article"],
  applyUrl: ['a[data-qa="apply-button"]', 'a[href*="/apply"]'],
  postingDate: ["time[datetime]"],
};

const SmartRecruiters = makeDetector({
  id: "smartrecruiters",
  urlMatch: (u) => /smartrecruiters\.com/i.test(u.hostname),
  isJobDetail: ({ doc }) =>
    !!(
      doc.querySelector("#jobTitle") || doc.querySelector("#jobDescriptionText")
    ),
  extract: buildExtractor(sels),
  signatureScore: (ctx) => presenceSignatureScore(ctx, sels),
});

export default SmartRecruiters;
