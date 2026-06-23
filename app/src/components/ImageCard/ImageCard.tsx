"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./ImageCard.module.css";

interface ImageCardProps {
  id: string;
  title: string;
  imageUrl: string;
  mediaType?: string;
  posterUrl?: string | null;
  objectPosition?: string | null;
  mediaCount?: number;
  categoryName: string;
  categorySlug: string;
  likeCount: number;
  commentCount: number;
  onOpen: (id: string) => void;
}

export function ImageCard({
  id,
  title,
  imageUrl,
  mediaType = "image",
  posterUrl,
  objectPosition,
  mediaCount = 1,
  categoryName,
  categorySlug,
  likeCount,
  commentCount,
  onOpen,
}: ImageCardProps) {
  const isVideo = mediaType === "video";
  const videoRef = useRef<HTMLVideoElement>(null);

  function handleEnter() {
    videoRef.current?.play().catch(() => {});
  }

  function handleLeave() {
    const v = videoRef.current;
    if (v) {
      v.pause();
      v.currentTime = 0;
    }
  }

  return (
    <article
      className={styles.card}
      onClick={() => onOpen(id)}
      onMouseEnter={isVideo ? handleEnter : undefined}
      onMouseLeave={isVideo ? handleLeave : undefined}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onOpen(id)}
    >
      <div className={styles.imageWrapper}>
        <Image
          src={isVideo ? (posterUrl ?? imageUrl) : imageUrl}
          alt={title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className={styles.image}
          style={objectPosition ? { objectPosition } : undefined}
        />
        {isVideo && (
          <>
            <video
              ref={videoRef}
              src={imageUrl}
              className={styles.hoverVideo}
              muted
              loop
              playsInline
              preload="none"
              aria-hidden="true"
            />
            <span className={styles.videoBadge} aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              VIDEO
            </span>
          </>
        )}
        {mediaCount > 1 && (
          <span className={styles.stackBadge} aria-hidden="true" title={`${mediaCount} items`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="14" height="14" rx="2" />
              <path d="M7 21h12a2 2 0 0 0 2-2V7" />
            </svg>
            {mediaCount}
          </span>
        )}
        <div className={styles.overlay}>
          <div className={styles.overlayContent}>
            <span className={styles.categoryPill}>{categoryName}</span>
            <h3 className={styles.title}>{title}</h3>
            <div className={styles.stats}>
              <span className={styles.stat}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
                {likeCount}
              </span>
              <span className={styles.stat}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                {commentCount}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.footer}>
        <Link
          href={`/gallery?category=${categorySlug}`}
          className={styles.footerCategory}
          onClick={(e) => e.stopPropagation()}
        >
          {categoryName}
        </Link>
        <span className={styles.footerTitle}>{title}</span>
      </div>
    </article>
  );
}