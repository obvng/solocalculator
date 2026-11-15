"use server";

import { requireOwner } from "@/lib/auth/owner";
import { extendOwnerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export async function renewSession() {
  const owner = await requireOwner();
  await extendOwnerSession(owner.id);
  redirect("/admin/account?renewed=1");
}
