"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { compareRespuesta, normalizeSolucion, parseRespuesta } from "@/lib/evaluacion-eval";

type JsonValue = any;
type PreguntaTipo = "ABIERTA" | "CERRADA";

type Opcion = {
  label?: string;
  value: string;
  kind?: string;
  alt?: string;
};

export type SolucionarioEvaluacion = {
  id: string;
  titulo: string;
  descripcion?: string | null;
  tipo: string;
  gestion: number;
  intentoId?: string;
};

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

function getDificultadLabel(dificultad?: "DIFICIL" | "MEDIO" | "SENCILLO") {
  if (dificultad === "DIFICIL") return "Difícil";
  if (dificultad === "SENCILLO") return "Fácil";
  return "Medio";
}

function getDificultadBadgeClass(dificultad?: "DIFICIL" | "MEDIO" | "SENCILLO") {
  if (dificultad === "DIFICIL") {
    return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300";
  }
  if (dificultad === "SENCILLO") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300";
  }
  return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300";
}

type Props = {
  evaluacion: SolucionarioEvaluacion;
  preguntas: SolucionarioPregunta[];
  respuestas: Record<string, string>;
  resultBasePath?: string;
  nivelLabelOverride?: string;
};

const BAR_ALPHA_SUCCESS = "bg-emerald-400/20 dark:bg-emerald-400/20";
const BAR_ALPHA_DANGER = "bg-rose-400/20 dark:bg-rose-400/20";
const BAR_ALPHA_NEUTRAL = "bg-slate-300/20 dark:bg-slate-500/20";

function getSegmentLabel(percentage: number, count: number) {
  if (percentage <= 0) return "";
  return `${percentage}% (${count})`;
}

const normalizeOptions = (opciones?: JsonValue | null): Opcion[] => {
  if (!opciones || !Array.isArray(opciones)) return [];
  return opciones
    .map((raw) => {
      if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        const value =
          ("value" in raw &&
            (typeof raw.value === "string" || typeof raw.value === "number") &&
            String(raw.value).trim()) ||
          ("url" in raw && typeof raw.url === "string" && raw.url.trim()) ||
          "";
        if (!value) return null;
        const label =
          ("label" in raw && typeof raw.label === "string" && raw.label) ||
          ("text" in raw && typeof raw.text === "string" && raw.text) ||
          value;
        let kind = "kind" in raw && typeof raw.kind === "string" ? raw.kind : undefined;
        if (!kind && "type" in raw && typeof raw.type === "string") kind = raw.type;

        if (
          !kind &&
          (value.startsWith("http") ||
            value.startsWith("/") ||
            /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(value))
        ) {
          kind = "IMAGEN";
        }

        const alt = "alt" in raw && typeof raw.alt === "string" ? raw.alt : undefined;
        return { label, value, kind, alt };
      }
      return { label: String(raw), value: String(raw) };
    })
    .filter(Boolean) as Opcion[];
};

function normalizeChoiceValue(value: unknown): string {
  if (value && typeof value === "object") {
    const candidate = value as Record<string, unknown>;
    if (candidate.value !== undefined) return String(candidate.value).trim().toLowerCase();
    if (candidate.url !== undefined) return String(candidate.url).trim().toLowerCase();
  }
  return String(value ?? "").trim().toLowerCase();
}

function getInitial(value: string) {
  const text = value.trim();
  return text ? text.slice(0, 1).toUpperCase() : "U";
}

function getOptionCandidateValues(opcion: Opcion) {
  const values = [normalizeChoiceValue(opcion.value)];
  if (opcion.label) values.push(normalizeChoiceValue(opcion.label));
  return Array.from(new Set(values.filter((item) => item.length > 0)));
}

export default function SolucionarioClient({
  evaluacion,
  preguntas,
  respuestas,
  resultBasePath,
  nivelLabelOverride,
}: Props) {
  const nivelLabel = nivelLabelOverride ?? (evaluacion.tipo === "PRO" ? "PRO" : "BASIC");
  const totalPreguntas = preguntas.length;
  const userStates = preguntas.map((pregunta) => {
    const user = parseRespuesta(respuestas[pregunta.id], pregunta.solucionKind ?? undefined);
    if (user === null) return "SIN_RESPONDER" as const;

    const solucion = normalizeSolucion(pregunta.solucionValue, pregunta.solucionKind ?? undefined);
    const isCorrect = solucion !== null ? compareRespuesta(user, solucion) : false;
    return isCorrect ? ("BIEN" as const) : ("MAL" as const);
  });

  const totalBien = userStates.filter((state) => state === "BIEN").length;
  const totalMal = userStates.filter((state) => state === "MAL").length;
  const totalOmitidas = totalPreguntas - totalBien - totalMal;
  const totalRespondidas = totalBien + totalMal;
  const porcentajeBien = totalPreguntas > 0 ? Math.round((totalBien / totalPreguntas) * 100) : 0;
  const porcentajeMal = totalPreguntas > 0 ? Math.round((totalMal / totalPreguntas) * 100) : 0;
  const porcentajeOmitidas =
    totalPreguntas > 0 ? Math.max(0, 100 - porcentajeBien - porcentajeMal) : 0;
  const promedioAciertoGrupo =
    preguntas.length > 0
      ? Math.round(
          preguntas.reduce((acc, pregunta) => acc + pregunta.stats.tasaAcierto, 0) / preguntas.length,
        )
      : 0;
  const basePath = resultBasePath ?? `/prueba/${evaluacion.id}`;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4">
      <header className="space-y-3">
        <div className="flex items-center justify-end">
          <ModeToggle />
        </div>
        <h1 className="text-center font-bold text-2xl">{evaluacion.titulo}</h1>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Badge variant="outline">{nivelLabel}</Badge>
          <Badge variant="outline">{preguntas.length} preguntas</Badge>
          {evaluacion.intentoId && <Badge variant="success">Intento cargado</Badge>}
        </div>
        <p className="text-center text-muted-foreground text-sm">
          Solucionario con desempeño global por pregunta y opciones.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="font-semibold text-lg">Resumen global</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-muted-foreground text-xs">Aciertos</p>
              <p className="font-semibold text-2xl text-emerald-600 dark:text-emerald-400">{totalBien}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-muted-foreground text-xs">Fallas</p>
              <p className="font-semibold text-2xl text-rose-600 dark:text-rose-400">{totalMal}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-muted-foreground text-xs">Sin responder</p>
              <p className="font-semibold text-2xl">{totalOmitidas}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-muted-foreground text-xs">Promedio acierto (grupo)</p>
              <p
                className={`font-semibold text-2xl ${
                  promedioAciertoGrupo >= 50
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {promedioAciertoGrupo}%
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Progreso global</CardTitle>
          <p className="text-muted-foreground text-xs">
            Respondidas: {totalRespondidas} de {totalPreguntas} pregunta{totalPreguntas === 1 ? "" : "s"}
          </p>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="flex h-7 overflow-hidden rounded-md bg-slate-300/30 dark:bg-slate-700/30">
            {totalBien > 0 && (
              <div
                className={`flex min-w-0 items-center justify-center overflow-hidden px-2 font-semibold text-emerald-900 text-xs whitespace-nowrap dark:text-emerald-100 ${BAR_ALPHA_SUCCESS}`}
                style={{ width: `${Math.min(Math.max(porcentajeBien, 0), 100)}%` }}
              >
                {getSegmentLabel(porcentajeBien, totalBien)}
              </div>
            )}
            {totalMal > 0 && (
              <div
                className={`flex min-w-0 items-center justify-center overflow-hidden px-2 font-semibold text-rose-900 text-xs whitespace-nowrap dark:text-rose-100 ${BAR_ALPHA_DANGER}`}
                style={{ width: `${Math.min(Math.max(porcentajeMal, 0), 100)}%` }}
              >
                {getSegmentLabel(porcentajeMal, totalMal)}
              </div>
            )}
            {totalOmitidas > 0 && (
              <div
                className={`flex min-w-0 items-center justify-center overflow-hidden px-2 font-semibold text-slate-700 text-xs whitespace-nowrap dark:text-slate-100 ${BAR_ALPHA_NEUTRAL}`}
                style={{ width: `${Math.min(Math.max(porcentajeOmitidas, 0), 100)}%` }}
              >
                {getSegmentLabel(porcentajeOmitidas, totalOmitidas)}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {totalBien > 0 && (
              <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
                Aciertos
              </span>
            )}
            {totalMal > 0 && (
              <span className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 font-semibold text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
                Fallas
              </span>
            )}
            {totalOmitidas > 0 && (
              <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300">
                Sin responder
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {preguntas.map((pregunta, index) => {
          const opciones = normalizeOptions(pregunta.opciones);
          const miRespuesta = parseRespuesta(respuestas[pregunta.id], pregunta.solucionKind ?? undefined);
          const sinResponder = miRespuesta === null;
          const solucion = normalizeSolucion(pregunta.solucionValue, pregunta.solucionKind ?? undefined);
          const selectedSet = new Set(
            Array.isArray(miRespuesta)
              ? miRespuesta.map((item) => normalizeChoiceValue(item))
              : miRespuesta !== null
                ? [normalizeChoiceValue(miRespuesta)]
                : [],
          );

          const isCorrectAnswer = (opcion: Opcion) => {
            if (solucion === null) return false;
            const candidates = getOptionCandidateValues(opcion);
            if (candidates.length === 0) return false;

            const solvedValues = Array.isArray(solucion) ? solucion : [solucion];
            return candidates.some((candidate) =>
              solvedValues.some((solved) => compareRespuesta(candidate, solved)),
            );
          };

          return (
            <Card className="overflow-hidden" key={pregunta.id}>
              <CardContent className="space-y-3 bg-muted/20 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary font-bold text-primary-foreground">
                    {index + 1}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="font-semibold text-base leading-tight">{pregunta.enunciado}</p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground text-xs">
                        Histórica: {pregunta.tasaAciertoHistorica ?? 0}% de acierto
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`${getDificultadBadgeClass(pregunta.dificultad)} font-semibold`}>
                          {getDificultadLabel(pregunta.dificultad)}
                        </Badge>
                      </div>
                    </div>
                    {sinResponder && (
                      <div className="pt-1">
                        <Badge
                          variant="outline"
                          className="border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300"
                        >
                          Sin responder
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>

                <QuestionSummaryBar
                  bien={pregunta.stats.bien}
                  mal={pregunta.stats.mal}
                  omitidas={pregunta.stats.omitidas}
                />
              </CardContent>

              <CardContent className="p-4 pt-0">
                {pregunta.tipo === "CERRADA" ? (
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                    <div className="space-y-2">
                      {opciones.map((opcion) => {
                        const key = normalizeChoiceValue(opcion.value);
                        const stat = pregunta.stats.optionStats.find((item) => item.key === key);
                        const porcentaje = stat?.porcentaje ?? 0;
                        const count = stat?.count ?? 0;
                        const correcta = isCorrectAnswer(opcion);
                        const elegida = selectedSet.has(key);

                        const barClass = correcta
                          ? BAR_ALPHA_SUCCESS
                          : elegida
                            ? BAR_ALPHA_DANGER
                            : BAR_ALPHA_NEUTRAL;

                        const borderClass = correcta
                          ? "border border-emerald-600 dark:border-emerald-400"
                          : elegida
                            ? "border border-rose-600 dark:border-rose-400"
                            : "border border-slate-300/60 dark:border-slate-700/70";

                        return (
                          <div className="rounded-xl py-1" key={opcion.value}>
                            <div
                              className={`relative h-7 w-full overflow-hidden rounded-md bg-slate-300/30 dark:bg-slate-700/30 ${borderClass}`}
                            >
                              <div
                                className={`h-full ${barClass}`}
                                style={{ width: `${Math.min(Math.max(porcentaje, 0), 100)}%` }}
                              />
                              <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-2">
                                <span
                                  className={`truncate pr-2 font-semibold text-sm ${
                                    correcta
                                      ? "text-emerald-700 dark:text-emerald-300"
                                      : "text-slate-900 dark:text-slate-100"
                                  }`}
                                >
                                  {opcion.label}
                                </span>
                                <div className="flex shrink-0 items-center gap-1 text-right">
                                  <div className="flex -space-x-1.5">
                                    {stat?.recentResponders?.map((user) => (
                                      <Avatar className="size-4 border border-background" key={user.id}>
                                        <AvatarImage alt={user.nombre} src={user.avatar ?? ""} />
                                        <AvatarFallback className="text-[9px]">
                                          {getInitial(user.nombre)}
                                        </AvatarFallback>
                                      </Avatar>
                                    ))}
                                  </div>
                                  {correcta && (
                                    <Badge variant="success" className="h-4 px-1.5 py-0 text-[10px] leading-none">
                                      Respuesta correcta
                                    </Badge>
                                  )}
                                  {elegida && (
                                    <Badge variant="outline" className="h-4 px-1.5 py-0 text-[10px] leading-none">
                                      Tu elección
                                    </Badge>
                                  )}
                                  <span className="font-semibold text-xs whitespace-nowrap text-slate-900 dark:text-slate-100">
                                    {porcentaje}% ({count})
                                  </span>
                                </div>
                              </div>
                            </div>

                            {opcion.kind === "IMAGEN" && (
                              <div className="mt-2">
                                <Image
                                  src={opcion.value}
                                  alt={opcion.alt || "Opción"}
                                  width={320}
                                  height={200}
                                  className="h-auto max-h-48 w-auto rounded border"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                        <p className="mb-2 font-semibold text-emerald-700 text-sm dark:text-emerald-300">
                          Explicación
                        </p>
                        <p className="text-muted-foreground text-sm italic">
                          {pregunta.explicacion?.trim() || "Sin explicación registrada para esta pregunta."}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-2 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-900/40 dark:bg-emerald-950/30">
                      <p className="font-semibold text-emerald-700 dark:text-emerald-300">Respuesta correcta</p>
                      <p>{String(pregunta.solucionValue ?? "-")}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-900/40">
                      <p className="font-semibold">Tu respuesta</p>
                      <p>{respuestas[pregunta.id] || "(sin respuesta)"}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-sm dark:border-slate-800 dark:bg-slate-900/40">
                      <p className="mb-1 font-bold">Explicación</p>
                      <p className="text-muted-foreground italic">{pregunta.explicacion || "Sin explicación registrada."}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-center pb-4">
        <Button
          render={
            <Link
              href={
                evaluacion.intentoId
                  ? `${basePath}/resultado?intentoId=${evaluacion.intentoId}`
                  : `${basePath}/resultado`
              }
            />
          }
          size="lg"
        >
          Regresar a resultados
        </Button>
      </div>
    </div>
  );
}

function QuestionSummaryBar({
  bien,
  mal,
  omitidas,
}: {
  bien: number;
  mal: number;
  omitidas: number;
}) {
  const total = bien + mal + omitidas;
  const bienPct = total > 0 ? Math.round((bien / total) * 100) : 0;
  const malPct = total > 0 ? Math.round((mal / total) * 100) : 0;
  const omitidasPct = total > 0 ? Math.max(0, 100 - bienPct - malPct) : 0;

  return (
    <div>
      <div className="flex h-7 overflow-hidden rounded-md bg-slate-300/30 dark:bg-slate-700/30">
        {bien > 0 && (
          <div
            className={`flex min-w-0 items-center justify-center overflow-hidden px-2 font-semibold text-emerald-900 text-xs whitespace-nowrap dark:text-emerald-100 ${BAR_ALPHA_SUCCESS}`}
            style={{ width: `${Math.min(Math.max(bienPct, 0), 100)}%` }}
          >
            {getSegmentLabel(bienPct, bien)}
          </div>
        )}
        {mal > 0 && (
          <div
            className={`flex min-w-0 items-center justify-center overflow-hidden px-2 font-semibold text-rose-900 text-xs whitespace-nowrap dark:text-rose-100 ${BAR_ALPHA_DANGER}`}
            style={{ width: `${Math.min(Math.max(malPct, 0), 100)}%` }}
          >
            {getSegmentLabel(malPct, mal)}
          </div>
        )}
        {omitidas > 0 && (
          <div
            className={`flex min-w-0 items-center justify-center overflow-hidden px-2 font-semibold text-slate-700 text-xs whitespace-nowrap dark:text-slate-100 ${BAR_ALPHA_NEUTRAL}`}
            style={{ width: `${Math.min(Math.max(omitidasPct, 0), 100)}%` }}
          >
            {getSegmentLabel(omitidasPct, omitidas)}
          </div>
        )}
      </div>
    </div>
  );
}
