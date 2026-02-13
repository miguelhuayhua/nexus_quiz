import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").trim();

    const capitulos = await prisma.capitulos.findMany({
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

    return NextResponse.json(capitulos);
  } catch {
    return NextResponse.json(
      { message: "No se pudo listar capitulos." },
      { status: 500 },
    );
  }
}
