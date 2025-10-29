import { Scored } from "../../types/onboarding.types";
import { uniq } from "../../utils/text";

const taxonomyDefault: Record<string, string[]> = {
  languages: ["JavaScript", "TypeScript", "Python", "Java", "C++", "Go"],
  frameworks: [
    "React",
    "Angular",
    "Vue",
    "Node.js",
    "Express",
    "Django",
    "Spring",
  ],
  cloud: ["AWS", "Azure", "GCP", "Lambda", "EC2", "S3", "Kubernetes"],
  devops: [
    "Docker",
    "Kubernetes",
    "Jenkins",
    "GitHub Actions",
    "ArgoCD",
    "Terraform",
  ],
  databases: ["MySQL", "PostgreSQL", "MongoDB", "Redis", "SQLite"],
  testing: ["Jest", "Cypress", "Playwright", "Karma", "Jasmine"],
  tools: ["Git", "Figma", "Jira", "Bash", "Linux"],
};

export function extractSkills(
  text: string,
  taxonomy?: Record<string, string[]>,
): { raw: Scored<string[]>; categorized: Scored<Record<string, string[]>> } {
  const tax = taxonomy || (taxonomyDefault as Record<string, string[]>);
  const lower = text.toLowerCase();

  const found: string[] = [];
  for (const list of Object.values(tax)) {
    for (const skill of list) {
      const s = skill.toLowerCase();
      const re = new RegExp(
        `(?<![A-Za-z0-9])${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![A-Za-z0-9])`,
        "i",
      );
      if (re.test(lower)) found.push(skill);
    }
  }
  const raw = uniq(found).sort();

  // Categorize
  const categorized: Record<string, string[]> = {};
  for (const [cat, list] of Object.entries(tax)) {
    const inter = list.filter((s) => raw.includes(s));
    if (inter.length) categorized[cat] = inter.sort();
  }

  return {
    raw: { value: raw, confidence: raw.length ? 0.9 : 0, source: "rule" },
    categorized: {
      value: categorized,
      confidence: Object.keys(categorized).length ? 0.9 : 0,
      source: "rule",
    },
  };
}
