import { z } from "zod";

/**
 * Single source of truth for environment config (foundation §4.1 / §5).
 * Validate at boundary — reject, don't sanitize. Import this, never process.env.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().url().startsWith("postgres"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "❌ Invalid environment variables:",
    parsed.error.flatten().fieldErrors,
  );
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;
