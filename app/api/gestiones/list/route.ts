import { NextResponse } from "next/server";

import { PreguntaEstado } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const rows = await prisma.preguntas.findMany({
      where: {
        estado: PreguntaEstado.DISPONIBLE,
      },
      distinct: ["gestion"],
      select: {
        gestion: true,
      },
      orderBy: {
        gestion: "desc",
      },
      take: 200,
    });

    return NextResponse.json(
      rows
        .map((row) => row.gestion)
        .filter((value): value is number => Number.isInteger(value)),
    );
  } catch {
    return NextResponse.json(
      { message: "No se pudo listar gestiones." },
      { status: 500 },
    );
  }
}
