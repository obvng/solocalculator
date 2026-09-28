"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { isAllowedOwner } from "@/lib/auth/owner";
import { verifyOwnerPassword } from "@/lib/auth/password";
import { createOwnerSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { owners } from "@/lib/db/schema";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) redirect("/admin/login?error=missing");
  if (!isAllowedOwner(email)) redirect("/admin/login?error=unauthorized");

  const [owner] = await getDb().select().from(owners).where(eq(owners.email, email)).limit(1);
  if (!owner || !(await verifyOwnerPassword(owner.passwordHash, password))) redirect("/admin/login?error=credentials");
  await createOwnerSession(owner.id);
  redirect("/admin");
}
