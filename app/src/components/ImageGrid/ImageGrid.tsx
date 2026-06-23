"use client";

import { useState } from "react";
import { ImageCard } from "@/components/ImageCard/ImageCard";
import { PostModal } from "@/components/PostModal/PostModal";
import styles from "./ImageGrid.module.css";

interface MediaItem {
  id: string;
  url: string;
  mediaType: string;
  posterUrl: string | null;
  objectPosition: string | null;
}

interface Image {
  id: string;
  title: string;
  media: MediaItem[];
  category: { name: string; slug: string };
  _count: { likes: number; comments: number };
}

interface ImageGridProps {
  images: Image[];
}

export function ImageGrid({ images }: ImageGridProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (images.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyText}>No images found.</p>
      </div>
    );
  }

  return (
    <>
      <div className={styles.grid}>
        {images.map((image) => {
          const first = image.media[0];
          return (
            <ImageCard
              key={image.id}
              id={image.id}
              title={image.title}
              imageUrl={first?.url ?? ""}
              mediaType={first?.mediaType}
              posterUrl={first?.posterUrl}
              objectPosition={first?.objectPosition}
              mediaCount={image.media.length}
              categoryName={image.category.name}
              categorySlug={image.category.slug}
              likeCount={image._count.likes}
              commentCount={image._count.comments}
              onOpen={setSelectedId}
            />
          );
        })}
      </div>

      {selectedId && (
        <PostModal imageId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </>
  );
}