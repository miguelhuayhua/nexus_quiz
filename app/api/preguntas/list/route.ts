import { NextResponse } from "next/server";

import { PreguntaEstado, Prisma } from "@/prisma/generated";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function parseCsvParam(value: string | null) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function mapPreguntaItem(pregunta: {
  id: string;
  codigo: string;
  enunciado: string;
  gestion: number;
  temas: { titulo: string }[];
  capitulos: { titulo: string }[];
  areas: { titulo: string }[];
}) {
  return {
    id: pregunta.id,
    codigo: pregunta.codigo,
    pregunta: pregunta.enunciado,
    gestion: pregunta.gestion,
    temas: pregunta.temas.map((item) => item.titulo),
    capitulos: pregunta.capitulos.map((item) => item.titulo),
    areas: pregunta.areas.map((item) => item.titulo),
  };
}

export async function GET(request: Request) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id && !session?.user?.email) {
      return NextResponse.json({ message: "No autenticado." }, { status: 401 });
    }

    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const gestion = Number(url.searchParams.get("gestion"));
    const temas = parseCsvParam(url.searchParams.get("temas"));
    const capitulos = parseCsvParam(url.searchParams.get("capitulos"));
    const areas = parseCsvParam(url.searchParams.get("areas"));

    const where: Prisma.preguntasWhereInput = {
      estado: PreguntaEstado.DISPONIBLE,
      ...(Number.isInteger(gestion) ? { gestion } : {}),
      ...(q
        ? {
          OR: [
            { codigo: { contains: q, mode: "insensitive" } },
            { enunciado: { contains: q, mode: "insensitive" } },
          ],
        }
        : {}),
      ...(temas.length ? { temas: { some: { id: { in: temas } } } } : {}),
      ...(capitulos.length
        ? { capitulos: { some: { id: { in: capitulos } } } }
        : {}),
      ...(areas.length ? { areas: { some: { id: { in: areas } } } } : {}),
    };

    const preguntas = await prisma.preguntas.findMany({
      where,
      select: {
        id: true,
        codigo: true,
        enunciado: true,
        gestion: true,
        temas: { select: { titulo: true } },
        capitulos: { select: { titulo: true } },
        areas: { select: { titulo: true } },
      },
      orderBy: {
        actualizadoEn: "desc",
      },
      take: 250,
    });

    return NextResponse.json({
      preguntas: preguntas.map(mapPreguntaItem),
    });
  } catch {
    return NextResponse.json(
      { message: "No se pudo listar preguntas." },
      { status: 500 },
    );
  }
}
