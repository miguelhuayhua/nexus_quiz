import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { BanqueoTipo, PreguntaEstado, ResultadoRespuesta } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { compareRespuesta, normalizeSolucion, parseRespuesta } from "@/lib/evaluacion-eval";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResultadoInsights } from "./resultado-insights";
import { ResultadoPie } from "./resultado-chart";
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
    title: banco ? `Resultado: ${banco.titulo}` : "Resultado",
    description: "Resultados finales, estadisticas y ranking del banqueo.",
  };
}

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
              esCorrecta: true,
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
              esCorrecta: true,
              resultado: true,
            },
          },
        },
        orderBy: [{ actualizadoEn: "desc" }, { creadoEn: "desc" }],
      });

  if (!intentoFinal) {
    return notFound();
  }

  const respuestas = getRespuestasMap(intentoFinal.respuestasIntentos);
  const preguntas = getPreguntasFromBanco(banco.preguntas);
  const resumen = buildResumen(preguntas, intentoFinal.respuestasIntentos, intentoFinal.tiempoDuracion);

  const cohortIntentos = await prisma.intentos.findMany({
    where: {
      banqueoId: banco.id,
    },
    select: {
      id: true,
      usuarioEstudianteId: true,
      tiempoDuracion: true,
      correctas: true,
      incorrectas: true,
      creadoEn: true,
      respuestasIntentos: {
        select: {
          preguntaId: true,
          esCorrecta: true,
        },
      },
      usuariosEstudiantes: {
        select: {
          id: true,
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
    orderBy: [{ actualizadoEn: "desc" }, { creadoEn: "desc" }],
  });

  const preguntaStats = buildPreguntaStats(preguntas, cohortIntentos, respuestas);
  const ranking = buildRanking({ cohortIntentos });
  const nivelLabel = banco.tipo === BanqueoTipo.PRO ? "PRO" : "BASIC";
  const comparativo = buildComparativo({
    resumen,
    intentoFinal: {
      id: intentoFinal.id,
      usuarioEstudianteId: intentoFinal.usuarioEstudianteId ?? null,
      correctas: intentoFinal.correctas,
      incorrectas: intentoFinal.incorrectas,
      tiempoDuracion: intentoFinal.tiempoDuracion,
    },
    cohortIntentos,
  });
  const respuestasGlobales = buildRespuestasGlobales({
    cohortIntentos: cohortIntentos.map((item) => ({
      correctas: item.correctas,
      incorrectas: item.incorrectas,
    })),
    totalPreguntas: preguntas.length,
  });

  const areas = Array.from(
    new Set(banco.preguntas.flatMap((pregunta) => pregunta.areas.map((item) => item.titulo))),
  );
  const capitulos = Array.from(
    new Set(banco.preguntas.flatMap((pregunta) => pregunta.capitulos.map((item) => item.titulo))),
  );

  return (
    <main className="min-h-screen bg-background px-6 py-10 sm:px-10">
      <div className="mx-auto container">
        <div className="mb-2 flex w-full justify-end">
          <ModeToggle />
        </div>
        <div className="flex flex-col items-center gap-4">
          <header className="flex flex-col items-center gap-4">
            <Badge variant="outline">{nivelLabel}</Badge>
            <Label className="text-center">Resultado Final</Label>
            <h1 className="text-center text-2xl font-bold">{banco.titulo}</h1>
          </header>

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
        </div>

        <div className="mx-auto mt-4 flex w-full max-w-3xl flex-col items-center gap-8">
          <ResultadoPie
            porcentaje={resumen.porcentaje}
            puntos={resumen.puntosAcumulados}
            total={resumen.totalPuntos}
          />

          <div className="flex flex-wrap justify-center gap-2">
            <Button render={<Link href={`/prueba/${banco.id}/solucionario?intentoId=${intentoFinal.id}`} />}>
              Ver solucionario
            </Button>
            <Button variant="outline" render={<Link href="/banqueos" />}>
              Volver a banqueos
            </Button>
          </div>

          <div className="w-full space-y-4">
            <h3 className="text-center text-lg font-bold">Detalles Banqueo</h3>

            <div className="grid grid-cols-1 divide-y rounded-xl border bg-muted/5 md:grid-cols-2 md:divide-x md:divide-y-0">
              <div className="space-y-2 p-6">
                <Label className="text-sm">Areas</Label>
                <div className="flex flex-wrap gap-2">
                  {areas.map((item) => (
                    <Badge key={item} variant="outline">
                      {item}
                    </Badge>
                  ))}
                  {areas.length === 0 && (
                    <span className="text-sm italic text-muted-foreground">No asignado</span>
                  )}
                </div>
              </div>

              <div className="space-y-2 p-6">
                <Label className="text-sm">Capitulos</Label>
                <div className="flex flex-wrap gap-2">
                  {capitulos.map((item) => (
                    <Badge key={item} variant="outline">
                      {item}
                    </Badge>
                  ))}
                  {capitulos.length === 0 && (
                    <span className="text-sm italic text-muted-foreground">No asignado</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Tabs className="w-full" defaultValue="estadisticas">
            <TabsList className="mx-auto">
              <TabsTrigger value="estadisticas">Estadisticas</TabsTrigger>
              <TabsTrigger value="ranking">Ranking</TabsTrigger>
            </TabsList>

            <TabsContent className="w-full space-y-3 pt-2" value="estadisticas">
              <h3 className="text-center text-lg font-bold">Estadistica por pregunta</h3>
              <ResultadoInsights
                preguntaStats={preguntaStats}
                ranking={ranking}
                comparativo={comparativo}
                respuestasGlobales={respuestasGlobales}
              />

              <div className="grid gap-3 md:grid-cols-3">
                <StatComparativo
                  title="Puntaje vs demás"
                  yo={`${comparativo.yo.puntaje}`}
                  promedio={`${comparativo.otros.puntajePromedio.toFixed(1)}`}
                  delta={comparativo.delta.puntaje}
                />
                <StatComparativo
                  title="Acierto % vs demás"
                  yo={`${comparativo.yo.porcentaje}%`}
                  promedio={`${comparativo.otros.porcentajePromedio.toFixed(1)}%`}
                  delta={comparativo.delta.porcentaje}
                />
                <StatComparativo
                  title="Tiempo vs demás"
                  yo={formatDuration(comparativo.yo.tiempo)}
                  promedio={formatDuration(Math.round(comparativo.otros.tiempoPromedio))}
                  delta={-comparativo.delta.tiempo}
                  invert
                />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <Stat
                  title="Posicion actual"
                  value={`${comparativo.ranking.posicion} / ${comparativo.ranking.total}`}
                />
                <Stat title="Percentil" value={`${comparativo.ranking.percentil}%`} />
                <Stat title="Intentos de otros estudiantes" value={String(comparativo.otros.disponibles)} />
              </div>
              <p className="text-center text-muted-foreground text-sm">
                Corresponde a intentos de otros estudiantes usados para comparar tus resultados.
              </p>

              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30 text-left">
                      <th className="px-3 py-2">Pregunta</th>
                      <th className="px-3 py-2 text-center">Bien</th>
                      <th className="px-3 py-2 text-center">Mal</th>
                      <th className="px-3 py-2 text-center">Intentos</th>
                      <th className="px-3 py-2 text-center">Acierto</th>
                      <th className="px-3 py-2 text-center">Error</th>
                      <th className="px-3 py-2 text-center">Tu resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preguntaStats.map((item) => (
                      <tr className="border-b last:border-0" key={item.preguntaId}>
                        <td className="px-3 py-2">
                          <p className="font-medium">{item.codigo}</p>
                          <p className="line-clamp-1 text-muted-foreground text-xs">{item.enunciado}</p>
                        </td>
                        <td className="px-3 py-2 text-center text-emerald-600">{item.bien}</td>
                        <td className="px-3 py-2 text-center text-destructive">{item.mal}</td>
                        <td className="px-3 py-2 text-center">{item.totalIntentos}</td>
                        <td className="px-3 py-2 text-center">{item.porcentajeAcierto}%</td>
                        <td className="px-3 py-2 text-center">{item.porcentajeError}%</td>
                        <td className="px-3 py-2 text-center">
                          <Badge
                            variant={
                              item.miEstado === "BIEN"
                                ? "success"
                                : item.miEstado === "MAL"
                                  ? "destructive"
                                  : "outline"
                            }
                          >
                            {item.miEstado === "BIEN"
                              ? "Bien"
                              : item.miEstado === "MAL"
                                ? "Fallada"
                                : "Sin responder"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent className="w-full space-y-3 pt-2" value="ranking">
              <h3 className="text-center text-lg font-bold">Ranking global</h3>
              <p className="text-center text-muted-foreground text-sm">
                Ordenado por puntaje y tiempo en intentos recientes del banqueo.
              </p>
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30 text-left">
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Estudiante</th>
                      <th className="px-3 py-2 text-center">Intentos</th>
                      <th className="px-3 py-2 text-center">Aciertos</th>
                      <th className="px-3 py-2 text-center">Puntos</th>
                      <th className="px-3 py-2 text-center">Acierto %</th>
                      <th className="px-3 py-2 text-center">Tiempo prom.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map((item) => (
                      <tr className="border-b last:border-0" key={item.estudianteId}>
                        <td className="px-3 py-2 font-semibold">{item.rank}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="size-8">
                              <AvatarImage alt={item.nombre} src={item.avatar ?? ""} />
                              <AvatarFallback>{getInitial(item.nombre)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{item.nombre}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center">{item.intentos}</td>
                        <td className="px-3 py-2 text-center font-semibold text-emerald-600">{item.correctas}</td>
                        <td className="px-3 py-2 text-center">{item.puntos}</td>
                        <td className="px-3 py-2 text-center">{item.porcentaje}%</td>
                        <td className="px-3 py-2 text-center">{formatDuration(item.tiempoPromedio)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
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
      <p className="mb-1 text-xs font-bold text-muted-foreground">{title}</p>
      <p className={`text-2xl font-bold ${valueClassName ?? "text-foreground"}`}>{value}</p>
    </div>
  );
}

function StatComparativo({
  title,
  yo,
  promedio,
  delta,
  invert = false,
}: {
  title: string;
  yo: string;
  promedio: string;
  delta: number;
  invert?: boolean;
}) {
  const isGood = invert ? delta >= 0 : delta >= 0;
  return (
    <div className="rounded-lg border p-3">
      <p className="mb-2 text-xs font-semibold text-muted-foreground">{title}</p>
      <p className="text-sm">Tu resultado: <span className="font-semibold">{yo}</span></p>
      <p className="text-sm text-muted-foreground">
        Prom. de los demás: <span className="font-semibold text-foreground">{promedio}</span>
      </p>
      <p className={`mt-2 text-xs font-semibold ${isGood ? "text-emerald-600" : "text-destructive"}`}>
        {delta >= 0 ? "+" : ""}
        {delta.toFixed(1)} {invert ? "seg vs promedio" : "vs promedio"}
      </p>
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
          solucion: true,
          areas: {
            select: {
              titulo: true,
            },
          },
          capitulos: {
            select: {
              titulo: true,
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
  preguntas: PreguntaItem[],
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
