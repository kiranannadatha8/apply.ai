import { z } from "zod";
export const ProfileFormZ = z.object({
  personal: z.object({
    fullName: z.string().min(1, "Required"),
    email: z.email(),
    phone: z.string().optional().default(""),
    location: z.string().optional().default(""),
    links: z.array(z.url()).optional().default([]),
  }),
  education: z
    .array(
      z.object({
        school: z.string().min(1),
        degree: z.string().optional(),
        start: z.string().optional(),
        end: z.string().optional(),
      }),
    )
    .optional()
    .default([]),
  skills: z.array(z.string()).optional().default([]),
  experience: z
    .array(
      z.object({
        company: z.string().min(1),
        role: z.string().optional(),
        start: z.string().optional(),
        end: z.string().optional(),
        bullets: z.array(z.string()).optional().default([]),
      }),
    )
    .optional()
    .default([]),
  projects: z
    .array(
      z.object({
        name: z.string().min(1),
        bullets: z.array(z.string()).optional().default([]),
        tech: z.array(z.string()).optional().default([]),
      }),
    )
    .optional()
    .default([]),
});
export type ProfileForm = z.infer<typeof ProfileFormZ>;
