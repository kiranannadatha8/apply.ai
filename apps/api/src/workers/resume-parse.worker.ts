import { Worker, Queue, QueueEvents, JobsOptions } from "bullmq";
import { ENV } from "../lib/env";
import { redis as connection } from "../lib/redis";
import { prisma } from "../lib/prisma";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { PDFParse as pdf } from "pdf-parse";
import mammoth from "mammoth";
import { z } from "zod";

export const parseQueue = new Queue("resume-parse", { connection });
new QueueEvents("resume-parse", { connection });
const s3 = new S3Client({ region: ENV.S3_REGION });

const ProfileZ = z.object({
  personal: z
    .object({
      fullName: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      location: z.string().optional(),
      links: z.array(z.string()).optional(),
    })
    .partial(),
  education: z
    .array(
      z.object({
        school: z.string(),
        degree: z.string().optional(),
        start: z.string().optional(),
        end: z.string().optional(),
      }),
    )
    .optional(),
  skills: z.array(z.string()).optional(),
  experience: z
    .array(
      z.object({
        company: z.string(),
        role: z.string().optional(),
        start: z.string().optional(),
        end: z.string().optional(),
        bullets: z.array(z.string()).optional(),
      }),
    )
    .optional(),
  projects: z
    .array(
      z.object({
        name: z.string(),
        bullets: z.array(z.string()).optional(),
        tech: z.array(z.string()).optional(),
      }),
    )
    .optional(),
});

async function s3GetText(key: string, mime: string) {
  const obj = await s3.send(
    new GetObjectCommand({ Bucket: ENV.S3_BUCKET, Key: key }),
  );
  const buf = await obj.Body!.transformToByteArray();
  if (mime.includes("pdf")) {
    const parser = new pdf({ data: buf });
    const out = await parser.getText();
    return out.text;
  }
  const out = await mammoth.extractRawText({ buffer: Buffer.from(buf) });
  return out.value;
}

function naiveExtract(text: string) {
  // Very simple heuristics — replace with proper parser later
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const personal = {
    fullName: lines[0]?.slice(0, 120),
    email: text.match(/[\w._%+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0],
  };
  const skillsMatch = text.match(/skills?:([\s\S]{0,400})/i);
  const skills = skillsMatch
    ? skillsMatch[1]
        .replace(/\n/g, " ")
        .split(/[,•]| /)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 50)
    : [];
  return ProfileZ.parse({ personal, skills });
}

new Worker(
  "resume-parse",
  async (job) => {
    const { userId, key, mime } = job.data as {
      userId: string;
      key: string;
      mime: string;
    };
    const text = await s3GetText(key, mime);
    const prof = naiveExtract(text);
    const existing = await prisma.profile.findFirst({
      where: { userId, isDefault: true },
    });
    if (existing)
      await prisma.profile.update({ where: { id: existing.id }, data: prof });
    else
      await prisma.profile.create({
        data: { userId, isDefault: true, ...prof },
      });
    await connection.set(`resume:parsed:${key}`, "1", "EX", 3600);
    return { ok: true };
  },
  { connection, concurrency: 5 },
);

export async function enqueueParse(
  userId: string,
  key: string,
  mime: string,
  opts: JobsOptions = {},
) {
  await parseQueue.add(
    "parse",
    { userId, key, mime },
    { attempts: 3, backoff: { type: "exponential", delay: 1000 }, ...opts },
  );
}
