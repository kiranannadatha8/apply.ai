import { makeDetector, buildExtractor, presenceSignatureScore } from "./common";

const sels = {
  title: [
    'h1[id*="RequisitionDescription"]',
    "h1",
    "#requisitionDescriptionInterface\\.reqTitleLinkAction\\:row",
    ".oracletaleocwsv2-accordion h1",
  ],
  company: ['meta[property="og:site_name"]'],
  location: [
    'span[id*="Location"]',
    ".location",
    'td[id*="requisitionDescriptionLocationRow"]',
  ],
  description: [
    'div[id*="requisitionDescriptionInterface"]',
    "#desc",
    "div.oracletaleocwsv2-accordion",
  ],
  applyUrl: ['a[id*="applyButton"]', 'a[href*="apply"]'],
  postingDate: ["time[datetime]"],
};

const Taleo = makeDetector({
  id: "taleo",
  urlMatch: (u) =>
    /taleo\.net/i.test(u.hostname) || /oraclecloud\.com/i.test(u.hostname),
  isJobDetail: ({ doc }) =>
    !!(
      doc.querySelector('div[id*="requisitionDescriptionInterface"]') ||
      doc.querySelector("h1")
    ),
  extract: buildExtractor(sels),
  signatureScore: (ctx) => presenceSignatureScore(ctx, sels),
});

export default Taleo;
