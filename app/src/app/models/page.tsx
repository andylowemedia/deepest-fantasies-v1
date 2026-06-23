import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { MODELS } from "@/lib/models";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function ModelsPage() {
  // Get a post count per model
  const counts = await Promise.all(
    MODELS.map(async (m) => {
      const count = await prisma.image.count({
        where: {
          tags: { has: m.tagSlug },
          publishedAt: { not: null, lte: new Date() },
        },
      });
      return [m.slug, count] as const;
    })
  );
  const countMap = new Map(counts);

  return (
    <div>
      <section className={styles.heroWrap}>
        <div className={styles.heroBg} aria-hidden="true" />
        <div className={styles.heroOverlay} aria-hidden="true" />
        <div className="container">
          <header className={styles.header}>
            <p className={styles.eyebrow}>The Cast</p>
            <h1 className={styles.title}>
              <span className="gradient-text">Models</span>
            </h1>
            <p className={styles.subtitle}>
              The recurring faces of the gallery. Each one brings her own voice,
              her own roles, her own way of owning a frame.
            </p>
          </header>
        </div>
      </section>

      <div className={`container ${styles.grid}`}>
        {MODELS.map((m) => (
          <Link key={m.slug} href={`/models/${m.slug}`} className={styles.card}>
            <div className={styles.avatarWrap}>
              <Image
                src={m.avatar}
                alt={m.name}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className={styles.avatar}
              />
              <div className={styles.cardOverlay}>
                <span className={styles.cardCount}>
                  {countMap.get(m.slug) ?? 0} {countMap.get(m.slug) === 1 ? "set" : "sets"}
                </span>
              </div>
            </div>
            <div className={styles.cardBody}>
              <h3 className={styles.cardName}>{m.name}</h3>
              <p className={styles.cardVoice}>{m.voice}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
