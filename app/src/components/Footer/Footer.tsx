import Link from "next/link";
import { AUTH_UI_ENABLED } from "@/lib/features";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.brand}>
          <span className={`gradient-text ${styles.logo}`}>Deepest Fantasies</span>
          <p className={styles.tagline}>Adult AI art for grown imaginations.</p>
        </div>

        <nav className={styles.links}>
          <Link href="/gallery" className={styles.link}>Gallery</Link>
          {AUTH_UI_ENABLED && (
            <>
              <Link href="/register" className={styles.link}>Join</Link>
              <Link href="/login" className={styles.link}>Sign in</Link>
            </>
          )}
        </nav>

        <p className={styles.legal}>
          &copy; {new Date().getFullYear()} Deepest Fantasies. Adults 18+ only. All
          AI-generated content is fictional. No real persons depicted.
        </p>
      </div>
    </footer>
  );
}