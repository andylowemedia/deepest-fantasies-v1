import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { findModel, MODELS } from "@/lib/models";
import { ImageGrid } from "@/components/ImageGrid/ImageGrid";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function ModelProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const model = findModel(slug);

  if (!model) notFound();

  const images = await prisma.image.findMany({
    where: {
      tags: { has: model.tagSlug },
      publishedAt: { not: null, lte: new Date() },
    },
    include: {
      category: true,
      media: { orderBy: { order: "asc" } },
      _count: { select: { likes: true, comments: true } },
    },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
  });

  // Other models for the footer
  const others = MODELS.filter((m) => m.slug !== model.slug);

  return (
    <div>
      <section className={styles.hero}>
        <div className={styles.heroBg}>
          <Image
            src={model.avatar}
            alt=""
            fill
            priority
            className={styles.heroBgImage}
            aria-hidden="true"
          />
          <div className={styles.heroOverlay} aria-hidden="true" />
        </div>

        <div className={`container ${styles.heroInner}`}>
          <div className={styles.heroPortrait}>
            <Image
              src={model.avatar}
              alt={model.name}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 320px"
              className={styles.heroPortraitImage}
            />
          </div>

          <div className={styles.heroText}>
            <p className={styles.heroEyebrow}>Model</p>
            <h1 className={styles.heroName}>
              <span className="gradient-text">{model.name}</span>
            </h1>
            <p className={styles.heroVoice}>“{model.voice}”</p>
            <p className={styles.heroBio}>{model.bio}</p>
            <p className={styles.heroStats}>
              <span>{images.length} {images.length === 1 ? "set" : "sets"} in the gallery</span>
            </p>
          </div>
        </div>
      </section>

      <section className={styles.gallerySection}>
        <div className="container">
          <div className={styles.gallerySectionHead}>
            <h2 className={styles.gallerySectionTitle}>{model.name}&apos;s Gallery</h2>
            <p className={styles.gallerySectionSub}>
              {images.length === 0
                ? "Nothing here yet."
                : `Every set ${model.name.split(" ")[0]} appears in.`}
            </p>
          </div>
          <ImageGrid images={images} />
        </div>
      </section>

      <section className={styles.othersSection}>
        <div className="container">
          <h2 className={styles.othersTitle}>The Rest of the Cast</h2>
          <div className={styles.othersGrid}>
            {others.map((m) => (
              <Link key={m.slug} href={`/models/${m.slug}`} className={styles.otherCard}>
                <div className={styles.otherAvatar}>
                  <Image
                    src={m.avatar}
                    alt={m.name}
                    fill
                    sizes="120px"
                    className={styles.otherImage}
                  />
                </div>
                <span className={styles.otherName}>{m.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}