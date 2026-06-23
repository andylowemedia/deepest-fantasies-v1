"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { AUTH_UI_ENABLED } from "@/lib/features";
import styles from "./Header.module.css";

export function Header() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.logo}>
          <span className={`gradient-text ${styles.logoText}`}>
            Deepest Fantasies
          </span>
        </Link>

        <nav className={styles.nav}>
          <Link href="/gallery" className={styles.navLink}>
            Gallery
          </Link>
          <Link href="/models" className={styles.navLink}>
            Models
          </Link>
          {session ? (
            <div className={styles.userMenu}>
              <button
                className={styles.userBtn}
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <span className={styles.avatar}>
                  {(session.user.username || session.user.name || "U")[0].toUpperCase()}
                </span>
                <span className={styles.username}>
                  {session.user.username || session.user.name}
                </span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={menuOpen ? styles.chevronOpen : styles.chevron}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {menuOpen && (
                <div className={styles.dropdown}>
                  <button
                    className={styles.dropdownItem}
                    onClick={() => {
                      setMenuOpen(false);
                      signOut({ callbackUrl: "/" });
                    }}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            AUTH_UI_ENABLED && (
              <div className={styles.authLinks}>
                <Link href="/login" className="btn btn-ghost">
                  Sign in
                </Link>
                <Link href="/register" className="btn btn-primary">
                  Join
                </Link>
              </div>
            )
          )}
        </nav>
      </div>
    </header>
  );
}