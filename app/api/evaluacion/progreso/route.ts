import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import {
  BanqueoTipo,
  PreguntaEstado,
  Prisma,
  ResultadoRespuesta,
} from "@/generated/prisma/client";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  hasActiveProSubscription,
  resolveUsuarioEstudianteIdFromSession,
} from "@/lib/subscription-access";
import { compareRespuesta, normalizeSolucion, parseRespuesta } from "@/lib/evaluacion-eval";

type ProgresoBody = {
  bancoId?: unknown;
  evaluacionId?: unknown;
  intentoId?: unknown;
  respuestas?: unknown;
  finalizar?: unknown;
  tiempoConsumido?: unknown;
  currentIndex?: unknown;
};

export async function POST(request: Request) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id && !session?.user?.email) {
      return NextResponse.json({ message: "No autenticado." }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as ProgresoBody | null;
    const bancoIdRaw =
      typeof body?.bancoId === "string"
        ? body.bancoId
        : typeof body?.evaluacionId === "string"
          ? body.evaluacionId
          : "";
    const bancoId = bancoIdRaw.trim();

    if (!bancoId) {
      return NextResponse.json({ message: "bancoId es obligatorio." }, { status: 400 });
    }

    const usuarioEstudianteId = await resolveUsuarioEstudianteIdFromSession({
      userId: session.user.id,
      email: session.user.email ?? null,
    });
    if (!usuarioEstudianteId) {
      return NextResponse.json({ message: "Estudiante no encontrado." }, { status: 404 });
    }
    const hasPro = await hasActiveProSubscription(usuarioEstudianteId);

    const respuestas = isStringRecord(body?.respuestas) ? body.respuestas : {};
    const finalizar = body?.finalizar === true;
    const tiempoConsumidoRaw = Number(body?.tiempoConsumido ?? 0);
    const tiempoConsumido = Number.isFinite(tiempoConsumidoRaw)
      ? Math.max(0, Math.floor(tiempoConsumidoRaw))
      : 0;
    const currentIndexRaw = Number(body?.currentIndex ?? 0);
    const currentIndex = Number.isFinite(currentIndexRaw)
      ? Math.max(0, Math.floor(currentIndexRaw))
      : 0;

    const banco = await prisma.banqueo.findFirst({
      where: {
        id: bancoId,
      },
      select: {
        id: true,
        tipo: true,
        preguntas: {
          where: {
            estado: PreguntaEstado.DISPONIBLE,
          },
          select: {
            id: true,
            solucion: true,
          },
        },
      },
    });

    if (!banco) {
      return NextResponse.json({ message: "Banqueo no disponible." }, { status: 404 });
    }

    if (banco.tipo === BanqueoTipo.PRO && !hasPro) {
      return NextResponse.json(
        { message: "Se requiere suscripcion Pro activa." },
        { status: 403 },
      );
    }

    const now = new Date();
    const intentoIdRaw = typeof body?.intentoId === "string" ? body.intentoId.trim() : "";

    let intento = intentoIdRaw
      ? await prisma.intentos.findFirst({
          where: {
            id: intentoIdRaw,
            banqueoId: banco.id,
            usuarioEstudianteId,
          },
          select: {
            id: true,
          },
        })
      : null;

    if (!intento) {
      const intentosCount = await prisma.intentos.count({
        where: {
          banqueoId: banco.id,
          usuarioEstudianteId,
        },
      });
      if (intentosCount >= 3) {
        return NextResponse.json(
          { message: "Se alcanzó el máximo de 3 intentos para este banqueo." },
          { status: 409 },
        );
      }

      intento = await prisma.intentos.create({
        data: {
          id: randomUUID(),
          banqueoId: banco.id,
          usuarioEstudianteId,
          tiempoDuracion: 0,
          correctas: 0,
          incorrectas: 0,
          creadoEn: now,
          actualizadoEn: now,
        },
        select: {
          id: true,
        },
      });

      if (banco.preguntas.length > 0) {
        await prisma.respuestasIntentos.createMany({
          data: banco.preguntas.map((pregunta, index) => ({
            id: randomUUID(),
            intentoId: intento!.id,
            preguntaId: pregunta.id,
            resultado: ResultadoRespuesta.OMITIDA,
            esCorrecta: null,
            respondida: false,
            visitada: false,
            marcadaRevision: false,
            tiempoConsumidoSeg: 0,
            orden: index,
            respondidaEn: null,
            creadoEn: now,
            actualizadoEn: now,
          })),
        });
      }
    }

    if (!intento) {
      return NextResponse.json({ message: "No se pudo iniciar el intento." }, { status: 500 });
    }
    const intentoId = intento.id;

    const evaluadas = banco.preguntas.map((pregunta, index) => {
      const rawRespuesta = respuestas[pregunta.id] ?? "";
      const kind = extractSolucionKind(pregunta.solucion);
      const parsedRespuesta = parseRespuesta(rawRespuesta, kind ?? undefined);
      const parsedSolucion = normalizeSolucion(
        extractSolucionValue(pregunta.solucion),
        kind ?? undefined,
      );
      const respondida = parsedRespuesta !== null;

      const esCorrecta =
        respondida && parsedSolucion !== null
          ? compareRespuesta(parsedRespuesta, parsedSolucion)
          : false;

      const resultado = !respondida
        ? ResultadoRespuesta.OMITIDA
        : esCorrecta
          ? ResultadoRespuesta.BIEN
          : ResultadoRespuesta.MAL;

      return {
        preguntaId: pregunta.id,
        orden: index,
        respondida,
        esCorrecta: respondida ? esCorrecta : null,
        resultado,
        rawRespuesta,
      };
    });

    const correctas = evaluadas.filter((item) => item.resultado === ResultadoRespuesta.BIEN).length;
    const incorrectas = evaluadas.filter((item) => item.resultado === ResultadoRespuesta.MAL).length;

    await prisma.$transaction(async (tx) => {
      for (const item of evaluadas) {
        await tx.respuestasIntentos.upsert({
          where: {
            intentoId_preguntaId: {
              intentoId,
              preguntaId: item.preguntaId,
            },
          },
          create: {
            id: randomUUID(),
            intentoId,
            preguntaId: item.preguntaId,
            respuesta: item.respondida ? item.rawRespuesta : Prisma.DbNull,
            resultado: item.resultado,
            esCorrecta: item.esCorrecta,
            respondida: item.respondida,
            visitada: item.respondida || currentIndex === item.orden,
            marcadaRevision: false,
            tiempoConsumidoSeg: 0,
            orden: item.orden,
            respondidaEn: item.respondida ? now : null,
            creadoEn: now,
            actualizadoEn: now,
          },
          update: {
            respuesta: item.respondida ? item.rawRespuesta : Prisma.DbNull,
            resultado: item.resultado,
            esCorrecta: item.esCorrecta,
            respondida: item.respondida,
            visitada: item.respondida || currentIndex === item.orden,
            respondidaEn: item.respondida ? now : null,
            actualizadoEn: now,
          },
        });
      }

      await tx.intentos.update({
        where: { id: intentoId },
        data: {
          correctas,
          incorrectas,
          tiempoDuracion: tiempoConsumido,
          actualizadoEn: now,
        },
      });

      if (finalizar) {
        await tx.repasoRegistros.createMany({
          data: evaluadas
            .filter((item) => item.respondida)
            .map((item) => ({
              id: randomUUID(),
              usuarioEstudianteId,
              banqueoId: banco.id,
              preguntaId: item.preguntaId,
              esCorrecta: item.esCorrecta === true,
              creadoEn: now,
            })),
        });
      }
    });

    return NextResponse.json({
      ok: true,
      intentoId,
      estado: finalizar ? "ENVIADO" : "EN_PROGRESO",
    });
  } catch {
    return NextResponse.json(
      { message: "No se pudo guardar el progreso del banqueo." },
      { status: 500 },
    );
  }
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  return Object.values(value).every((item) => typeof item === "string");
}

function extractSolucionKind(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.kind === "string" ? candidate.kind : null;
}

function extractSolucionValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.value ??
    candidate.correcta ??
    candidate.correct ??
    candidate.respuesta ??
    candidate.solucion ??
    value
  );
}
