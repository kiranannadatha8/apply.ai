import { makeDetector, buildExtractor, presenceSignatureScore } from "./common";

const sels = {
  title: ["#positionTitle", "h1", ".jobTitle"],
  company: ['meta[property="og:site_name"]'],
  location: ["#positionLocation", ".location", '[data-testid="job-location"]'],
  description: ["#positionDescription", "#content", "article"],
  applyUrl: ["a#applyButton", 'a[href*="apply"]'],
  postingDate: ["time[datetime]"],
};

const BambooHR = makeDetector({
  id: "bamboohr",
  urlMatch: (u) => /bamboohr\.com/i.test(u.hostname),
  isJobDetail: ({ doc }) =>
    !!(
      doc.querySelector("#positionTitle") ||
      doc.querySelector("#positionDescription")
    ),
  extract: buildExtractor(sels),
  signatureScore: (ctx) => presenceSignatureScore(ctx, sels),
});

export default BambooHR;
