import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { compareRespuesta, normalizeSolucion, parseRespuesta } from "@/lib/evaluacion-eval";

type ProgresoBody = {
  evaluacionId?: unknown;
  respuestas?: unknown;
  finalizar?: unknown;
  tiempoConsumido?: unknown;
};

export async function POST(request: Request) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id && !session?.user?.email) {
      return NextResponse.json({ message: "No autenticado." }, { status: 401 });
    }

    const estudianteId = await resolveEstudianteIdFromSession({
      userId: session.user.id,
      email: session.user.email ?? null,
    });

    if (!estudianteId) {
      return NextResponse.json({ message: "Estudiante no encontrado." }, { status: 404 });
    }

    const body = (await request.json().catch(() => null)) as ProgresoBody | null;
    const evaluacionId =
      typeof body?.evaluacionId === "string" ? body.evaluacionId.trim() : "";

    if (!evaluacionId) {
      return NextResponse.json({ message: "evaluacionId es obligatorio." }, { status: 400 });
    }

    const respuestas = isStringRecord(body?.respuestas) ? body.respuestas : {};
    const finalizar = body?.finalizar === true;
    const tiempoConsumidoRaw = Number(body?.tiempoConsumido ?? 0);
    const tiempoConsumido = Number.isFinite(tiempoConsumidoRaw)
      ? Math.max(0, Math.floor(tiempoConsumidoRaw))
      : 0;

    const evaluacion = await prisma.evaluaciones.findFirst({
      where: {
        id: evaluacionId,
        estado: "DISPONIBLE",
        compraEvaluacions: {
          some: {
            estudianteId,
            estado: "COMPLETADO",
          },
        },
      },
      select: {
        id: true,
        tiempo_segundos: true,
        temas: {
          orderBy: {
            nombre: "asc",
          },
          include: {
            temaPreguntas: {
              orderBy: {
                orden: "asc",
              },
              include: {
                preguntas: {
                  select: {
                    id: true,
                    solucion: true,
                    estado: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!evaluacion) {
      return NextResponse.json({ message: "Evaluación no disponible." }, { status: 404 });
    }

    const now = new Date();

    let intento = await prisma.evaluacionIntentos.findFirst({
      where: {
        evaluacionId,
        estudianteId,
        estado: "EN_PROGRESO",
      },
      orderBy: {
        iniciadoEn: "desc",
      },
    });

    if (!intento) {
      intento = await prisma.evaluacionIntentos.create({
        data: {
          id: randomUUID(),
          estudianteId,
          evaluacionId,
          estado: "EN_PROGRESO",
          iniciadoEn: now,
          actualizadoEn: now,
          vence_en: new Date(now.getTime() + evaluacion.tiempo_segundos * 1000),
          tiempoConsumido,
          progreso: {
            respuestas,
            guardadoEn: now.toISOString(),
          },
        },
      });
    }

    await prisma.evaluacionIntentos.update({
      where: { id: intento.id },
      data: {
        actualizadoEn: now,
        tiempoConsumido,
        progreso: {
          respuestas,
          guardadoEn: now.toISOString(),
        },
      },
    });

    if (!finalizar) {
      return NextResponse.json({ ok: true, intentoId: intento.id, estado: "EN_PROGRESO" });
    }

    const preguntasEvaluacion = getPreguntasFromTemas(evaluacion.temas);

    await prisma.$transaction(async (tx) => {
      for (const item of preguntasEvaluacion) {
        const rawRespuesta = respuestas[item.preguntaId];
        const kind = extractSolucionKind(item.solucion);
        const respuestaParseada = parseRespuesta(rawRespuesta, kind ?? undefined);
        const solucionNormalizada = normalizeSolucion(
          extractSolucionValue(item.solucion),
          kind ?? undefined,
        );

        const respondida = respuestaParseada !== null;
        const correcta =
          respondida && solucionNormalizada !== null
            ? compareRespuesta(respuestaParseada, solucionNormalizada)
            : false;

        if (respondida) {
          await tx.respuestasEstudiantes.upsert({
            where: {
              intentoId_preguntaId: {
                intentoId: intento!.id,
                preguntaId: item.preguntaId,
              },
            },
            create: {
              id: randomUUID(),
              intentoId: intento!.id,
              preguntaId: item.preguntaId,
              value: respuestaParseada as object,
              esCorrecta: correcta,
              puntajeObtenido: correcta ? item.puntaje : 0,
            },
            update: {
              value: respuestaParseada as object,
              esCorrecta: correcta,
              puntajeObtenido: correcta ? item.puntaje : 0,
            },
          });
        }

        if (correcta) {
          await tx.bancoPreguntasFalladas.updateMany({
            where: {
              estudianteId,
              evaluacionId,
              preguntaId: item.preguntaId,
            },
            data: {
              resuelta: true,
              evaluacionIntentosId: intento!.id,
            },
          });
        } else {
          await tx.bancoPreguntasFalladas.upsert({
            where: {
              estudianteId_preguntaId_evaluacionId: {
                estudianteId,
                preguntaId: item.preguntaId,
                evaluacionId,
              },
            },
            create: {
              id: randomUUID(),
              estudianteId,
              preguntaId: item.preguntaId,
              evaluacionId,
              resuelta: false,
              evaluacionIntentosId: intento!.id,
            },
            update: {
              resuelta: false,
              evaluacionIntentosId: intento!.id,
            },
          });
        }
      }

      await tx.evaluacionIntentos.update({
        where: { id: intento!.id },
        data: {
          estado: "ENVIADO",
          enviadoEn: now,
          actualizadoEn: now,
          tiempoConsumido,
          progreso: {
            respuestas,
            guardadoEn: now.toISOString(),
            finalizadoEn: now.toISOString(),
          },
        },
      });
    });

    return NextResponse.json({ ok: true, intentoId: intento.id, estado: "ENVIADO" });
  } catch {
    return NextResponse.json(
      { message: "No se pudo guardar el progreso de la evaluación." },
      { status: 500 },
    );
  }
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  return Object.values(value).every((item) => typeof item === "string");
}

function getPreguntasFromTemas(
  temas: {
    temaPreguntas: {
      preguntaId: string;
      puntaje: number;
      preguntas: { solucion: unknown; estado: string };
    }[];
  }[],
) {
  const seen = new Set<string>();
  const result: { preguntaId: string; puntaje: number; solucion: unknown }[] = [];

  for (const tema of temas) {
    for (const item of tema.temaPreguntas) {
      if (item.preguntas.estado !== "DISPONIBLE") continue;
      if (seen.has(item.preguntaId)) continue;
      seen.add(item.preguntaId);

      result.push({
        preguntaId: item.preguntaId,
        puntaje: item.puntaje,
        solucion: item.preguntas.solucion,
      });
    }
  }

  return result;
}

function extractSolucionKind(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.kind === "string" ? candidate.kind : null;
}

function extractSolucionValue(value: unknown): unknown {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  return candidate.value ?? null;
}

async function resolveEstudianteIdFromSession(params: {
  userId?: string | null;
  email?: string | null;
}) {
  const userId = params.userId?.trim();
  const email = params.email?.trim();

  if (userId) {
    const usuarioEstudiante = await prisma.usuariosEstudiantes.findUnique({
      where: { id: userId },
      select: { estudianteId: true },
    });

    if (usuarioEstudiante?.estudianteId) {
      return usuarioEstudiante.estudianteId;
    }

    const estudiante = await prisma.estudiantes.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (estudiante?.id) {
      return estudiante.id;
    }
  }

  if (email) {
    const estudiante = await prisma.estudiantes.findFirst({
      where: {
        usuariosEstudiantes: {
          correo: email,
        },
      },
      select: { id: true },
    });

    if (estudiante?.id) {
      return estudiante.id;
    }
  }

  return null;
}
