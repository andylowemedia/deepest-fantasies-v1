import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ClickableImage } from "@/components/ClickableImage/ClickableImage";
import { CommentSection } from "@/components/CommentSection/CommentSection";
import { LikeButton } from "@/components/LikeButton/LikeButton";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function ImagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const image = await prisma.image.findUnique({
    where: { id },
    include: {
      category: true,
      _count: { select: { likes: true, comments: true } },
      likes: session?.user?.id
        ? { where: { userId: session.user.id } }
        : false,
    },
  });

  if (!image) notFound();

  await prisma.image.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
  });

  const userLiked = session?.user?.id
    ? (image.likes as { userId: string }[]).length > 0
    : false;

  return (
    <div className="container">
      <div className={styles.breadcrumb}>
        <Link href="/gallery" className={styles.breadcrumbLink}>Gallery</Link>
        <span className={styles.breadcrumbSep}>›</span>
        <Link
          href={`/gallery?category=${image.category.slug}`}
          className={styles.breadcrumbLink}
        >
          {image.category.name}
        </Link>
        <span className={styles.breadcrumbSep}>›</span>
        <span className={styles.breadcrumbCurrent}>{image.title}</span>
      </div>

      <div className={styles.layout}>
        <div className={styles.imageSection}>
          <ClickableImage src={image.imageUrl} alt={image.title} />
        </div>

        <aside className={styles.sidebar}>
          <div className={styles.meta}>
            <Link
              href={`/gallery?category=${image.category.slug}`}
              className={styles.categoryBadge}
            >
              {image.category.name}
            </Link>
            <h1 className={styles.title}>{image.title}</h1>
            {image.description && (
              <p className={styles.description}>{image.description}</p>
            )}

            {image.tags.length > 0 && (
              <div className={styles.tags}>
                {image.tags.map((tag) => (
                  <span key={tag} className={styles.tag}>
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className={styles.stats}>
              <LikeButton
                imageId={image.id}
                initialCount={image._count.likes}
                initialLiked={userLiked}
                isLoggedIn={!!session}
              />
              <span className={styles.stat}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                {image._count.comments}
              </span>
              <span className={styles.stat}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                {image.viewCount.toLocaleString()}
              </span>
            </div>
          </div>

          <div className={styles.commentsSection}>
            <h2 className={styles.commentsTitle}>
              Discussion <span className={styles.commentsCount}>({image._count.comments})</span>
            </h2>
            <CommentSection
              imageId={image.id}
              session={session ? { id: session.user.id, username: session.user.username || session.user.name || "User" } : null}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}