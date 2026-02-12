import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").trim();

    const areas = await prisma.areas.findMany({
      where: q
        ? {
            titulo: {
              contains: q,
              mode: "insensitive",
            },
          }
        : undefined,
      select: {
        id: true,
        titulo: true,
      },
      orderBy: {
        titulo: "asc",
      },
      take: 100,
    });

    return NextResponse.json(areas);
  } catch {
    return NextResponse.json(
      { message: "No se pudo listar áreas." },
      { status: 500 },
    );
  }
}
