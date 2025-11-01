import { makeDetector, buildExtractor, presenceSignatureScore } from "./common";
import type { Detector } from "../detect/types";

const sels = {
  title: ["h1", ".opening h1", ".app-title", '[data-qa="job-title"]'],
  company: [
    'meta[property="og:site_name"]',
    ".company-name",
    "header .title",
    ".org-name",
  ],
  location: [
    ".location",
    ".opening .location",
    ".job-location",
    '[data-qa="job-location"]',
  ],
  description: [
    ".content",
    "#content",
    ".section-wrapper",
    '[data-qa="job-description"]',
  ],
  applyUrl: [
    'a[href*="/apply"]',
    "a#apply_button",
    "a.apply",
    'a[href*="#application"]',
  ],
  postingDate: ["time[datetime]", 'meta[property="article:published_time"]'],
};

const extract = buildExtractor(sels);

const Greenhouse: Detector = makeDetector({
  id: "greenhouse",
  urlMatch: (u) =>
    /(?:^|\.)greenhouse\.io\//i.test(u.hostname) ||
    /greenhouse\.io/.test(u.toString()),
  isJobDetail: ({ doc }) =>
    !!(
      doc.querySelector(".opening") ||
      doc.querySelector('[data-qa="job-title"]') ||
      doc.querySelector("#content")
    ),
  extract,
  signatureScore: (ctx) => presenceSignatureScore(ctx, sels),
});

export default Greenhouse;
