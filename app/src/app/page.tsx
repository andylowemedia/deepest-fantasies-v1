import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ImageGrid } from "@/components/ImageGrid/ImageGrid";
import { CategoryFilter } from "@/components/CategoryFilter/CategoryFilter";
import { AUTH_UI_ENABLED } from "@/lib/features";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [images, categories] = await Promise.all([
    prisma.image.findMany({
      where: { publishedAt: { not: null, lte: new Date() } },
      include: {
        category: true,
        media: { orderBy: { order: "asc" } },
        _count: { select: { likes: true, comments: true } },
      },
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      take: 18,
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroBg} aria-hidden="true" />
        <div className={`container ${styles.heroContent}`}>
          <p className={styles.heroEyebrow}>AI-Generated Adult Art</p>
          <h1 className={styles.heroTitle}>
            Explore Your{" "}
            <span className="gradient-text">Deepest Fantasies</span>
          </h1>
          <p className={styles.heroSubtitle}>
            A curated gallery of AI-generated erotic art. Discover, discuss, and
            share your innermost desires with a community of adults.
          </p>
          <div className={styles.heroCtas}>
            <Link href="/gallery" className="btn btn-primary">
              Browse Gallery
            </Link>
            {AUTH_UI_ENABLED && (
              <Link href="/register" className="btn btn-ghost">
                Join the Community
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className={styles.gallery}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Latest Creations</h2>
            <Link href="/gallery" className={styles.viewAll}>
              View all →
            </Link>
          </div>

          <CategoryFilter categories={categories} activeSlug={null} />

          <ImageGrid images={images} />
        </div>
      </section>
    </>
  );
}