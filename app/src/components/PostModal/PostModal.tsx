"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { LikeButton } from "@/components/LikeButton/LikeButton";
import { CommentSection } from "@/components/CommentSection/CommentSection";
import styles from "./PostModal.module.css";

interface MediaItem {
  id: string;
  url: string;
  mediaType: string;
  posterUrl: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
}

interface ImageData {
  id: string;
  title: string;
  description: string | null;
  media: MediaItem[];
  tags: string[];
  viewCount: number;
  category: { name: string; slug: string };
  _count: { likes: number; comments: number };
  userLiked: boolean;
}

interface PostModalProps {
  imageId: string;
  onClose: () => void;
}

export function PostModal({ imageId, onClose }: PostModalProps) {
  const { data: session } = useSession();
  const [image, setImage] = useState<ImageData | null>(null);
  const [slide, setSlide] = useState(0);

  const current = image?.media[slide];
  const hasMany = (image?.media.length ?? 0) > 1;
  const isLandscape = current
    ? (current.width ?? 0) > (current.height ?? 0)
    : false;

  useEffect(() => {
    setImage(null);
    setSlide(0);
    fetch(`/api/images/${imageId}`)
      .then((r) => r.json())
      .then(setImage);
  }, [imageId]);

  const next = useCallback(() => {
    if (!image) return;
    setSlide((s) => (s + 1) % image.media.length);
  }, [image]);

  const prev = useCallback(() => {
    if (!image) return;
    setSlide((s) => (s - 1 + image.media.length) % image.media.length);
  }, [image]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" && hasMany) next();
      else if (e.key === "ArrowLeft" && hasMany) prev();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, next, prev, hasMany]);

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={`${styles.modal} ${isLandscape ? styles.modalLandscape : ""}`}
        onClick={(e) => e.stopPropagation()}
      >

        {/* Media */}
        <div className={styles.imageSide}>
          {current ? (
            current.mediaType === "video" ? (
              <video
                key={current.id}
                src={current.url}
                poster={current.posterUrl ?? undefined}
                className={styles.image}
                controls
                autoPlay
                loop
                playsInline
                aria-label={image?.title}
              />
            ) : (
              <Image
                key={current.id}
                src={current.url}
                alt={image?.title ?? ""}
                width={0}
                height={0}
                sizes="100vw"
                className={styles.image}
                priority
              />
            )
          ) : (
            <div className={styles.imagePlaceholder} />
          )}

          {hasMany && (
            <>
              <button
                className={`${styles.navBtn} ${styles.navPrev}`}
                onClick={prev}
                aria-label="Previous"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                className={`${styles.navBtn} ${styles.navNext}`}
                onClick={next}
                aria-label="Next"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              <div className={styles.dots} aria-hidden="true">
                {image!.media.map((m, i) => (
                  <button
                    key={m.id}
                    className={`${styles.dot} ${i === slide ? styles.dotActive : ""}`}
                    onClick={() => setSlide(i)}
                    aria-label={`Go to item ${i + 1}`}
                  />
                ))}
              </div>
              <span className={styles.slideCounter}>
                {slide + 1} / {image!.media.length}
              </span>
            </>
          )}

          {current?.caption && (
            <div className={styles.caption}>
              <p>{current.caption}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            {image && (
              <Link
                href={`/gallery?category=${image.category.slug}`}
                className={styles.category}
                onClick={onClose}
              >
                {image.category.name}
              </Link>
            )}
            <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {image ? (
            <div className={styles.sidebarBody}>
              <div className={styles.meta}>
                <h2 className={styles.title}>{image.title}</h2>
                {image.description && (
                  <p className={styles.description}>{image.description}</p>
                )}
                {image.tags.length > 0 && (
                  <div className={styles.tags}>
                    {image.tags.map((tag) => (
                      <span key={tag} className={styles.tag}>#{tag}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.actions}>
                <LikeButton
                  imageId={image.id}
                  initialCount={image._count.likes}
                  initialLiked={image.userLiked}
                  isLoggedIn={!!session}
                />
                <span className={styles.viewCount}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  {image.viewCount.toLocaleString()}
                </span>
              </div>

              <div className={styles.comments}>
                <p className={styles.commentsLabel}>
                  Discussion
                  <span className={styles.commentsCount}>{image._count.comments}</span>
                </p>
                <CommentSection
                  imageId={image.id}
                  session={
                    session
                      ? { id: session.user.id, username: session.user.username || session.user.name || "User" }
                      : null
                  }
                />
              </div>
            </div>
          ) : (
            <div className={styles.loading}>Loading...</div>
          )}
        </aside>
      </div>
    </div>,
    document.body
  );
}