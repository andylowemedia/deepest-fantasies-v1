import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();

  const [image, likeCount] = await Promise.all([
    prisma.image.findUnique({
      where: { id },
      include: {
        category: true,
        media: { orderBy: { order: "asc" } },
        _count: { select: { likes: true, comments: true } },
      },
    }),
    session?.user?.id
      ? prisma.like.count({ where: { imageId: id, userId: session.user.id } })
      : Promise.resolve(0),
  ]);

  if (!image) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.image.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
  });

  return NextResponse.json({ ...image, userLiked: likeCount > 0 });
}