import { signOut } from "@/app/admin/(dashboard)/actions";
import { requireOwner } from "@/lib/auth/owner";
import { renewSession } from "./actions";
import styles from "../admin.module.css";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ renewed?: string }> }) {
  const owner = await requireOwner();
  const { renewed } = await searchParams;
  return <>
    <header className={styles.sectionHeader}><div><h1>Account</h1><p>The only account allowed to use this dashboard.</p></div></header>
    <section className={styles.accountCard}>
      <span>Signed in as</span><strong>{owner.email}</strong>
      {renewed ? <p role="status">This device will stay signed in for 90 days unless you sign out or clear your cookies.</p> : null}
      {owner.sessionExpiresAt ? <p>Session expires on {new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" }).format(owner.sessionExpiresAt)}.</p> : null}
      <form action={renewSession}><button>Stay signed in for 90 days</button></form>
      <form action={signOut}><button>Sign out</button></form>
    </section>
  </>;
}
