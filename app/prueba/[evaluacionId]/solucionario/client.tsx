"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  tipo: "PRUEBA" | "OFICIAL";
  gestion: number;
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
};

type Props = {
  evaluacion: SolucionarioEvaluacion;
  preguntas: SolucionarioPregunta[];
  respuestas: Record<string, string>;
};

const normalizeOptions = (opciones?: JsonValue | null): Opcion[] => {
  if (!opciones || !Array.isArray(opciones)) return [];
  return opciones
    .map((raw) => {
      if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        const value = ("value" in raw && (typeof raw.value === "string" || typeof raw.value === "number") && String(raw.value).trim()) || "";
        if (!value) return null;
        const label = ("label" in raw && typeof raw.label === "string" && raw.label) || ("text" in raw && typeof raw.text === "string" && raw.text) || value;
        let kind = "kind" in raw && typeof raw.kind === "string" ? raw.kind : undefined;
        if (!kind && "type" in raw && typeof raw.type === "string") kind = raw.type;

        // Auto-detect image if kind is missing but value looks like a URL
        if (!kind && (value.startsWith("http") || value.startsWith("/") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(value))) {
          kind = "IMAGEN";
        }

        const alt = "alt" in raw && typeof raw.alt === "string" ? raw.alt : undefined;
        return { label, value, kind, alt };
      }
      return { label: String(raw), value: String(raw) };
    })
    .filter(Boolean) as Opcion[];
};

// evaluation helpers moved to lib/evaluacion-eval.ts

export default function SolucionarioClient({ evaluacion, preguntas, respuestas }: Props) {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const questionCount = preguntas.length;
  const currentQuestion = preguntas[currentIndex];
  const opciones = React.useMemo(
    () => normalizeOptions(currentQuestion?.opciones),
    [currentQuestion?.opciones],
  );

  if (!currentQuestion) return null;

  const respuestaParsed = parseRespuesta(respuestas[currentQuestion.id], currentQuestion.solucionKind || undefined);
  const correctaParsed = normalizeSolucion(currentQuestion.solucionValue, currentQuestion.solucionKind ?? undefined);

  const esCorrecta = currentQuestion.solucionKind && respuestaParsed !== null && correctaParsed !== null ? compareRespuesta(respuestaParsed, correctaParsed) : false;
  const correctSet = new Set(Array.isArray(correctaParsed) ? correctaParsed : [correctaParsed]);
  const selectedSet = new Set(Array.isArray(respuestaParsed) ? respuestaParsed : [respuestaParsed]);
  // Pagination Logic
  const maxVisible = 10;
  const startPage = Math.max(0, Math.min(currentIndex - Math.floor(maxVisible / 2), questionCount - maxVisible));
  const endPage = Math.min(questionCount, startPage + maxVisible);
  const visiblePages = Array.from({ length: endPage - startPage }, (_, i) => startPage + i);

  return (
    <div className="container p-4 mx-auto flex flex-col items-center justify-start gap-10">
      {/* Header Sin Card */}
      <header className="text-center space-y-4 w-full">
        <h3 className="text-primary">
          Solucionario
        </h3>
        <h1 className="text-xl ">{evaluacion.titulo}</h1>

      </header>

      {/* Contenido Sin Card */}
      <div className="container max-w-2xl w-full relative">
        <div className="space-y-4 w-full">
          {(currentQuestion.temaNombre || currentQuestion.temaDescripcion) && (
            <div className="space-y-0.5">
              {currentQuestion.temaNombre && (
                <p className="text-xs text-center font-semibold text-primary">
                  {currentQuestion.temaNombre}
                </p>
              )}
              {currentQuestion.temaDescripcion && (
                <p className="text-xs text-center text-muted-foreground">
                  {currentQuestion.temaDescripcion}
                </p>
              )}
            </div>
          )}
          <h2 className="text-sm leading-tight decoration-primary/20 underline-offset-8">
            {currentQuestion.codigo && (
              <div className="mb-2">
                <Badge variant="outline">{currentQuestion.codigo}</Badge>
              </div>
            )}
            <span className="font-bold text-primary">Pregunta {currentIndex + 1}.-</span>{" "}
            <span>{currentQuestion.enunciado}</span>
          </h2>
          <p className="text-xs font-medium text-emerald-600">
            ExplicaciÃ³n: {currentQuestion.explicacion?.trim() || "Sin explicaciÃ³n disponible."}
          </p>
          {!respuestaParsed && (
            <p className="text-sm text-destructive text-center w-full">
              (sin respuesta)
            </p>
          )}
        </div>

        {currentQuestion.assets?.map((asset: any, i: number) => (
          <div key={i} className="flex justify-center pt-2 w-full">
            <div className="relative rounded-xl overflow-hidden shadow-xl border border-border/40 max-w-md w-full">
              <Image
                src={asset.url}
                alt="Recurso"
                width={600}
                height={400}
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="container max-w-2xl  w-full relative">
        {currentQuestion.tipo === "CERRADA" ? (
          <div className="grid gap-3">
            {opciones.map((opcion) => {
              const val = String(opcion.value).trim().toLowerCase();
              const getVal = (v: any) => {
                if (v && typeof v === "object" && v.value) return String(v.value).trim().toLowerCase();
                if (v && typeof v === "object" && v.url) return String(v.url).trim().toLowerCase();
                return String(v).trim().toLowerCase();
              };
              const isCorrect = Array.isArray(correctaParsed)
                ? correctaParsed.some((sv) => getVal(sv) === val)
                : getVal(correctaParsed) === val;
              const isSelected = selectedSet.has(val);
              let bgClass = "bg-muted/10";
              let borderClass = "border-border/60";
              let textClass = "text-foreground";

              if (isSelected) {
                bgClass = isCorrect ? "bg-emerald-500/10" : "bg-destructive/10";
                borderClass = isCorrect ? "border-emerald-500" : "border-destructive";
                textClass = isCorrect ? "text-emerald-700 dark:text-emerald-400 font-bold" : "text-destructive font-bold";
              } else if (isCorrect) {
                borderClass = "border-emerald-500/40";
                textClass = "text-emerald-600 dark:text-emerald-400";
              }

              return (
                <div
                  key={opcion.value}
                  className={`flex flex-col sm:flex-row items-center sm:items-start gap-4 p-5 rounded-2xl border-2 transition-all relative ${bgClass} ${borderClass}`}
                >
                  <div className={`flex-1 text-xs ${textClass} w-full`}>
                    {opcion.kind === "IMAGEN" ? (
                      <div className="relative w-full sm:w-fit group flex justify-center sm:justify-start">
                        <div className="relative">
                          <Image
                            src={opcion.value}
                            alt="OpciÃ³n"
                            width={400}
                            height={250}
                            className={`rounded-xl border shadow-md max-h-[300px] w-auto h-auto object-contain bg-white dark:bg-zinc-900 transition-transform ${isSelected ? (isCorrect ? "ring-4 ring-emerald-500/40 scale-[1.02]" : "ring-4 ring-rose-500/40 scale-[1.02]") : (isCorrect ? "ring-4 ring-emerald-500/20" : "")
                              }`}
                          />
                          {isCorrect && (
                            <div className="absolute -top-3 -right-3 bg-emerald-500 text-white rounded-full p-1.5 shadow-xl z-10 border-2 border-background">
                              <CheckCircle2 className="w-5 h-5" />
                            </div>
                          )}
                          {
                            isCorrect && (
                              <p className="mt-4 text-sm font-medium text-emerald-600">
                                {
                                  Array.from(correctSet.values()).find((v: any) => (v.url || v).toLowerCase() === val)?.alt || ""
                                }
                              </p>
                            )
                          }
                          {
                            isSelected && (
                              <Badge className="mt-4" variant={'outline'}>
                                Tu respuesta
                              </Badge>
                            )
                          }
                          {!isCorrect && (
                            <div className="absolute -top-3 -right-3 bg-destructive text-white rounded-full p-1.5 shadow-xl z-10 border-2 border-background">
                              <XCircle className="w-5 h-5" />
                            </div>
                          )}
                        </div>

                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        {isCorrect &&
                          <CheckCircle2 className="size-4 text-emerald-500" />}
                        {!isCorrect && isSelected &&
                          <XCircle className="size-4 text-destructive" />}
                        <span className="text-sm font-medium leading-relaxed">
                          {opcion.label}
                        </span>

                        {
                          isSelected && (
                            <Badge variant='outline' >
                              Tu respuesta
                            </Badge>
                          )
                        }
                        {
                          !isSelected && isCorrect && (
                            <Badge variant='outline' className="text-destructive">
                              No seleccionada
                            </Badge>
                          )
                        }

                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid gap-4 w-full">
            <div className="p-6 rounded-xl border-2 border-emerald-500/30 bg-emerald-50/10 dark:bg-emerald-500/5">
              <Label className="text-emerald-600 font-bold block mb-1">Respuesta Correcta</Label>
              <p className="text-xl font-medium">{String(currentQuestion.solucionValue)}</p>
            </div>
            {!esCorrecta && (
              <div className="p-6 rounded-xl border-2 border-rose-500/30 bg-rose-50/10 dark:bg-rose-500/5">
                <Label className="text-rose-600 font-bold block mb-1">Tu Respuesta</Label>
                <p className="text-xl">{respuestas[currentQuestion.id] || "(sin respuesta)"}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pagination Bottom */}
      <div className="w-full flex flex-col items-center ">
        <nav className="flex items-center gap-2 bg-background/90 backdrop-blur-sm px-3 py-2 rounded-full border">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setCurrentIndex(p => Math.max(0, p - 1))}
            disabled={currentIndex === 0}
          >
            <ChevronLeft />
          </Button>

          <div className="flex items-center gap-2 px-2">
            {visiblePages.map(page => {
              const q = preguntas[page];
              const r = parseRespuesta(respuestas[q.id], q.solucionKind || undefined);
              const c = normalizeSolucion(q.solucionValue);
              const isCorrect = q.solucionKind && r !== null && c !== null ? compareRespuesta(r, c) : false;
              const isAnswered = r !== null;

              let statusClass = "bg-muted/20 text-muted-foreground";
              if (isAnswered) {
                statusClass = isCorrect
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white border-none"
                  : "bg-destructive hover:bg-destructive/90 text-destructive-foreground border-none text-white";
              }

              return (
                <Button
                  key={page}
                  size={'icon-sm'}
                  className={`${statusClass} ${currentIndex === page ? "ring-2 " : ""}`}
                  onClick={() => setCurrentIndex(page)}
                >
                  {page + 1}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setCurrentIndex(p => Math.min(questionCount - 1, p + 1))}
            disabled={currentIndex === questionCount - 1}
          >
            <ChevronRight />
          </Button>
        </nav>
      </div>

      {/* Footer Navigation */}
      <div className="w-full flex flex-col items-center gap-8 pt-4">
        <Button
          render={<Link href={`/prueba/${evaluacion.id}/resultado`} />}
          variant="default"
          size="lg"
        >
          Regresar a Resultados
        </Button>
      </div>
    </div>
  );
}



