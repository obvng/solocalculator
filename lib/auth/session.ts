import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db/client";
import { owners, sessions } from "@/lib/db/schema";
import type { OwnerIdentity } from "./owner";
import { OWNER_COOKIE_NAME } from "./constants";

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isSessionExpired(expiresAt: Date, now = new Date()) {
  return expiresAt.getTime() <= now.getTime();
}

export async function createOwnerSession(ownerId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await getDb().insert(sessions).values({ ownerId, tokenHash: hashSessionToken(token), expiresAt });
  const cookieStore = await cookies();
  cookieStore.set(OWNER_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function getOwnerSession(): Promise<OwnerIdentity | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(OWNER_COOKIE_NAME)?.value;
  if (!token) return null;
  const [record] = await getDb()
    .select({ id: owners.id, email: owners.email })
    .from(sessions)
    .innerJoin(owners, eq(sessions.ownerId, owners.id))
    .where(and(eq(sessions.tokenHash, hashSessionToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return record ?? null;
}

export async function deleteOwnerSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(OWNER_COOKIE_NAME)?.value;
  if (token) await getDb().delete(sessions).where(eq(sessions.tokenHash, hashSessionToken(token)));
  cookieStore.set(OWNER_COOKIE_NAME, "", { httpOnly: true, expires: new Date(0), path: "/", sameSite: "lax" });
}
