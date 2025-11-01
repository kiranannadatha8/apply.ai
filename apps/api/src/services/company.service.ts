// apps/api/src/services/company.service.ts
import { prisma } from "../lib/prisma";
import { z } from "zod";

export const CompanyUpsertZ = z.object({
  name: z.string().min(1),
  website: z.string().url().optional().nullable(),
  domain: z
    .string()
    .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i)
    .optional()
    .nullable(),
});

export async function upsertCompanyForUser(
  userId: string,
  data: z.infer<typeof CompanyUpsertZ>,
) {
  const domain =
    data.domain ?? (data.website ? safeDomain(data.website) : null);
  // prefer domain unique, fallback to name unique in user namespace
  if (domain) {
    const existing = await prisma.company.findUnique({
      where: { userId_domain: { userId, domain } },
    });
    if (existing) return existing;
    return prisma.company.create({
      data: { userId, name: data.name, website: data.website ?? null, domain },
    });
  }
  const byName = await prisma.company.findUnique({
    where: { userId_name: { userId, name: data.name } },
  });
  if (byName) return byName;
  return prisma.company.create({
    data: {
      userId,
      name: data.name,
      website: data.website ?? null,
      domain: null,
    },
  });
}

function safeDomain(url: string | null | undefined) {
  try {
    const u = new URL(url!);
    return u.hostname.toLowerCase();
  } catch {
    return null;
  }
}
