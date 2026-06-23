"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import styles from "./page.module.css";

function AgeGateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/";

  function confirm() {
    document.cookie = "age-verified=true; path=/; max-age=31536000; SameSite=Lax";
    router.push(from);
  }

  function deny() {
    window.location.href = "https://www.google.com";
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <span className={`gradient-text ${styles.logoText}`}>
            Deepest Fantasies
          </span>
        </div>

        <div className={styles.badge}>18+ Adult Content</div>

        <h1 className={styles.title}>Age Verification Required</h1>

        <p className={styles.body}>
          This website contains sexually explicit content intended for adults
          only. By entering, you confirm that you are at least 18 years of age
          (or the age of majority in your jurisdiction), and that viewing adult
          content is legal in your location.
        </p>

        <p className={styles.disclaimer}>
          All characters depicted are adults (18+). All AI-generated content is
          fictional. No real persons are depicted.
        </p>

        <div className={styles.actions}>
          <button className={`btn btn-primary ${styles.btnEnter}`} onClick={confirm}>
            I am 18 or older — Enter
          </button>
          <button className={`btn btn-ghost ${styles.btnLeave}`} onClick={deny}>
            I am under 18 — Leave
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AgeGatePage() {
  return (
    <Suspense>
      <AgeGateContent />
    </Suspense>
  );
}