import "dotenv/config";
import { z } from "zod";
import { EnvSchema, type Env } from "../schemas/env.schema";
export function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error(
      "Invalid environment variables:",
      z.treeifyError(parsed.error),
    );
    process.exit(1);
  }
  return parsed.data;
}
export const ENV = loadEnv();
