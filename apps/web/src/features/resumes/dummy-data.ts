import type { ResumeRecord } from "./types";

export const MASTER_RESUME_ID = "resume-master-01";

export const initialResumes: ResumeRecord[] = [
  {
    id: MASTER_RESUME_ID,
    kind: "master",
    name: "Master Resume",
    description:
      "Your canonical resume used as the foundation for smart variants.",
    createdAt: "2025-01-05T09:15:00.000Z",
    sections: [
      {
        id: "section-summary",
        kind: "summary",
        label: "Professional Summary",
        content: [
          "Product-focused machine learning engineer with 7+ years of experience shipping applied AI features across growth, personalization, and automation surfaces.",
          "Comfortable leading cross-functional pods, mentoring engineers, and translating ambiguous problem statements into shipped product outcomes.",
        ],
      },
      {
        id: "section-experience-bullets",
        kind: "experience_bullets",
        label: "Work Experience (Bullet Points)",
        content: [
          "Led the experimentation platform team at Apply.ai, increasing deploy cadence by 2x and unlocking adaptive onboarding flows.",
          "Partnered with sales to craft customer-ready demos that accelerated pilot conversions by 35%.",
          "Introduced an embeddings-based retrieval layer that reduced cold-start search latency by 48%.",
          "Built guardrails for AI-generated content, cutting manual review time by 60%.",
        ],
      },
      {
        id: "section-experience-metadata",
        kind: "experience_metadata",
        label: "Work Experience (Titles, Dates, & Company)",
        content: [
          "Senior Machine Learning Engineer — Apply.ai (2021 – Present) · San Francisco, CA",
          "Machine Learning Engineer — Northwind Analytics (2018 – 2021) · Remote",
        ],
        allowAdaptation: false,
        helperText:
          "We strongly recommend reviewing titles, dates, and employers manually to preserve factual accuracy.",
      },
      {
        id: "section-skills",
        kind: "skills",
        label: "Skills",
        content: [
          "Python",
          "TypeScript",
          "PyTorch",
          "LangChain",
          "Experimentation Platforms",
          "Feature Flagging",
          "Prompt Engineering",
          "Vector Search",
        ],
      },
      {
        id: "section-education",
        kind: "education",
        label: "Education",
        content: [
          "M.S. Computer Science, Stanford University",
          "B.S. Electrical Engineering, Georgia Tech",
        ],
      },
    ],
    tags: ["AI", "Product", "General"],
  },
  {
    id: "resume-variant-robotics",
    kind: "variant",
    name: "Variant for Motion Labs",
    createdAt: "2025-01-14T16:02:00.000Z",
    baseResumeId: MASTER_RESUME_ID,
    jobContext: {
      title: "Autonomy Engineering Lead",
      company: "Motion Labs Robotics",
      location: "Seattle, WA",
    },
    description:
      "Focused on robotics control systems and hardware collaboration for Motion Labs' autonomous platform.",
    sections: [
      {
        id: "section-summary",
        kind: "summary",
        label: "Professional Summary",
        content: [
          "Machine learning engineer blending perception research with productionized autonomy features for robotics fleets.",
          "Recently led safety-critical releases for Motion Labs pilots across manufacturing sites in Seattle and Austin.",
        ],
      },
      {
        id: "section-experience-bullets",
        kind: "experience_bullets",
        label: "Work Experience (Bullet Points)",
        content: [
          "Architected multi-sensor fusion models combining LiDAR and vision data to improve obstacle detection recall by 19%.",
          "Partnered with embedded teams to ship a resilient control loop for robotic arms, reducing recovery time from faults by 35%.",
          "Led weekly cross-functional review with mechanical engineering and safety to align on compliance requirements.",
          "Introduced a hardware-in-the-loop test harness that accelerated validation cycles by 3x.",
        ],
      },
      {
        id: "section-experience-metadata",
        kind: "experience_metadata",
        label: "Work Experience (Titles, Dates, & Company)",
        content: [
          "Senior Machine Learning Engineer — Apply.ai (2021 – Present) · San Francisco, CA",
          "Machine Learning Engineer — Northwind Analytics (2018 – 2021) · Remote",
        ],
        allowAdaptation: false,
      },
      {
        id: "section-skills",
        kind: "skills",
        label: "Skills",
        content: [
          "Python",
          "PyTorch",
          "ROS2",
          "SLAM",
          "Sensor Fusion",
          "Control Systems",
          "Safety Assurance",
        ],
      },
      {
        id: "section-education",
        kind: "education",
        label: "Education",
        content: [
          "M.S. Computer Science, Stanford University",
          "B.S. Electrical Engineering, Georgia Tech",
        ],
      },
    ],
    metrics: {
      keywordsAdded: ["Sensor Fusion", "Control Systems", "Hardware"],
      sectionsAdapted: ["summary", "experience_bullets", "skills"],
    },
    tags: ["Robotics", "Autonomy"],
  },
  {
    id: "resume-variant-platform",
    kind: "variant",
    name: "Variant for Arcadia Analytics",
    createdAt: "2024-12-18T12:30:00.000Z",
    baseResumeId: MASTER_RESUME_ID,
    jobContext: {
      title: "Principal ML Platform Engineer",
      company: "Arcadia Analytics",
      location: "Remote",
    },
    description:
      "Highlights experimentation infrastructure, model governance, and stakeholder enablement for Arcadia's platform org.",
    sections: [
      {
        id: "section-summary",
        kind: "summary",
        label: "Professional Summary",
        content: [
          "Seasoned ML platform engineer who scaled experimentation, governance, and feature delivery for 80+ product teams.",
          "Recent work focuses on self-serve tooling, observability, and secure model rollout for regulated environments.",
        ],
      },
      {
        id: "section-experience-bullets",
        kind: "experience_bullets",
        label: "Work Experience (Bullet Points)",
        content: [
          "Delivered a managed feature store powering 120M+ daily realtime predictions with automated backfills.",
          "Codified model governance workflows that reduced audit preparation time by 50%.",
          "Drove adoption of experiment review council, elevating win rate of shipped bets from 22% to 38%.",
          "Deployed golden-path CI/CD blueprints that cut onboarding time for new ML services from months to weeks.",
        ],
      },
      {
        id: "section-experience-metadata",
        kind: "experience_metadata",
        label: "Work Experience (Titles, Dates, & Company)",
        content: [
          "Senior Machine Learning Engineer — Apply.ai (2021 – Present) · San Francisco, CA",
          "Machine Learning Engineer — Northwind Analytics (2018 – 2021) · Remote",
        ],
        allowAdaptation: false,
      },
      {
        id: "section-skills",
        kind: "skills",
        label: "Skills",
        content: [
          "Python",
          "TypeScript",
          "Airflow",
          "Kubernetes",
          "Feature Stores",
          "Model Governance",
          "Experimentation Strategy",
        ],
      },
      {
        id: "section-education",
        kind: "education",
        label: "Education",
        content: [
          "M.S. Computer Science, Stanford University",
          "B.S. Electrical Engineering, Georgia Tech",
        ],
      },
    ],
    metrics: {
      keywordsAdded: ["Feature Store", "Governance", "Experimentation"],
      sectionsAdapted: ["summary", "experience_bullets", "skills"],
    },
    tags: ["Platform", "Infrastructure"],
  },
];
