"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import * as React from "react";
import Image from "next/image";
import { ThumbsUp, ThumbsDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

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
  fuente?: string;
  pagina?: number;
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
  if (dificultad === "DIFICIL") return "ALTA";
  if (dificultad === "SENCILLO") return "BAJA";
  return "MEDIA";
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
  reacciones?: Record<string, "LIKE" | "DISLIKE">;
};

const BAR_ALPHA_SUCCESS = "bg-success/40";
const BAR_ALPHA_DANGER = "bg-destructive/40";
const BAR_ALPHA_NEUTRAL = "bg-muted";



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

function getOptionCandidateValues(opcion: Opcion) {
  const values = [normalizeChoiceValue(opcion.value)];
  if (opcion.label) values.push(normalizeChoiceValue(opcion.label));
  return Array.from(new Set(values.filter((item) => item.length > 0)));
}

export default function SolucionarioClient({
  preguntas,
  respuestas,
  reacciones: initialReacciones,
}: Props) {
  const [reacciones, setReacciones] = React.useState<Record<string, "LIKE" | "DISLIKE">>(
    initialReacciones ?? {},
  );
  const [isReacting, setIsReacting] = React.useState<Record<string, boolean>>({});

  const handleReaccion = async (preguntaId: string, tipo: "LIKE" | "DISLIKE") => {
    if (isReacting[preguntaId]) return;
    setIsReacting((prev) => ({ ...prev, [preguntaId]: true }));

    // Optimistic update
    const prev = reacciones[preguntaId];
    if (prev === tipo) {
      // Toggle off
      setReacciones((old) => {
        const next = { ...old };
        delete next[preguntaId];
        return next;
      });
    } else {
      // Set new or switch
      setReacciones((old) => ({ ...old, [preguntaId]: tipo }));
    }

    try {
      const res = await fetch("/api/preguntas/reaccion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preguntaId, tipo }),
      });
      if (!res.ok) {
        // Revert on error
        if (prev) {
          setReacciones((old) => ({ ...old, [preguntaId]: prev }));
        } else {
          setReacciones((old) => {
            const next = { ...old };
            delete next[preguntaId];
            return next;
          });
        }
      }
    } catch {
      // Revert on error
      if (prev) {
        setReacciones((old) => ({ ...old, [preguntaId]: prev }));
      } else {
        setReacciones((old) => {
          const next = { ...old };
          delete next[preguntaId];
          return next;
        });
      }
    } finally {
      setIsReacting((prev) => ({ ...prev, [preguntaId]: false }));
    }
  };



  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">


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
            <Card key={pregunta.id}>
              <CardContent >
                <div className="flex items-start gap-3">
                  <div className="size-8 grid place-items-center bg-primary ">
                    {index + 1}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-lg">{pregunta.enunciado}</p>
                    <div className="flex items-center justify-between gap-2">

                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`${getDificultadBadgeClass(pregunta.dificultad)}`}>
                          {getDificultadLabel(pregunta.dificultad)}
                        </Badge>
                      </div>
                    </div>
                    {sinResponder && (
                      <Badge
                        variant="outline"
                      >
                        Sin responder
                      </Badge>
                    )}
                  </div>
                </div>

                <QuestionSummaryBar
                  bien={pregunta.stats.bien}
                  mal={pregunta.stats.mal}
                  omitidas={pregunta.stats.omitidas}
                />
              </CardContent>

              <CardContent >
                {pregunta.tipo === "CERRADA" ? (
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                    <div className="space-y-2">
                      {opciones.map((opcion) => {
                        const key = normalizeChoiceValue(opcion.value);
                        const stat = pregunta.stats.optionStats.find((item) => item.key === key);
                        const porcentaje = stat?.porcentaje ?? 0;
                        const correcta = isCorrectAnswer(opcion);
                        const elegida = selectedSet.has(key);

                        const barClass = correcta
                          ? BAR_ALPHA_SUCCESS
                          : elegida
                            ? BAR_ALPHA_DANGER
                            : BAR_ALPHA_NEUTRAL;



                        return (
                          <div key={opcion.value}>
                            <div className={`relative  bg-muted `}
                            >
                              <div
                                className={`absolute inset-y-0 left-0 ${barClass}`}
                                style={{ width: `${Math.min(Math.max(porcentaje, 0), 100)}%` }}
                              />
                              <div className="relative flex items-center justify-between gap-2 p-2">
                                <span >
                                  {opcion.label}
                                </span>

                                <div className="flex items-center gap-0.5 ">

                                  {correcta && (
                                    <Badge variant="success" >
                                      Respuesta correcta
                                    </Badge>
                                  )}
                                  {elegida && (
                                    <Badge variant="outline" >
                                      Tu elección
                                    </Badge>
                                  )}
                                  <span >
                                    {porcentaje}%
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

                    <div className="space-y-2">
                      <p className="text-success">
                        Explicación
                      </p>
                      <p className="text-muted-foreground text-sm italic">
                        {pregunta.explicacion?.trim() || "Sin explicación registrada para esta pregunta."}
                      </p>
                      <p className="text-indigo-300 text-xs">
                        Fuente: {pregunta.fuente || "Sin fuente"}  -  <span className="text-pink-300">
                          Pág. {pregunta.pagina || "Sin página"}
                        </span>
                      </p>

                    </div>
                  </div>
                ) : (null
                )}
              </CardContent>
              <CardFooter>
                <Button
                  size="sm"
                  variant={reacciones[pregunta.id] === "LIKE" ? "secondary" : "outline"}
                  disabled={!!isReacting[pregunta.id]}
                  onClick={() => handleReaccion(pregunta.id, "LIKE")}
                >
                  <ThumbsUp />
                  Útil
                </Button>
                <Button
                  size="sm"
                  variant={reacciones[pregunta.id] === "DISLIKE" ? "secondary" : "outline"}
                  disabled={!!isReacting[pregunta.id]}
                  onClick={() => handleReaccion(pregunta.id, "DISLIKE")}
                >
                  <ThumbsDown />
                  Mejorar
                </Button>
              </CardFooter>
            </Card>
          );
        })}
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
      <div className="flex ">
        {bien > 0 && (
          <div
            className={`flex  justify-center ${BAR_ALPHA_SUCCESS}`}
            style={{ width: `${Math.min(Math.max(bienPct, 0), 100)}%` }}
          >
            {bienPct}%
          </div>
        )}
        {mal > 0 && (
          <div
            className={`flex  justify-center ${BAR_ALPHA_DANGER}`}
            style={{ width: `${Math.min(Math.max(malPct, 0), 100)}%` }}
          >
            {malPct}%
          </div>
        )}
        {omitidas > 0 && (
          <div
            className={`flex  justify-center ${BAR_ALPHA_NEUTRAL}`}
            style={{ width: `${Math.min(Math.max(omitidasPct, 0), 100)}%` }}
          >
            {omitidasPct}%
          </div>
        )}
      </div>
    </div>
  );
}
