import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  const { imageId } = await params;

  const comments = await prisma.comment.findMany({
    where: { imageId },
    include: { user: { select: { username: true, avatar: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(comments);
}