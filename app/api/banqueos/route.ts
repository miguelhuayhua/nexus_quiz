import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import {
  BanqueoTipo,
  BanqueoTipoCreado,
  PreguntaEstado,
} from "@/generated/prisma/client";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  hasActiveProSubscription,
  resolveUsuarioEstudianteIdFromSession,
} from "@/lib/subscription-access";

export async function POST(request: Request) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id && !session?.user?.email) {
      return NextResponse.json({ message: "No autenticado." }, { status: 401 });
    }

    const usuarioEstudianteId = await resolveUsuarioEstudianteIdFromSession({
      userId: session.user.id,
      email: session.user.email ?? null,
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
          titulo?: unknown;
          tipo?: unknown;
          duracion?: unknown;
          maxPreguntas?: unknown;
          preguntaIds?: unknown;
        }
      | null;

    const titulo = typeof body?.titulo === "string" ? body.titulo.trim() : "";
    const tipo = body?.tipo === "FREE" ? BanqueoTipo.FREE : BanqueoTipo.PRO;
    const duracion = Number(body?.duracion);
    const maxPreguntas = Number(body?.maxPreguntas);
    const preguntaIds = Array.isArray(body?.preguntaIds)
      ? body.preguntaIds.filter((item): item is string => typeof item === "string")
      : [];

    if (titulo.length < 4) {
      return NextResponse.json(
        { message: "El titulo debe tener al menos 4 caracteres." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(duracion) || duracion <= 0) {
      return NextResponse.json(
        { message: "Duracion invalida." },
        { status: 400 },
      );
    }

    if (!Number.isInteger(maxPreguntas) || maxPreguntas <= 0 || maxPreguntas > 100) {
      return NextResponse.json(
        { message: "Maximo de preguntas invalido. Debe ser entre 1 y 100." },
        { status: 400 },
      );
    }

    if (preguntaIds.length === 0) {
      return NextResponse.json(
        { message: "Debes seleccionar al menos una pregunta." },
        { status: 400 },
      );
    }

    if (preguntaIds.length > maxPreguntas) {
      return NextResponse.json(
        { message: "La seleccion supera el maximo de preguntas." },
        { status: 400 },
      );
    }

    const uniquePreguntaIds = Array.from(new Set(preguntaIds));
    const preguntas = await prisma.preguntas.findMany({
      where: {
        id: { in: uniquePreguntaIds },
        estado: PreguntaEstado.DISPONIBLE,
      },
      select: { id: true },
    });

    if (preguntas.length !== uniquePreguntaIds.length) {
      return NextResponse.json(
        { message: "Algunas preguntas no existen o no estan disponibles." },
        { status: 400 },
      );
    }

    const now = new Date();
    const banqueo = await prisma.banqueo.create({
      data: {
        id: randomUUID(),
        titulo,
        tipo,
        tipoCreado: BanqueoTipoCreado.ESTUDIANTE,
        duracion,
        maxPreguntas,
        creadoEn: now,
        actualizadoEn: now,
        preguntas: {
          connect: uniquePreguntaIds.map((id) => ({ id })),
        },
      },
      select: {
        id: true,
      },
    });

    return NextResponse.json({ ok: true, id: banqueo.id });
  } catch {
    return NextResponse.json(
      { message: "No se pudo crear el banqueo." },
      { status: 500 },
    );
  }
}
