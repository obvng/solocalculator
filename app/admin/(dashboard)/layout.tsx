import type { ReactNode } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import { requireOwner } from "@/lib/auth/owner";
import styles from "./admin.module.css";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireOwner();
  return <div className={styles.dashboard}><AdminNav /><main className={styles.main}>{children}</main></div>;
}
