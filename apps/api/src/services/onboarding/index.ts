import { ResumeParseResult, Scored } from "../../types/onboarding.types";
import { sha256, toLines } from "../../utils/text";
import { fileTypeFromBuffer } from "file-type";
import {
  extractTextFromDocx,
  extractTextFromPdf,
  extractTextFromTxt,
} from "./extractText";
import {
  extractEmail,
  extractLinks,
  extractLocation,
  extractName,
  extractPhone,
} from "./contactExtractor";
import { refineName } from "./nameExtractor";
import { detectSections } from "./sectionDetector";
import { splitIntoBlocks } from "./blockSegmenter";
import { extractExperience } from "./experienceExtractor";
import { extractEducation } from "./educationExtractor";
import { extractSkills } from "./skillsExtractor";
import { extractProjects } from "./projectExtractor";

async function detectMime(
  input: Buffer,
  fallback = "application/octet-stream",
) {
  const t = await fileTypeFromBuffer(input);
  return t?.mime || fallback;
}

export async function parseResumeFn(
  input: Buffer | string,
  filename?: string,
): Promise<ResumeParseResult> {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const hash = sha256(buf);
  const mime = await detectMime(
    buf,
    filename?.endsWith(".docx")
      ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      : "application/pdf",
  );

  let text = "";
  let pageCount: number | undefined;

  if (mime.includes("pdf")) {
    const res = await extractTextFromPdf(buf);
    text = res.text;
    pageCount = res.pageCount;
  } else if (mime.includes("wordprocessingml")) {
    const res = await extractTextFromDocx(buf);
    text = res.text;
  } else if (mime.includes("text") || filename?.endsWith(".txt")) {
    const res = await extractTextFromTxt(buf);
    text = res.text;
  } else {
    // Fallback try PDF parse
    const res = await extractTextFromPdf(buf);
    text = res.text;
    pageCount = res.pageCount;
  }

  const lines = toLines(text);

  console.log("lines", lines);

  // Contact & top matter
  const email = extractEmail(text);
  console.log("email", email);
  const phone = extractPhone(text);
  console.log("phone", phone);
  const links = extractLinks(text);
  console.log("links", links);
  const location = extractLocation(text);
  console.log("location", location);
  let name = refineName(extractName(text, email.value || undefined));
  console.log("name", name);

  // Sections
  const sections = detectSections(lines);
  console.log("sections", sections);

  // Experience
  const expSpan = sections.find((s) => s.name === "experience");
  const expLines = expSpan
    ? lines.slice(expSpan.startLine + 1, expSpan.endLine)
    : lines; // fallback to whole doc
  const expBlocks = splitIntoBlocks(expLines);
  const experience = extractExperience(expBlocks);

  // Education
  const eduSpan = sections.find((s) => s.name === "education");
  const eduLines = eduSpan
    ? lines.slice(eduSpan.startLine + 1, eduSpan.endLine)
    : [];
  const education = extractEducation(eduLines);

  // Projects

  const projSpan = sections.find((s) => s.name === "projects");
  const projLines = projSpan
    ? lines.slice(projSpan.startLine + 1, projSpan.endLine)
    : [];
  const projBlocks = splitIntoBlocks(projLines);
  const projects = extractProjects(projBlocks);

  // Skills
  const skillSpan = sections.find((s) => s.name === "skills");
  const skillText = skillSpan
    ? lines.slice(skillSpan.startLine, skillSpan.endLine).join("\n")
    : text;
  const skills = extractSkills(skillText);

  // Summary
  const summarySpan = sections.find((s) => s.name === "summary");
  const summaryText = summarySpan
    ? lines.slice(summarySpan.startLine + 1, summarySpan.endLine).join(" ")
    : "";
  const summary: Scored<string> = {
    value: summaryText || null,
    confidence: summaryText ? 0.5 : 0,
    source: "rule",
  };

  // Warnings & errors
  const warnings: string[] = [];
  if (!email.value) warnings.push("Email not detected.");
  if (!phone.value) warnings.push("Phone not detected.");
  if (!experience.length) warnings.push("Experience section not detected.");
  if (!education.length) warnings.push("Education section not detected.");
  if (!projects.length) warnings.push("Projects section not detected.");
  if (!skills.raw.value?.length) warnings.push("Skills section not detected.");
  if (!summary.value) warnings.push("Summary section not detected.");

  const result: ResumeParseResult = {
    meta: {
      fileType: mime,
      pageCount,
      ocrUsed: false,
      sha256: hash,
    },
    contact: { name, email, phone, links, location },
    sections,
    experience,
    education,
    projects,
    skills,
    summary,
    warnings,
    errors: [],
  };
  return result;
}
