import { prisma } from "@/lib/prisma";
import { ImageGrid } from "@/components/ImageGrid/ImageGrid";
import { CategoryFilter } from "@/components/CategoryFilter/CategoryFilter";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;

  const [images, categories] = await Promise.all([
    prisma.image.findMany({
      where: {
        publishedAt: { not: null, lte: new Date() },
        ...(category ? { category: { slug: category } } : {}),
      },
      include: {
        category: true,
        media: { orderBy: { order: "asc" } },
        _count: { select: { likes: true, comments: true } },
      },
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  const activeCategory = categories.find((c) => c.slug === category);

  return (
    <div>
      <section className={styles.heroWrap}>
        <div className={styles.heroBg} aria-hidden="true" />
        <div className={styles.heroOverlay} aria-hidden="true" />
        <div className="container">
          <div className={styles.header}>
            <p className={styles.eyebrow}>
              {activeCategory ? "Category" : "The Gallery"}
            </p>
            <h1 className={styles.title}>
              <span className="gradient-text">
                {activeCategory ? activeCategory.name : "All Creations"}
              </span>
            </h1>
            {activeCategory?.description ? (
              <p className={styles.description}>{activeCategory.description}</p>
            ) : (
              <p className={styles.description}>
                Every set in one place. Filter by category to narrow it down.
              </p>
            )}
            <p className={styles.count}>
              {images.length} {images.length === 1 ? "set" : "sets"}
            </p>
          </div>
        </div>
      </section>

      <div className="container">
        <CategoryFilter categories={categories} activeSlug={category || null} />
        <ImageGrid images={images} />
      </div>
    </div>
  );
}