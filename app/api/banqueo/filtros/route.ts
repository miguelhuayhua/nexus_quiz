import { NextResponse } from "next/server";

import { PreguntaDificultad, PreguntaEstado } from "@/generated/prisma/client";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Option = {
  value: string;
  label: string;
};

function uniqueSortOptions(items: Option[]) {
  const seen = new Map<string, string>();
  for (const item of items) {
    if (!item.value || !item.label) continue;
    if (!seen.has(item.value)) {
      seen.set(item.value, item.label);
    }
  }

  return Array.from(seen.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "es", { sensitivity: "base" }));
}

function dificultadLabel(value: PreguntaDificultad) {
  if (value === PreguntaDificultad.SENCILLO) return "BAJA";
  if (value === PreguntaDificultad.DIFICIL) return "ALTA";
  return "MEDIA";
}

export async function GET() {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id && !session?.user?.email) {
      return NextResponse.json({ message: "No autenticado." }, { status: 401 });
    }

    const preguntas = await prisma.preguntas.findMany({
      where: {
        estado: PreguntaEstado.DISPONIBLE,
      },
      select: {
        id: true,
        gestion: true,
        dificultad: true,
        areas: {
          select: {
            id: true,
            titulo: true,
          },
        },
        capitulos: {
          select: {
            id: true,
            titulo: true,
          },
        },
        temas: {
          select: {
            id: true,
            titulo: true,
          },
        },
      },
      orderBy: {
        actualizadoEn: "desc",
      },
    });

    const areas = uniqueSortOptions(
      preguntas.flatMap((pregunta) =>
        pregunta.areas.map((area) => ({
          value: area.id,
          label: area.titulo,
        })),
      ),
    );

    const capitulos = uniqueSortOptions(
      preguntas.flatMap((pregunta) =>
        pregunta.capitulos.map((capitulo) => ({
          value: capitulo.id,
          label: capitulo.titulo,
        })),
      ),
    );

    const temas = uniqueSortOptions(
      preguntas.flatMap((pregunta) =>
        pregunta.temas.map((tema) => ({
          value: tema.id,
          label: tema.titulo,
        })),
      ),
    );

    const gestiones = uniqueSortOptions(
      preguntas
        .map((pregunta) => pregunta.gestion)
        .filter((gestion): gestion is number => Number.isInteger(gestion))
        .map((gestion) => ({
          value: String(gestion),
          label: String(gestion),
        })),
    ).sort((a, b) => Number(b.value) - Number(a.value));

    const dificultades = uniqueSortOptions(
      Object.values(PreguntaDificultad).map((value) => ({
        value,
        label: dificultadLabel(value),
      })),
    );

    const questionFilters = preguntas.map((pregunta) => ({
      id: pregunta.id,
      gestion: String(pregunta.gestion),
      dificultad: pregunta.dificultad,
      areaIds: pregunta.areas.map((item) => item.id),
      capituloIds: pregunta.capitulos.map((item) => item.id),
      temaIds: pregunta.temas.map((item) => item.id),
    }));
    return NextResponse.json({
      areas,
      capitulos,
      temas,
      gestiones,
      dificultades,
      questionFilters,
      hierarchy: await prisma.areas.findMany({
        include: {
          capitulos: {
            include: {
              temas: {
                select: { id: true, titulo: true },
                orderBy: { titulo: "asc" },
              },
            },
            orderBy: { titulo: "asc" },
          },
        },
        orderBy: { titulo: "asc" },
      }),
    });
  } catch {
    return NextResponse.json(
      { message: "No se pudieron cargar los filtros." },
      { status: 500 },
    );
  }
}
