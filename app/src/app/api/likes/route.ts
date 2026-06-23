import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { imageId } = await request.json();
  if (!imageId) {
    return NextResponse.json({ error: "imageId required." }, { status: 400 });
  }

  const existing = await prisma.like.findUnique({
    where: { userId_imageId: { userId: session.user.id, imageId } },
  });

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
    const count = await prisma.like.count({ where: { imageId } });
    return NextResponse.json({ liked: false, count });
  }

  await prisma.like.create({ data: { userId: session.user.id, imageId } });
  const count = await prisma.like.count({ where: { imageId } });
  return NextResponse.json({ liked: true, count });
}