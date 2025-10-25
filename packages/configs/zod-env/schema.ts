import { z } from "zod";
export const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "staging", "production"])
    .default("development"),
  PORT: z.coerce.number().default(8080),
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
  SESSION_SECRET: z.string().min(32),
  S3_BUCKET: z.string(),
  S3_REGION: z.string(),
  EMAIL_FROM: z.email(),
  EMAIL_PROVIDER: z.enum(["postmark", "ses", "resend"]).default("postmark"),
  OPENAI_API_KEY: z.string().min(1),
  STRIPE_KEY: z.string().optional(),
  WEB_ORIGIN: z.url(),
  EXTENSION_ORIGIN: z.string().optional(),
});
export type Env = z.infer<typeof EnvSchema>;
