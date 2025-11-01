import { makeDetector, buildExtractor, presenceSignatureScore } from "./common";
import type { Detector } from "../detect/types";

const sels = {
  title: [".posting-headline h2", ".title h2", "h2", "h1"],
  company: [".company-name", 'meta[property="og:site_name"]'],
  location: [
    ".posting-categories .location",
    ".location",
    '[data-qa="job-location"]',
  ],
  description: [".section.page.full-width .content", ".content", "#content"],
  applyUrl: [
    'a[href*="#application"]',
    'a[href*="/apply"]',
    "a.posting-apply-button",
  ],
  postingDate: ["time[datetime]"],
};

const Lever: Detector = makeDetector({
  id: "lever",
  urlMatch: (u) =>
    /(?:^|\.)lever\.co$/i.test(u.hostname) ||
    /jobs\.lever\.co/i.test(u.hostname),
  isJobDetail: ({ doc }) =>
    !!(
      doc.querySelector(".posting-headline") ||
      doc.querySelector(".posting-categories")
    ),
  extract: buildExtractor(sels),
  signatureScore: (ctx) => presenceSignatureScore(ctx, sels),
});

export default Lever;
