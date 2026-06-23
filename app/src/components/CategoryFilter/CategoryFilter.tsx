"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import styles from "./CategoryFilter.module.css";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface CategoryFilterProps {
  categories: Category[];
  activeSlug: string | null;
}

function FilterContent({ categories, activeSlug }: CategoryFilterProps) {
  const searchParams = useSearchParams();
  const current = activeSlug ?? searchParams.get("category");

  return (
    <div className={styles.wrapper}>
      <div className={styles.scroll}>
        <Link
          href="/gallery"
          className={`${styles.chip} ${!current ? styles.active : ""}`}
        >
          All
        </Link>
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/gallery?category=${cat.slug}`}
            className={`${styles.chip} ${current === cat.slug ? styles.active : ""}`}
          >
            {cat.name}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function CategoryFilter(props: CategoryFilterProps) {
  return (
    <Suspense>
      <FilterContent {...props} />
    </Suspense>
  );
}