"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AUTH_UI_ENABLED } from "@/lib/features";
import styles from "./LikeButton.module.css";

interface LikeButtonProps {
  imageId: string;
  initialCount: number;
  initialLiked: boolean;
  isLoggedIn: boolean;
}

export function LikeButton({
  imageId,
  initialCount,
  initialLiked,
  isLoggedIn,
}: LikeButtonProps) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (!isLoggedIn) {
      // Login UI is hidden — don't push to the hidden /login route.
      if (AUTH_UI_ENABLED) router.push("/login");
      return;
    }

    if (loading) return;
    setLoading(true);

    setLiked(!liked);
    setCount(liked ? count - 1 : count + 1);

    const res = await fetch("/api/likes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageId }),
    });

    if (res.ok) {
      const data = await res.json();
      setLiked(data.liked);
      setCount(data.count);
    } else {
      setLiked(liked);
      setCount(count);
    }

    setLoading(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`${styles.btn} ${liked ? styles.liked : ""}`}
      title={
        isLoggedIn
          ? liked
            ? "Unlike"
            : "Like"
          : AUTH_UI_ENABLED
            ? "Sign in to like"
            : "Like"
      }
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill={liked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
      <span>{count}</span>
    </button>
  );
}