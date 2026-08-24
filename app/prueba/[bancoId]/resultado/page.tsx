import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { BanqueoTipo, PreguntaDificultad, PreguntaEstado, ResultadoRespuesta } from "@/prisma/generated";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { compareRespuesta, normalizeSolucion, parseRespuesta } from "@/lib/evaluacion-eval";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResultadoInsights } from "../estadisticas/resultado-insights";
import { ResultadoPie } from "../estadisticas/resultado-chart";
import {
  hasActiveProSubscription,
  resolveUsuarioEstudianteIdFromSession,
} from "@/lib/subscription-access";
import SolucionarioClient from "./client";

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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params);
  const banco = await prisma.banqueo.findUnique({
    where: { id: resolvedParams.bancoId },
    select: { titulo: true },
  });

  return {
    title: banco ? `Resultado: ${banco.titulo}` : "Resultado",
    description: "Resultados finales, estadisticas y ranking del banqueo.",
  };
}

export type SolucionarioEvaluacion = {
  id: string;
  titulo: string;
  descripcion?: string | null;
  tipo: string;
  gestion: number;
  intentoId?: string;
};
type PreguntaTipo = "ABIERTA" | "CERRADA";

export type SolucionarioPregunta = {
  id: string;
  codigo: string;
  temaNombre?: string | null;
  temaDescripcion?: string | null;
  enunciado: string;
  explicacion?: string | null;
  tipo: PreguntaTipo;
  opciones?: any;
  assets?: any;
  solucionKind?: string | null;
  solucionValue?: any;
  dificultad?: "DIFICIL" | "MEDIO" | "SENCILLO";
  tasaAciertoHistorica?: number;
  stats: {
    bien: number;
    mal: number;
    omitidas: number;
    total: number;
    tasaAcierto: number;
    optionStats: {
      key: string;
      count: number;
      porcentaje: number;
      recentResponders: {
        id: string;
        avatar: string | null;
        nombre: string;
      }[];
    }[];
  };
};
type Resumen = {
  total: number;
  correctas: number;
  incorrectas: number;
  sinResponder: number;
  porcentaje: number;
  puntosAcumulados: number;
  totalPuntos: number;
  tiempoEmpleado: number;
};

type PreguntaItem = {
  preguntaId: string;
  codigo: string;
  enunciado: string;
  solucion: unknown;
};

type ComparativoResumen = {
  yo: {
    puntaje: number;
    porcentaje: number;
    tiempo: number;
    correctas: number;
    incorrectas: number;
    sinResponder: number;
  };
  otros: {
    disponibles: number;
    puntajePromedio: number;
    porcentajePromedio: number;
    tiempoPromedio: number;
    correctasPromedio: number;
    incorrectasPromedio: number;
  };
  delta: {
    puntaje: number;
    porcentaje: number;
    tiempo: number;
  };
  ranking: {
    posicion: number;
    total: number;
    percentil: number;
  };
};

function normalizeChoiceValue(value: unknown): string {
  if (value && typeof value === "object") {
    const candidate = value as Record<string, unknown>;
    if (candidate.value !== undefined) return String(candidate.value).trim().toLowerCase();
    if (candidate.url !== undefined) return String(candidate.url).trim().toLowerCase();
  }
  return String(value ?? "").trim().toLowerCase();
}
function inferPreguntaTipo(opciones: unknown): "ABIERTA" | "CERRADA" {
  return Array.isArray(opciones) && opciones.length > 0 ? "CERRADA" : "ABIERTA";
}
export default async function EvaluacionResultadoPage({ params, searchParams }: Props) {


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
            resultado: true,

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
            resultado: true,
          },
        },
      },
      orderBy: [{ actualizadoEn: "desc" }, { creadoEn: "desc" }],
    });

  if (!intentoFinal) {
    return notFound();
  }


  const cohortRows = await prisma.respuestasIntentos.findMany({
    where: {
      intentos: {
        banqueoId: banco.id,
        usuarioEstudianteId: {
          not: usuarioEstudianteId,
        },
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
      if (currentUsers.length < 5 && !currentUsers.some((item) => item.id === userId)) {
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

  const respuestas = getRespuestasMap(intentoFinal.respuestasIntentos);
  const resumen = buildResumen(preguntas, intentoFinal.respuestasIntentos, intentoFinal.tiempoDuracion);



  return (
    <main className="min-h-screen p-4 py-10 space-y-4 max-w-5xl mx-auto">

      <h1 className="text-center text-3xl">{banco.titulo}</h1>

      <div className="flex w-full flex-wrap justify-center gap-6">
        <Stat title="Progreso" value={`${resumen.total - resumen.sinResponder} / ${resumen.total}`} />
        <Stat
          title="Correctas"
          value={String(resumen.correctas)}
          valueClassName="text-emerald-600 dark:text-emerald-400"
        />
        <Stat title="Incorrectas" value={String(resumen.incorrectas)} valueClassName="text-destructive" />
        <Stat title="Tiempo" value={formatDuration(resumen.tiempoEmpleado)} />
      </div>

      <ResultadoPie
        porcentaje={resumen.porcentaje}
        puntos={resumen.puntosAcumulados}
        total={resumen.totalPuntos}
      />

      <div className="flex flex-wrap justify-center gap-2">
        <Button
          variant={'secondary'}
          render={<Link href={`/prueba/${banco.id}/estadisticas?intentoId=${intentoFinal.id}`} />}>
          Ver estadísticas
        </Button>
        <Button variant="outline" render={<Link href="/banqueos" />}>
          Volver a banqueos
        </Button>
      </div>
      <h2 className="text-3xl text-center my-10">
        Solucionario
      </h2>
      <SolucionarioClient evaluacion={evaluacionPayload} preguntas={preguntas} respuestas={respuestas} reacciones={reaccionesMap} />

    </main>
  );
}

function Stat({
  title,
  value,
  valueClassName,
}: {
  title: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="text-center">
      <p className="mb-1 text-sm text-muted-foreground">{title}</p>
      <p className={`text-3xl font-medium ${valueClassName ?? "text-foreground"}`}>{value}</p>
    </div>
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
          areas: true,
          capitulos: true,
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
function getPreguntasFromBanco(
  preguntas: {
    id: string;
    codigo: string;
    enunciado: string;
    solucion: unknown;
  }[],
) {
  return preguntas.map((pregunta) => ({
    preguntaId: pregunta.id,
    codigo: pregunta.codigo,
    enunciado: pregunta.enunciado,
    solucion: pregunta.solucion,
  }));
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

function buildResumen(
  preguntas: SolucionarioPregunta[],
  respuestasIntentos: {
    resultado: ResultadoRespuesta;
  }[],
  tiempoConsumido: number,
): Resumen {
  const total = preguntas.length;
  const totalPuntos = total;

  const correctas = respuestasIntentos.filter((item) => item.resultado === ResultadoRespuesta.BIEN)
    .length;
  const incorrectas = respuestasIntentos.filter((item) => item.resultado === ResultadoRespuesta.MAL)
    .length;
  const sinResponder = Math.max(0, total - correctas - incorrectas);
  const puntosAcumulados = correctas;

  const porcentaje = totalPuntos > 0 ? Math.round((puntosAcumulados / totalPuntos) * 100) : 0;

  const tiempoEmpleado =
    Number.isFinite(tiempoConsumido) && tiempoConsumido > 0
      ? tiempoConsumido
      : 0;

  return {
    total,
    correctas,
    incorrectas,
    sinResponder,
    porcentaje,
    puntosAcumulados,
    totalPuntos,
    tiempoEmpleado,
  };
}

function buildPreguntaStats(
  preguntas: PreguntaItem[],
  cohortIntentos: {
    respuestasIntentos: {
      preguntaId: string;
      esCorrecta: boolean | null;
    }[];
  }[],
  respuestas: Record<string, string>,
) {
  const stats = new Map<string, { bien: number; mal: number }>();
  for (const pregunta of preguntas) {
    stats.set(pregunta.preguntaId, { bien: 0, mal: 0 });
  }

  for (const intento of cohortIntentos) {
    for (const respuesta of intento.respuestasIntentos) {
      const entry = stats.get(respuesta.preguntaId);
      if (!entry) continue;
      if (respuesta.esCorrecta === true) {
        entry.bien += 1;
      } else if (respuesta.esCorrecta === false) {
        entry.mal += 1;
      }
    }
  }

  return preguntas.map((pregunta) => {
    const entry = stats.get(pregunta.preguntaId) ?? { bien: 0, mal: 0 };
    const totalRespondida = entry.bien + entry.mal;
    const porcentajeAcierto =
      totalRespondida > 0 ? Math.round((entry.bien / totalRespondida) * 100) : 0;
    const porcentajeError = totalRespondida > 0 ? 100 - porcentajeAcierto : 0;

    const miRespuesta = respuestas[pregunta.preguntaId]?.trim() ?? "";
    let miEstado: "BIEN" | "MAL" | "SIN_RESPONDER" = "SIN_RESPONDER";

    if (miRespuesta) {
      const kind = extractSolucionKind(pregunta.solucion);
      const user = parseRespuesta(miRespuesta, kind ?? undefined);
      const correct = normalizeSolucion(
        extractSolucionValue(pregunta.solucion),
        kind ?? undefined,
      );
      const esCorrecta =
        user !== null && correct !== null
          ? compareRespuesta(user, correct)
          : false;
      miEstado = esCorrecta ? "BIEN" : "MAL";
    }

    return {
      preguntaId: pregunta.preguntaId,
      codigo: pregunta.codigo,
      enunciado: pregunta.enunciado,
      bien: entry.bien,
      mal: entry.mal,
      totalIntentos: totalRespondida,
      porcentajeAcierto,
      porcentajeError,
      miEstado,
    };
  });
}

function buildRanking(params: {
  cohortIntentos: {
    id: string;
    usuarioEstudianteId: string | null;
    tiempoDuracion: number;
    correctas: number;
    incorrectas: number;
    usuariosEstudiantes: {
      id: string;
      avatar: string | null;
      usuario: string;
      correo: string;
      estudiantes: {
        nombre: string;
        apellido: string | null;
      } | null;
    } | null;
  }[];
}) {
  const grouped = new Map<
    string,
    {
      estudianteId: string;
      nombre: string;
      avatar: string | null;
      intentos: number;
      correctas: number;
      incorrectas: number;
      puntos: number;
      tiempoSum: number;
    }
  >();

  for (const item of params.cohortIntentos.slice(0, 300)) {
    const user = item.usuariosEstudiantes;
    const nombreCompleto = `${user?.estudiantes?.nombre ?? ""} ${user?.estudiantes?.apellido ?? ""}`.trim();
    const nombre = nombreCompleto || user?.usuario || user?.correo || `Intento ${item.id.slice(0, 6)}`;
    const key = user?.id ?? item.id;
    const current = grouped.get(key) ?? {
      estudianteId: key,
      nombre,
      avatar: user?.avatar ?? null,
      intentos: 0,
      correctas: 0,
      incorrectas: 0,
      puntos: 0,
      tiempoSum: 0,
    };
    current.intentos += 1;
    current.correctas += item.correctas;
    current.incorrectas += item.incorrectas;
    current.puntos += item.correctas;
    current.tiempoSum += Math.max(0, Math.floor(item.tiempoDuracion));
    if (!current.avatar && user?.avatar) current.avatar = user.avatar;
    grouped.set(key, current);
  }

  const rows = Array.from(grouped.values()).map((item) => {
    const respondidas = item.correctas + item.incorrectas;
    const porcentaje = respondidas > 0 ? Math.round((item.correctas / respondidas) * 100) : 0;
    const tiempoPromedio = item.intentos > 0 ? Math.round(item.tiempoSum / item.intentos) : 0;

    return {
      estudianteId: item.estudianteId,
      nombre: item.nombre,
      avatar: item.avatar,
      intentos: item.intentos,
      correctas: item.correctas,
      incorrectas: item.incorrectas,
      puntos: item.puntos,
      porcentaje,
      tiempoPromedio,
    };
  });

  rows.sort((a, b) => {
    if (b.puntos !== a.puntos) return b.puntos - a.puntos;
    if (b.porcentaje !== a.porcentaje) return b.porcentaje - a.porcentaje;
    return a.tiempoPromedio - b.tiempoPromedio;
  });

  return rows.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));
}

function getInitial(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 1).toUpperCase() : "U";
}

function extractSolucionKind(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.kind === "string" ? candidate.kind : null;
}

function buildComparativo(params: {
  resumen: Resumen;
  intentoFinal: {
    id: string;
    usuarioEstudianteId: string | null;
    correctas: number;
    incorrectas: number;
    tiempoDuracion: number;
  };
  cohortIntentos: {
    id: string;
    usuarioEstudianteId: string | null;
    tiempoDuracion: number;
    correctas: number;
    incorrectas: number;
  }[];
}): ComparativoResumen {
  const { resumen, intentoFinal, cohortIntentos } = params;

  const otros = cohortIntentos.filter((item) => {
    if (item.id === intentoFinal.id) return false;
    if (intentoFinal.usuarioEstudianteId) {
      return item.usuarioEstudianteId !== intentoFinal.usuarioEstudianteId;
    }
    return true;
  });

  const safeAvg = (values: number[]) => {
    if (values.length === 0) return 0;
    return values.reduce((acc, value) => acc + value, 0) / values.length;
  };

  const otrosPuntaje = safeAvg(otros.map((item) => item.correctas));
  const otrosCorrectas = safeAvg(otros.map((item) => item.correctas));
  const otrosIncorrectas = safeAvg(otros.map((item) => item.incorrectas));
  const otrosTiempo = safeAvg(otros.map((item) => Math.max(0, item.tiempoDuracion)));
  const otrosPorcentaje = safeAvg(
    otros.map((item) => {
      const respondidas = item.correctas + item.incorrectas;
      return respondidas > 0 ? (item.correctas / respondidas) * 100 : 0;
    }),
  );

  const ordered = [...cohortIntentos].sort((a, b) => {
    if (b.correctas !== a.correctas) return b.correctas - a.correctas;
    const porA =
      a.correctas + a.incorrectas > 0 ? (a.correctas / (a.correctas + a.incorrectas)) * 100 : 0;
    const porB =
      b.correctas + b.incorrectas > 0 ? (b.correctas / (b.correctas + b.incorrectas)) * 100 : 0;
    if (porB !== porA) return porB - porA;
    return a.tiempoDuracion - b.tiempoDuracion;
  });

  const posicion = Math.max(1, ordered.findIndex((item) => item.id === intentoFinal.id) + 1);
  const total = Math.max(1, ordered.length);
  const percentil = Math.round(((total - posicion) / total) * 100);

  return {
    yo: {
      puntaje: resumen.puntosAcumulados,
      porcentaje: resumen.porcentaje,
      tiempo: resumen.tiempoEmpleado,
      correctas: resumen.correctas,
      incorrectas: resumen.incorrectas,
      sinResponder: resumen.sinResponder,
    },
    otros: {
      disponibles: otros.length,
      puntajePromedio: otrosPuntaje,
      porcentajePromedio: otrosPorcentaje,
      tiempoPromedio: otrosTiempo,
      correctasPromedio: otrosCorrectas,
      incorrectasPromedio: otrosIncorrectas,
    },
    delta: {
      puntaje: resumen.puntosAcumulados - otrosPuntaje,
      porcentaje: resumen.porcentaje - otrosPorcentaje,
      tiempo: resumen.tiempoEmpleado - otrosTiempo,
    },
    ranking: {
      posicion,
      total,
      percentil,
    },
  };
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

function formatDuration(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;

  const hStr = h.toString().padStart(2, "0");
  const mStr = m.toString().padStart(2, "0");
  const sStr = s.toString().padStart(2, "0");

  return h > 0 ? `${hStr}:${mStr}:${sStr}` : `${mStr}:${sStr}`;
}

function buildRespuestasGlobales(params: {
  cohortIntentos: {
    correctas: number;
    incorrectas: number;
  }[];
  totalPreguntas: number;
}) {
  const totalPreguntas = Math.max(0, params.totalPreguntas);
  const bien = params.cohortIntentos.reduce((acc, item) => acc + Math.max(0, item.correctas), 0);
  const mal = params.cohortIntentos.reduce((acc, item) => acc + Math.max(0, item.incorrectas), 0);
  const totalEsperado = params.cohortIntentos.length * totalPreguntas;
  const sinResponder = Math.max(0, totalEsperado - bien - mal);

  return { bien, mal, sinResponder };
}
