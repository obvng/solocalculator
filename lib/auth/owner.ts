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
  const [{ redirect }, { getOwnerSession }] = await Promise.all([
    import("next/navigation"),
    import("./session"),
  ]);
  const owner = await getOwnerSession();
  if (!owner || !isAllowedOwner(owner.email)) {
    redirect("/admin/login");
    throw new Error("Redirect failed");
  }
  return owner;
}
