import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { imageId, content } = await request.json();

  if (!imageId || !content?.trim()) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  if (content.trim().length > 1000) {
    return NextResponse.json({ error: "Comment too long (max 1000 chars)." }, { status: 400 });
  }

  const comment = await prisma.comment.create({
    data: {
      content: content.trim(),
      userId: session.user.id,
      imageId,
    },
    include: { user: { select: { username: true, avatar: true } } },
  });

  return NextResponse.json(comment, { status: 201 });
}