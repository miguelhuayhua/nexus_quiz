import { NextResponse } from "next/server";

import { PreguntaDificultad, PreguntaEstado, Prisma } from "@/prisma/generated";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  hasActiveProSubscription,
  resolveUsuarioEstudianteIdFromSession,
} from "@/lib/subscription-access";

function mapPreguntaItem(pregunta: {
  id: string;
  codigo: string;
  enunciado: string;
  dificultad: PreguntaDificultad;
  gestion: number;
  temas: { titulo: string }[];
  capitulos: { titulo: string }[];
  areas: { titulo: string }[];
}) {
  return {
    id: pregunta.id,
    codigo: pregunta.codigo,
    pregunta: pregunta.enunciado,
    dificultad: pregunta.dificultad,
    gestion: pregunta.gestion,
    temas: pregunta.temas.map((item) => item.titulo),
    capitulos: pregunta.capitulos.map((item) => item.titulo),
    areas: pregunta.areas.map((item) => item.titulo),
  };
}

function shuffleArray<T>(input: T[]) {
  const data = [...input];
  for (let i = data.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [data[i], data[j]] = [data[j], data[i]];
  }
  return data;
}

export async function POST(request: Request) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id && !session?.user?.email) {
      return NextResponse.json({ message: "No autenticado." }, { status: 401 });
    }

    const usuarioEstudianteId = await resolveUsuarioEstudianteIdFromSession({
      userId: session?.user?.id,
      email: session?.user?.email ?? null,
    });
    const hasPro = await hasActiveProSubscription(usuarioEstudianteId);

    if (!hasPro) {
      return NextResponse.json(
        { message: "Se requiere suscripcion Pro activa." },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => null)) as
      | {
        count?: unknown;
        filters?: {
          gestion?: unknown;
          gestiones?: unknown;
          temas?: unknown;
          capitulos?: unknown;
          areas?: unknown;
          dificultades?: unknown;
        };
      }
      | null;

    const count = Number(body?.count);
    if (!Number.isInteger(count) || count <= 0 || count > 100) {
      return NextResponse.json(
        { message: "Cantidad invalida. Debe ser entre 1 y 100." },
        { status: 400 },
      );
    }

    const gestionesRaw = Array.isArray(body?.filters?.gestiones)
      ? body?.filters?.gestiones
      : [];
    const gestionesParsed = gestionesRaw
      .map((item) =>
        typeof item === "number"
          ? item
          : typeof item === "string" && item.trim().length > 0
            ? Number.parseInt(item.trim(), 10)
            : Number.NaN,
      )
      .filter((item): item is number => Number.isInteger(item));
    const gestionRaw = body?.filters?.gestion;
    const gestionLegacy =
      typeof gestionRaw === "number"
        ? gestionRaw
        : typeof gestionRaw === "string" && gestionRaw.trim().length > 0
          ? Number.parseInt(gestionRaw.trim(), 10)
          : Number.NaN;
    const gestiones = Array.from(
      new Set(
        Number.isInteger(gestionLegacy)
          ? [...gestionesParsed, gestionLegacy]
          : gestionesParsed,
      ),
    );
    const temas = Array.isArray(body?.filters?.temas)
      ? Array.from(
        new Set(
          body?.filters?.temas
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim())
            .filter((item) => item.length > 0),
        ),
      )
      : [];
    const capitulos = Array.isArray(body?.filters?.capitulos)
      ? Array.from(
        new Set(
          body?.filters?.capitulos
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim())
            .filter((item) => item.length > 0),
        ),
      )
      : [];
    const areas = Array.isArray(body?.filters?.areas)
      ? Array.from(
        new Set(
          body?.filters?.areas
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim())
            .filter((item) => item.length > 0),
        ),
      )
      : [];
    const dificultades = Array.isArray(body?.filters?.dificultades)
      ? Array.from(
        new Set(
          body?.filters?.dificultades
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim().toUpperCase())
            .filter(
              (item): item is PreguntaDificultad =>
                item === PreguntaDificultad.DIFICIL ||
                item === PreguntaDificultad.MEDIO ||
                item === PreguntaDificultad.SENCILLO,
            ),
        ),
      )
      : [];

    const where: Prisma.preguntasWhereInput = {
      estado: PreguntaEstado.DISPONIBLE,
      ...(gestiones.length ? { gestion: { in: gestiones } } : {}),
      ...(temas.length ? { temas: { some: { id: { in: temas } } } } : {}),
      ...(capitulos.length
        ? { capitulos: { some: { id: { in: capitulos } } } }
        : {}),
      ...(areas.length ? { areas: { some: { id: { in: areas } } } } : {}),
      ...(dificultades.length ? { dificultad: { in: dificultades } } : {}),
    };

    const preguntas = await prisma.preguntas.findMany({
      where,
      select: {
        id: true,
        codigo: true,
        enunciado: true,
        dificultad: true,
        gestion: true,
        temas: { select: { titulo: true } },
        capitulos: { select: { titulo: true } },
        areas: { select: { titulo: true } },
      },
    });

    if (preguntas.length === 0) {
      return NextResponse.json({ preguntas: [] });
    }

    const selected = shuffleArray(preguntas).slice(0, count).map(mapPreguntaItem);
    return NextResponse.json({ preguntas: selected });
  } catch {
    return NextResponse.json(
      { message: "No se pudo generar el banqueo aleatorio." },
      { status: 500 },
    );
  }
}
