import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { compareRespuesta, normalizeSolucion, parseRespuesta } from "@/lib/evaluacion-eval";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ResultadoPie } from "./resultado-chart";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = {
  evaluacionId: string;
};

type Props = {
  params: Params | Promise<Params>;
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

export default async function EvaluacionResultadoPage({ params }: Props) {
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

  const evaluacion = await loadEvaluacionConAcceso(resolvedParams.evaluacionId, estudianteId);
  if (!evaluacion) {
    return notFound();
  }

  const intentoFinal = await prisma.evaluacionIntentos.findFirst({
    where: {
      evaluacionId: evaluacion.id,
      estudianteId,
      estado: { in: ["ENVIADO", "EXPIRADO"] },
    },
    orderBy: [{ enviadoEn: "desc" }, { iniciadoEn: "desc" }],
  });

  if (!intentoFinal) {
    return notFound();
  }

  const respuestas =
    intentoFinal.progreso &&
    typeof intentoFinal.progreso === "object" &&
    "respuestas" in intentoFinal.progreso
      ? (intentoFinal.progreso.respuestas as Record<string, string>)
      : {};

  const preguntas = getPreguntasFromTemas(evaluacion.temas);
  const resumen = buildResumen(
    preguntas,
    respuestas,
    intentoFinal.tiempoConsumido,
    intentoFinal.iniciadoEn,
    intentoFinal.enviadoEn,
  );

  const areas = getMetaList(evaluacion.areas);
  const capitulos = getMetaList(evaluacion.capitulos);

  return (
    <main className="min-h-screen bg-background px-6 py-10 sm:px-10">
      <div className="mx-auto container">
        <div className="flex flex-col items-center gap-4">
          <header className="flex flex-col items-center gap-4">
            <Badge variant="outline">{evaluacion.tipo}</Badge>
            <Label className="text-center">Resultado Final</Label>
            <h1 className="text-center text-2xl font-bold">{evaluacion.titulo}</h1>
          </header>

          <div className="flex w-full flex-wrap justify-center gap-6">
            <Stat title="Progreso" value={`${resumen.total - resumen.sinResponder} / ${resumen.total}`} />
            <Stat title="Correctas" value={String(resumen.correctas)} valueClassName="text-emerald-600 dark:text-emerald-400" />
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
            <Button asChild>
              <Link href={`/prueba/${evaluacion.id}/solucionario`}>Ver solucionario</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={`/prueba/${evaluacion.id}`}>Intentar otra prueba</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/evaluaciones">Volver a evaluaciones</Link>
            </Button>
          </div>

          <div className="w-full space-y-4">
            <h3 className="text-center text-lg font-bold">Detalles Evaluación</h3>

            <div className="grid grid-cols-1 divide-y rounded-xl border bg-muted/5 md:grid-cols-2 md:divide-x md:divide-y-0">
              <div className="space-y-2 p-6">
                <Label className="text-sm">Áreas</Label>
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
                <Label className="text-sm">Capítulos</Label>
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
    select: {
      id: true,
      titulo: true,
      tipo: true,
      areas: true,
      capitulos: true,
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

function getPreguntasFromTemas(
  temas: {
    temaPreguntas: {
      preguntaId: string;
      puntaje: number;
      preguntas: { solucion: unknown };
    }[];
  }[],
) {
  const seen = new Set<string>();
  const preguntas: { preguntaId: string; puntaje: number; solucion: unknown }[] = [];

  for (const tema of temas) {
    for (const item of tema.temaPreguntas) {
      if (seen.has(item.preguntaId)) continue;
      seen.add(item.preguntaId);

      preguntas.push({
        preguntaId: item.preguntaId,
        puntaje: item.puntaje,
        solucion: item.preguntas.solucion,
      });
    }
  }

  return preguntas;
}

function buildResumen(
  preguntas: { preguntaId: string; puntaje: number; solucion: unknown }[],
  respuestas: Record<string, string>,
  tiempoConsumido: number,
  iniciadoEn: Date,
  enviadoEn: Date | null,
): Resumen {
  const total = preguntas.length;
  const totalPuntos = preguntas.reduce((sum, item) => sum + (item.puntaje ?? 0), 0);

  let correctas = 0;
  let incorrectas = 0;
  let sinResponder = 0;
  let puntosAcumulados = 0;

  for (const item of preguntas) {
    const rawRespuesta = respuestas[item.preguntaId]?.trim() ?? "";
    if (!rawRespuesta) {
      sinResponder += 1;
      continue;
    }

    const kind = extractSolucionKind(item.solucion);
    const user = parseRespuesta(rawRespuesta, kind ?? undefined);
    const correct = normalizeSolucion(extractSolucionValue(item.solucion), kind ?? undefined);

    const esCorrecta =
      kind && user !== null && correct !== null
        ? compareRespuesta(user, correct)
        : false;

    if (esCorrecta) {
      correctas += 1;
      puntosAcumulados += item.puntaje ?? 0;
    } else {
      incorrectas += 1;
    }
  }

  const porcentaje =
    totalPuntos > 0
      ? Math.round((puntosAcumulados / totalPuntos) * 100)
      : total > 0
        ? Math.round((correctas / total) * 100)
        : 0;

  const tiempoEmpleado =
    Number.isFinite(tiempoConsumido) && tiempoConsumido > 0
      ? tiempoConsumido
      : Math.max(
          0,
          Math.floor(((enviadoEn ?? new Date()).getTime() - iniciadoEn.getTime()) / 1000),
        );

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

function getMetaList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => (typeof item === "string" ? item : ""))
    .filter((item) => item.trim().length > 0);
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
