"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { isAllowedOwner } from "@/lib/auth/owner";
import { verifyOwnerPassword } from "@/lib/auth/password";
import { createOwnerSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { owners } from "@/lib/db/schema";
import { consumeLoginAllowance, LoginRateLimitError } from "@/lib/security/login-rate-limit";

export async function login(formData: FormData) {
  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");
  if (typeof emailValue !== "string" || typeof passwordValue !== "string" || emailValue.length > 254 || passwordValue.length > 1024) redirect("/admin/login?error=credentials");
  const email = emailValue.trim().toLowerCase();
  const password = passwordValue;
  if (!email || !password) redirect("/admin/login?error=missing");
  try { await consumeLoginAllowance(); } catch (error) {
    redirect(`/admin/login?error=${error instanceof LoginRateLimitError && error.code === "rate_limited" ? "rate_limited" : "unavailable"}`);
  }
  if (!isAllowedOwner(email)) redirect("/admin/login?error=credentials");

  const [owner] = await getDb().select().from(owners).where(eq(owners.email, email)).limit(1);
  if (!owner || !(await verifyOwnerPassword(owner.passwordHash, password))) redirect("/admin/login?error=credentials");
  await createOwnerSession(owner.id);
  redirect("/admin");
}
