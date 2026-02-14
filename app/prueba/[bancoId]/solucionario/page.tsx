import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { BanqueoTipo, PreguntaDificultad, PreguntaEstado, ResultadoRespuesta } from "@/prisma/generated";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { parseRespuesta } from "@/lib/evaluacion-eval";
import SolucionarioClient, {
  type SolucionarioEvaluacion,
  type SolucionarioPregunta,
} from "./client";
import {
  hasActiveProSubscription,
  resolveUsuarioEstudianteIdFromSession,
} from "@/lib/subscription-access";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = {
  bancoId: string;
};

type SearchParams = {
  intentoId?: string;
};

type Props = {
  params: Params | Promise<Params>;
  searchParams?: SearchParams | Promise<SearchParams>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params);
  const banco = await prisma.banqueo.findUnique({
    where: { id: resolvedParams.bancoId },
    select: { titulo: true },
  });

  return {
    title: banco ? `Solucionario: ${banco.titulo}` : "Solucionario",
    description: "Revision de respuestas y soluciones del banqueo.",
  };
}

export default async function SolucionarioPage({ params, searchParams }: Props) {
  const session = await getServerAuthSession();
  if (!session?.user?.id && !session?.user?.email) {
    return notFound();
  }

  const resolvedParams = await Promise.resolve(params);
  if (!resolvedParams?.bancoId) {
    return notFound();
  }

  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const intentoId =
    typeof resolvedSearchParams.intentoId === "string"
      ? resolvedSearchParams.intentoId.trim()
      : "";

  const usuarioEstudianteId = await resolveUsuarioEstudianteIdFromSession({
    userId: session?.user?.id,
    email: session?.user?.email ?? null,
  });
  if (!usuarioEstudianteId) {
    return notFound();
  }
  const hasPro = await hasActiveProSubscription(usuarioEstudianteId);

  const banco = await loadBancoConAcceso(resolvedParams.bancoId);
  if (!banco) {
    return notFound();
  }

  if (banco.tipo === BanqueoTipo.PRO && !hasPro) {
    return notFound();
  }

  const intentoFinal = intentoId
    ? await prisma.intentos.findFirst({
      where: {
        id: intentoId,
        banqueoId: banco.id,
        usuarioEstudianteId,
      },
      include: {
        respuestasIntentos: {
          select: {
            preguntaId: true,
            respuesta: true,
          },
        },
      },
    })
    : await prisma.intentos.findFirst({
      where: {
        banqueoId: banco.id,
        usuarioEstudianteId,
      },
      include: {
        respuestasIntentos: {
          select: {
            preguntaId: true,
            respuesta: true,
          },
        },
      },
      orderBy: [{ actualizadoEn: "desc" }, { creadoEn: "desc" }],
    });

  if (!intentoFinal) {
    return notFound();
  }

  const respuestas = getRespuestasMap(intentoFinal.respuestasIntentos);

  const cohortRows = await prisma.respuestasIntentos.findMany({
    where: {
      intentos: {
        banqueoId: banco.id,
      },
    },
    select: {
      preguntaId: true,
      respuesta: true,
      resultado: true,
      actualizadoEn: true,
      intentos: {
        select: {
          usuarioEstudianteId: true,
          usuariosEstudiantes: {
            select: {
              avatar: true,
              usuario: true,
              correo: true,
              estudiantes: {
                select: {
                  nombre: true,
                  apellido: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      actualizadoEn: "desc",
    },
  });

  const questionMeta = new Map(
    banco.preguntas.map((pregunta) => [
      pregunta.id,
      {
        kind: extractSolucionKind(pregunta.solucion) ?? undefined,
        optionKeys: normalizeOpcionesForStats(pregunta.opciones).map((opt) => normalizeChoiceValue(opt.value)),
      },
    ]),
  );

  const statsByPregunta = new Map<
    string,
    {
      bien: number;
      mal: number;
      omitidas: number;
      total: number;
      optionCounts: Map<string, number>;
      optionRecentResponders: Map<
        string,
        {
          id: string;
          avatar: string | null;
          nombre: string;
        }[]
      >;
    }
  >();

  for (const pregunta of banco.preguntas) {
    const optionCounts = new Map<string, number>();
    const optionRecentResponders = new Map<string, { id: string; avatar: string | null; nombre: string }[]>();
    for (const key of normalizeOpcionesForStats(pregunta.opciones).map((opt) => normalizeChoiceValue(opt.value))) {
      optionCounts.set(key, 0);
      optionRecentResponders.set(key, []);
    }

    statsByPregunta.set(pregunta.id, {
      bien: 0,
      mal: 0,
      omitidas: 0,
      total: 0,
      optionCounts,
      optionRecentResponders,
    });
  }

  for (const row of cohortRows) {
    const stat = statsByPregunta.get(row.preguntaId);
    if (!stat) continue;

    stat.total += 1;
    if (row.resultado === ResultadoRespuesta.BIEN) stat.bien += 1;
    else if (row.resultado === ResultadoRespuesta.MAL) stat.mal += 1;
    else stat.omitidas += 1;

    const meta = questionMeta.get(row.preguntaId);
    const parsed = parseRespuesta(row.respuesta, meta?.kind);

    const selectedValues = Array.isArray(parsed)
      ? parsed.map((item) => normalizeChoiceValue(item))
      : parsed === null
        ? []
        : [normalizeChoiceValue(parsed)];

    for (const value of selectedValues) {
      if (!value) continue;
      const current = stat.optionCounts.get(value) ?? 0;
      stat.optionCounts.set(value, current + 1);

      const userId = row.intentos.usuarioEstudianteId;
      if (!userId) continue;

      const userData = row.intentos.usuariosEstudiantes;
      const nombreCompleto =
        `${userData?.estudiantes?.nombre ?? ""} ${userData?.estudiantes?.apellido ?? ""}`.trim();
      const nombre = nombreCompleto || userData?.usuario || userData?.correo || "Usuario";
      const avatar = userData?.avatar ?? null;

      const currentUsers = stat.optionRecentResponders.get(value) ?? [];
      if (!currentUsers.some((item) => item.id === userId)) {
        currentUsers.push({
          id: userId,
          avatar,
          nombre,
        });
      }
      stat.optionRecentResponders.set(value, currentUsers);
    }
  }

  const evaluacionPayload: SolucionarioEvaluacion = {
    id: banco.id,
    titulo: banco.titulo,
    descripcion: null,
    tipo: banco.tipo,
    gestion:
      banco.preguntas.length > 0
        ? Math.max(...banco.preguntas.map((pregunta) => pregunta.gestion))
        : new Date().getFullYear(),
    intentoId: intentoFinal.id,
  };

  const preguntas: SolucionarioPregunta[] = banco.preguntas.map((pregunta) => {
    const stat = statsByPregunta.get(pregunta.id) ?? {
      bien: 0,
      mal: 0,
      omitidas: 0,
      total: 0,
      optionCounts: new Map<string, number>(),
      optionRecentResponders: new Map<string, { id: string; avatar: string | null; nombre: string }[]>(),
    };
    const optionStats = normalizeOpcionesForStats(pregunta.opciones).map((opt) => {
      const key = normalizeChoiceValue(opt.value);
      const count = stat.optionCounts.get(key) ?? 0;
      const porcentaje = stat.total > 0 ? Math.round((count / stat.total) * 100) : 0;
      const recentResponders = stat.optionRecentResponders.get(key) ?? [];
      return {
        key,
        count,
        porcentaje,
        recentResponders,
      };
    });

    return {
      id: pregunta.id,
      codigo: pregunta.codigo,
      temaNombre: pregunta.temas[0]?.titulo ?? null,
      temaDescripcion: pregunta.temas[0]?.descripcion ?? null,
      enunciado: pregunta.enunciado,
      explicacion: pregunta.explicacion,
      dificultad: pregunta.dificultad ?? PreguntaDificultad.MEDIO,
      tasaAciertoHistorica: pregunta.tasaAcierto ?? 0,
      tipo: inferPreguntaTipo(pregunta.opciones),
      opciones: pregunta.opciones,
      assets: [],
      solucionKind: extractSolucionKind(pregunta.solucion),
      solucionValue: extractSolucionValue(pregunta.solucion),
      stats: {
        bien: stat.bien,
        mal: stat.mal,
        omitidas: stat.omitidas,
        total: stat.total,
        tasaAcierto: stat.total > 0 ? Math.round((stat.bien / stat.total) * 100) : 0,
        optionStats,
      },
    };
  });

  // ─── User reactions (like/dislike) ──────────────────────────────────
  const preguntaIds = preguntas.map((p) => p.id);
  const userReactions = await prisma.reaccionesPreguntas.findMany({
    where: {
      preguntaId: { in: preguntaIds },
      usuarioEstudianteId,
    },
    select: {
      preguntaId: true,
      tipo: true,
    },
  });
  const reaccionesMap: Record<string, "LIKE" | "DISLIKE"> = {};
  for (const r of userReactions) {
    reaccionesMap[r.preguntaId] = r.tipo as "LIKE" | "DISLIKE";
  }

  return (
    <main className="min-h-screen bg-background py-10 text-foreground">
      <SolucionarioClient evaluacion={evaluacionPayload} preguntas={preguntas} respuestas={respuestas} reacciones={reaccionesMap} />
    </main>
  );
}

async function loadBancoConAcceso(bancoId: string) {
  return prisma.banqueo.findFirst({
    where: {
      id: bancoId,
    },
    select: {
      id: true,
      titulo: true,
      tipo: true,
      preguntas: {
        where: {
          estado: PreguntaEstado.DISPONIBLE,
        },
        select: {
          id: true,
          codigo: true,
          enunciado: true,
          explicacion: true,
          dificultad: true,
          tasaAcierto: true,
          opciones: true,
          solucion: true,
          gestion: true,
          temas: {
            select: {
              titulo: true,
              descripcion: true,
            },
            orderBy: {
              titulo: "asc",
            },
          },
        },
      },
    },
  });
}

function getRespuestasMap(
  respuestasIntentos: {
    preguntaId: string;
    respuesta: unknown;
  }[],
) {
  const map: Record<string, string> = {};

  for (const item of respuestasIntentos) {
    if (typeof item.respuesta === "string") {
      map[item.preguntaId] = item.respuesta;
      continue;
    }

    if (typeof item.respuesta === "number" || typeof item.respuesta === "boolean") {
      map[item.preguntaId] = String(item.respuesta);
      continue;
    }

    if (Array.isArray(item.respuesta) || (item.respuesta && typeof item.respuesta === "object")) {
      map[item.preguntaId] = JSON.stringify(item.respuesta);
    }
  }

  return map;
}

function inferPreguntaTipo(opciones: unknown): "ABIERTA" | "CERRADA" {
  return Array.isArray(opciones) && opciones.length > 0 ? "CERRADA" : "ABIERTA";
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

function normalizeChoiceValue(value: unknown): string {
  if (value && typeof value === "object") {
    const candidate = value as Record<string, unknown>;
    if (candidate.value !== undefined) return String(candidate.value).trim().toLowerCase();
    if (candidate.url !== undefined) return String(candidate.url).trim().toLowerCase();
  }
  return String(value ?? "").trim().toLowerCase();
}

function normalizeOpcionesForStats(opciones: unknown): { value: string }[] {
  if (!Array.isArray(opciones)) return [];
  return opciones
    .map((item) => {
      if (item && typeof item === "object") {
        const candidate = item as Record<string, unknown>;
        const rawValue = candidate.value;
        const rawUrl = candidate.url;
        const value =
          typeof rawValue === "string" || typeof rawValue === "number"
            ? String(rawValue)
            : typeof rawUrl === "string"
              ? rawUrl
              : "";
        return value ? { value } : null;
      }
      if (typeof item === "string" || typeof item === "number") {
        return { value: String(item) };
      }
      return null;
    })
    .filter((item): item is { value: string } => item !== null);
}
