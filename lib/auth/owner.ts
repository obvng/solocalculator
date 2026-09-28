export function isAllowedOwner(
  email: string | null | undefined,
  ownerEmail = process.env.OWNER_EMAIL,
) {
  return Boolean(
    email &&
      ownerEmail &&
      email.trim().toLowerCase() === ownerEmail.trim().toLowerCase(),
  );
}

export interface OwnerIdentity {
  id: string;
  email: string;
}

export async function requireOwner(): Promise<OwnerIdentity> {
  const [{ redirect }, { createServerClient }] = await Promise.all([
    import("next/navigation"),
    import("@/lib/supabase/server"),
  ]);
  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.getClaims();
  const email = typeof data?.claims?.email === "string" ? data.claims.email : null;
  const id = typeof data?.claims?.sub === "string" ? data.claims.sub : null;

  if (error || !id || !email || !isAllowedOwner(email)) {
    redirect("/admin/login");
    throw new Error("Redirect failed");
  }
  return { id, email };
}
