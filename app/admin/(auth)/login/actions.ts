"use server";

import { redirect } from "next/navigation";
import { isAllowedOwner } from "@/lib/auth/owner";
import { createServerClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) redirect("/admin/login?error=missing");
  if (!isAllowedOwner(email)) redirect("/admin/login?error=unauthorized");

  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !isAllowedOwner(data.user.email)) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=credentials");
  }
  redirect("/admin");
}
