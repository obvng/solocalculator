import { eq } from "drizzle-orm";
import { hashOwnerPassword } from "../lib/auth/password";
import { getDb } from "../lib/db/client";
import { owners } from "../lib/db/schema";

const email = process.env.OWNER_EMAIL?.trim().toLowerCase();
const password = process.env.OWNER_BOOTSTRAP_PASSWORD;

if (!email || !password) throw new Error("OWNER_EMAIL and OWNER_BOOTSTRAP_PASSWORD are required.");

const passwordHash = await hashOwnerPassword(password);
const [existing] = await getDb().select({ id: owners.id }).from(owners).where(eq(owners.email, email)).limit(1);

if (existing) {
  await getDb().update(owners).set({ passwordHash, updatedAt: new Date() }).where(eq(owners.id, existing.id));
} else {
  await getDb().insert(owners).values({ email, passwordHash });
}

process.stdout.write("Owner account is ready.\n");
