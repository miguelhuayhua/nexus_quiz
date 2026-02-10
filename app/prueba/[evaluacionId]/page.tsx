import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import EvaluacionTake, { type EvaluacionForClient } from "./client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = {
  evaluacionId: string;
};

type Props = {
  params: Params | Promise<Params>;
};

type PreguntaAsset = NonNullable<
  EvaluacionForClient["preguntas"][number]["assets"]
>[number];
type PreguntaOption = {
  label: string;
  value: string;
  kind?: string;
  alt?: string;
};

function isPreguntaAsset(value: unknown): value is PreguntaAsset {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;
  const alt = candidate.alt;
  const title = candidate.title;
  const orden = candidate.orden;

  return (
    typeof candidate.kind === "string" &&
    typeof candidate.url === "string" &&
    (alt === undefined || typeof alt === "string") &&
    (title === undefined || typeof title === "string") &&
    (orden === undefined || typeof orden === "number")
  );
}

function normalizeAssets(value: unknown): PreguntaAsset[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isPreguntaAsset);
}

function normalizeOpciones(value: unknown): PreguntaOption[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): PreguntaOption | null => {
      if (item && typeof item === "object") {
        const candidate = item as Record<string, unknown>;
        const rawValue = candidate.value;
        const rawLabel = candidate.label;

        const optionValue =
          typeof rawValue === "string" || typeof rawValue === "number"
            ? String(rawValue)
            : null;
        if (!optionValue) return null;

        return {
          label:
            typeof rawLabel === "string" && rawLabel.trim().length > 0
              ? rawLabel
              : optionValue,
          value: optionValue,
          kind:
            typeof candidate.kind === "string" ? candidate.kind : undefined,
          alt: typeof candidate.alt === "string" ? candidate.alt : undefined,
        };
      }

      if (typeof item === "string" || typeof item === "number") {
        return {
          label: String(item),
          value: String(item),
        };
      }

      return null;
    })
    .filter((item): item is PreguntaOption => item !== null);
}

export default async function EvaluacionPage({ params }: Props) {
  const session = await getServerAuthSession();

  if (!session?.user?.id && !session?.user?.email) {
    return notFound();
  }

  const resolvedParams = await Promise.resolve(params);
  if (!resolvedParams?.evaluacionId) {
    return notFound();
  }

  const estudianteId = await resolveEstudianteIdFromSession({
    userId: session?.user?.id,
    email: session?.user?.email ?? null,
  });

  if (!estudianteId) {
    return notFound();
  }

  const evaluacion = await loadEvaluacionConAcceso(
    resolvedParams.evaluacionId,
    estudianteId,
  );

  if (!evaluacion) {
    return notFound();
  }

  await prisma.evaluacionIntentos.updateMany({
    where: {
      evaluacionId: evaluacion.id,
      estudianteId,
      estado: "EN_PROGRESO",
    },
    data: {
      estado: "ANULADO",
      actualizadoEn: new Date(),
    },
  });

  const now = new Date();
  const intentoActivo = await prisma.evaluacionIntentos.create({
    data: {
      id: randomUUID(),
      estudianteId,
      evaluacionId: evaluacion.id,
      estado: "EN_PROGRESO",
      iniciadoEn: now,
      actualizadoEn: now,
      vence_en: new Date(now.getTime() + evaluacion.tiempo_segundos * 1000),
      tiempoConsumido: 0,
      progreso: {
        respuestas: {},
        guardadoEn: now.toISOString(),
      },
    },
  });

  const savedResponses: Record<string, string> = {};
  const initialTimeLeft = intentoActivo.vence_en
    ? Math.max(
        Math.floor((intentoActivo.vence_en.getTime() - new Date().getTime()) / 1000),
        0,
      )
    : evaluacion.tiempo_segundos;

  const payload: EvaluacionForClient = {
    id: evaluacion.id,
    titulo: evaluacion.titulo,
    descripcion: evaluacion.descripcion,
    tipo: evaluacion.tipo,
    estado: evaluacion.estado,
    gestion: evaluacion.gestion,
    tiempoSegundos: evaluacion.tiempo_segundos,
    initialTimeLeft,
    savedResponses,
    intentoId: intentoActivo.id,
    areas: evaluacion.areas,
    capitulos: evaluacion.capitulos,
    preguntas: getPreguntasFromTemas(evaluacion.temas),
  };

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 lg:px-10">
      <EvaluacionTake evaluacion={payload} />
    </main>
  );
}

async function loadEvaluacionConAcceso(evaluacionId: string, estudianteId: string) {
  return prisma.evaluaciones.findFirst({
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
    include: {
      temas: {
        orderBy: {
          nombre: "asc",
        },
        include: {
          temaPreguntas: {
            where: {
              preguntas: {
                estado: "DISPONIBLE",
              },
            },
            orderBy: {
              orden: "asc",
            },
            include: {
              preguntas: {
                select: {
                  id: true,
                  codigo: true,
                  enunciado: true,
                  explicacion: true,
                  tipo: true,
                  opciones: true,
                  assets: true,
                  solucion: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

type EvaluacionConAcceso = NonNullable<
  Awaited<ReturnType<typeof loadEvaluacionConAcceso>>
>;

function getPreguntasFromTemas(
  temas: EvaluacionConAcceso["temas"],
) {
  const seen = new Set<string>();
  const preguntas: EvaluacionForClient["preguntas"] = [];

  for (const tema of temas) {
    for (const item of tema.temaPreguntas) {
      const pregunta = item.preguntas;
      if (seen.has(pregunta.id)) continue;
      seen.add(pregunta.id);

      preguntas.push({
        id: pregunta.id,
        codigo: pregunta.codigo,
        temaNombre: tema.nombre,
        temaDescripcion: tema.descripcion,
        enunciado: pregunta.enunciado,
        tipo: pregunta.tipo,
        opciones: normalizeOpciones(pregunta.opciones),
        assets: normalizeAssets(pregunta.assets),
        solucionKind: extractSolucionKind(pregunta.solucion),
      });
    }
  }

  return preguntas;
}

function extractSolucionKind(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const kind = candidate.kind;
  return typeof kind === "string" && kind.trim().length > 0 ? kind : null;
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


