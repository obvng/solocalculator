import { Calculator, LockKey } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { login } from "./actions";
import styles from "./login.module.css";

const messages: Record<string, string> = {
  missing: "Enter your email and password.",
  unauthorized: "This account cannot access the dashboard.",
  credentials: "The email or password is incorrect.",
};

export default async function AdminLogin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className={styles.page}>
      <section className={styles.identity} aria-label="SoloCalculator admin">
        <span className={styles.mark}><Calculator weight="fill" /></span>
        <p>SOLOCALCULATOR.COM</p>
        <strong aria-hidden="true">0</strong>
        <h1>Your publishing desk.</h1>
        <span>Write articles, update page SEO and keep every calculator accurate.</span>
      </section>
      <section className={styles.login}>
        <div className={styles.formWrap}>
          <span className={styles.lock}><LockKey weight="fill" /></span>
          <h2>Owner sign in</h2>
          <p>Use the email connected to your SoloCalculator account.</p>
          {error && messages[error] ? <div className={styles.error} role="alert">{messages[error]}</div> : null}
          <form action={login}>
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required />
            <button type="submit">Sign in</button>
          </form>
          <Link href="/">Back to the calculator</Link>
        </div>
      </section>
    </main>
  );
}
