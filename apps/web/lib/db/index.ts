import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { env } from "@/lib/env";
import * as schema from "./schema";

/**
 * Neon serverless driver over HTTP — right fit for Vercel serverless/edge:
 * no TCP pooling problems, scale-to-zero friendly. The Python worker connects
 * to the same DB over standard postgres:// (see worker/db.py).
 */
const sql = neon(env.DATABASE_URL);
export const db = drizzle({ client: sql, schema });
