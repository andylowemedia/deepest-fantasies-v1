"use client";

import { useState } from "react";
import Image from "next/image";
import { Lightbox } from "@/components/Lightbox/Lightbox";
import styles from "./ClickableImage.module.css";

interface ClickableImageProps {
  src: string;
  alt: string;
}

export function ClickableImage({ src, alt }: ClickableImageProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className={styles.wrapper} onClick={() => setOpen(true)}>
        <Image
          src={src}
          alt={alt}
          width={0}
          height={0}
          sizes="100vw"
          className={styles.image}
          priority
        />
        <div className={styles.hint} aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
          Full size
        </div>
      </div>

      {open && (
        <Lightbox src={src} alt={alt} onClose={() => setOpen(false)} />
      )}
    </>
  );
}