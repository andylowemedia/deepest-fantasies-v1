"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AUTH_UI_ENABLED } from "@/lib/features";
import styles from "./CommentSection.module.css";

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: { username: string; avatar: string | null };
}

interface Session {
  id: string;
  username: string;
}

interface CommentSectionProps {
  imageId: string;
  session: Session | null;
}

function timeAgo(date: string) {
  const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export function CommentSection({ imageId, session }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetch(`/api/comments/${imageId}`)
      .then((r) => r.json())
      .then((data) => {
        setComments(data);
        setFetching(false);
      });
  }, [imageId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || loading) return;
    setLoading(true);

    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageId, content: text }),
    });

    if (res.ok) {
      const newComment = await res.json();
      setComments([newComment, ...comments]);
      setText("");
    }

    setLoading(false);
  }

  return (
    <div className={styles.root}>
      {session ? (
        <form onSubmit={submit} className={styles.form}>
          <div className={styles.formAvatar}>
            {session.username[0].toUpperCase()}
          </div>
          <div className={styles.formRight}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Share your thoughts..."
              rows={3}
              maxLength={1000}
              className={styles.textarea}
            />
            <div className={styles.formFooter}>
              <span className={styles.charCount}>{text.length}/1000</span>
              <button
                type="submit"
                disabled={loading || !text.trim()}
                className="btn btn-primary"
                style={{ padding: "0.5rem 1.25rem", fontSize: "0.85rem" }}
              >
                {loading ? "Posting..." : "Post"}
              </button>
            </div>
          </div>
        </form>
      ) : (
        AUTH_UI_ENABLED && (
          <div className={styles.loginPrompt}>
            <Link href="/login" className={styles.loginLink}>
              Sign in
            </Link>{" "}
            to join the discussion
          </div>
        )
      )}

      <div className={styles.list}>
        {fetching ? (
          <div className={styles.loading}>Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className={styles.empty}>
            Be the first to share your thoughts.
          </div>
        ) : (
          comments.map((c) => (
            <div key={c.id} className={styles.comment}>
              <div className={styles.commentAvatar}>
                {c.user.username[0].toUpperCase()}
              </div>
              <div className={styles.commentBody}>
                <div className={styles.commentMeta}>
                  <span className={styles.commentUser}>{c.user.username}</span>
                  <span className={styles.commentTime}>{timeAgo(c.createdAt)}</span>
                </div>
                <p className={styles.commentText}>{c.content}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}