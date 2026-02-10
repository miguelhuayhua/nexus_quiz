"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Timer, Pause, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ModeToggle } from "@/components/ui/mode-toggle";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader } from "@/components/ui/loader";

type Asset = { kind: string; url: string; alt?: string; title?: string; orden?: number };
type PreguntaTipo = "ABIERTA" | "CERRADA";

type PreguntaRender = {
  id: string;
  codigo?: string | null;
  temaNombre?: string | null;
  temaDescripcion?: string | null;
  enunciado: string;
  tipo: PreguntaTipo;
  opciones?: any;
  assets?: Asset[] | null;
  solucionKind?: string | null;
};

export type EvaluacionForClient = {
  id: string;
  titulo: string;
  descripcion?: string | null;
  tipo: string;
  estado: string;
  gestion: number;
  tiempoSegundos: number;
  initialTimeLeft?: number;
  savedResponses?: Record<string, string>;
  intentoId?: string | null;
  areas?: any;
  capitulos?: any;
  preguntas: PreguntaRender[];
};

const formatSeconds = (value: number) => {
  const m = Math.floor(value / 60).toString().padStart(2, "0");
  const s = (value % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

export default function EvaluacionTake({ evaluacion }: { evaluacion: EvaluacionForClient }) {
  const router = useRouter();
  const storageKey = React.useMemo(() => {
    const intentoKey = evaluacion.intentoId ?? "new";
    return `evaluacion-progress:${evaluacion.id}:${intentoKey}`;
  }, [evaluacion.id, evaluacion.intentoId]);

  const baseTimeLeft = evaluacion.initialTimeLeft ?? evaluacion.tiempoSegundos;
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [responses, setResponses] = React.useState<Record<string, string>>(evaluacion.savedResponses ?? {});
  const [finalizado, setFinalizado] = React.useState(false);
  const [timeLeft, setTimeLeft] = React.useState(baseTimeLeft);
  const [isPaused, setIsPaused] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isAutoSaving, setIsAutoSaving] = React.useState(false);
  const [direction, setDirection] = React.useState(0);
  const [isFinalizeDialogOpen, setIsFinalizeDialogOpen] = React.useState(false);
  const responsesRef = React.useRef(responses);
  const timeLeftRef = React.useRef(timeLeft);
  const isPausedRef = React.useRef(isPaused);
  const currentIndexRef = React.useRef(currentIndex);

  const currentQuestion = evaluacion.preguntas[currentIndex];
  const questionCount = evaluacion.preguntas.length;

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        responses?: Record<string, string>;
        timeLeft?: number;
        isPaused?: boolean;
        currentIndex?: number;
        savedAt?: number;
        intentoId?: string | null;
      };

      if (parsed.intentoId && evaluacion.intentoId && parsed.intentoId !== evaluacion.intentoId) {
        return;
      }

      const wasPaused = parsed.isPaused ?? false;
      let nextTimeLeft = typeof parsed.timeLeft === "number" ? parsed.timeLeft : baseTimeLeft;
      if (!wasPaused && typeof parsed.savedAt === "number") {
        const elapsed = Math.floor((Date.now() - parsed.savedAt) / 1000);
        nextTimeLeft = Math.max(0, nextTimeLeft - elapsed);
      }

      if (parsed.responses) {
        setResponses(parsed.responses);
      }
      if (typeof parsed.currentIndex === "number") {
        setCurrentIndex(parsed.currentIndex);
      }
      setTimeLeft(nextTimeLeft);
      setIsPaused(parsed.isPaused ?? false);
    } catch {
      // ignore invalid cache
    }
  }, [baseTimeLeft, evaluacion.tipo, storageKey]);

  React.useEffect(() => {
    if (currentIndex >= questionCount) {
      setCurrentIndex(0);
    }
  }, [currentIndex, questionCount]);

  React.useEffect(() => {
    if (finalizado || isPaused || timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [finalizado, isPaused, timeLeft]);

  React.useEffect(() => {
    if (timeLeft === 0 && !finalizado) {
      void handleFinish();
    }
  }, [timeLeft]);

  React.useEffect(() => {
    responsesRef.current = responses;
  }, [responses]);

  React.useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  React.useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  React.useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  const persistLocalProgress = React.useCallback((overrides?: Partial<{
    responses: Record<string, string>;
    timeLeft: number;
    isPaused: boolean;
    currentIndex: number;
    savedAt: number;
    intentoId: string | null;
  }>) => {
    if (typeof window === "undefined") return;
    const snapshot = {
      responses: responsesRef.current,
      timeLeft: timeLeftRef.current,
      isPaused: isPausedRef.current,
      currentIndex: currentIndexRef.current,
      savedAt: Date.now(),
      intentoId: evaluacion.intentoId ?? null,
      ...overrides,
    };
    localStorage.setItem(storageKey, JSON.stringify(snapshot));
  }, [evaluacion.tipo, storageKey]);

  React.useEffect(() => {
    if (finalizado) return;
    const timeoutId = setTimeout(() => {
      persistLocalProgress();
    }, 400);
    return () => clearTimeout(timeoutId);
  }, [responses, currentIndex, isPaused, finalizado, persistLocalProgress]);

  React.useEffect(() => {
    const handleBeforeUnload = () => {
      persistLocalProgress();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [persistLocalProgress]);

  // Auto-save progress every 30 seconds
  React.useEffect(() => {
    if (finalizado || isPaused) return;

    const intervalId = setInterval(() => {
      void handleSaveProgreso(false, true);
    }, 30000);

    return () => clearInterval(intervalId);
  }, [finalizado, isPaused]);

  const handleChange = (id: string, value: string) => {
    setResponses((prev) => ({ ...prev, [id]: value }));
  };

  const handleSaveProgreso = async (marcarFinalizado: boolean, showIndicator = false) => {
    if (showIndicator) {
      setIsAutoSaving(true);
    }
    persistLocalProgress();
    try {
      await fetch("/api/evaluacion/progreso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evaluacionId: evaluacion.id,
          respuestas: responsesRef.current,
          finalizar: marcarFinalizado,
          tiempoConsumido: evaluacion.tiempoSegundos - timeLeftRef.current,
        }),
      });
    } catch (error) {
      console.error("Error al guardar progreso:", error);
    } finally {
      if (showIndicator) {
        setTimeout(() => setIsAutoSaving(false), 1200);
      }
    }
  };

  const handleFinish = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/evaluacion/progreso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evaluacionId: evaluacion.id,
          respuestas: responsesRef.current,
          finalizar: true,
          tiempoConsumido: evaluacion.tiempoSegundos - timeLeftRef.current,
        }),
      });
      if (res.ok) {
        setFinalizado(true);
        if (typeof window !== "undefined") {
          localStorage.removeItem(storageKey);
        }
        router.replace(`/prueba/${evaluacion.id}/resultado`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goNext = () => {
    if (currentIndex < questionCount - 1) {
      setDirection(1);
      setCurrentIndex(currentIndex + 1);
    }
  };

  const normalizeOptions = (opciones: any) => {
    if (!Array.isArray(opciones)) return [];
    return opciones.map((o) => (typeof o === "object" ? o : { label: String(o), value: String(o) }));
  };

  if (!currentQuestion) return null;

  // Pagination Logic
  const maxVisible = 5;
  const startPage = Math.max(0, Math.min(currentIndex - Math.floor(maxVisible / 2), questionCount - maxVisible));
  const endPage = Math.min(questionCount, startPage + maxVisible);
  const visiblePages = Array.from({ length: endPage - startPage }, (_, i) => startPage + i);

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 30 : -30,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 30 : -30,
      opacity: 0,
    }),
  };

  return (
    <div className="min-h-screen bg-background flex flex-col gap-4 items-center   overflow-hidden relative">
      <AnimatePresence>
        {(isSaving || finalizado) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background/50 backdrop-blur-md flex items-center justify-center h-screen w-screen"
          >
            <div className="flex flex-col items-center gap-4">
              <Loader variant="cube" size={40} />
              <span className="text-foreground font-semibold">Procesando evaluación...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col items-center gap-3 bg-background/90 backdrop-blur-sm">
        {/* Title Header Top */}
        <header className="text-center space-y-2 w-full">
          <h1 className="text-xl font-bold">{evaluacion.titulo}</h1>
          <p className="text-sm text-muted-foreground">Gestión {evaluacion.gestion}</p>
        </header>

      </div>
      {/* Question Content with Animation */}
      <div className="container max-w-2xl w-full relative">

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="space-y-3"
          >
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
            {currentQuestion.codigo && (
              <div>
                <Badge variant="outline">{currentQuestion.codigo}</Badge>
              </div>
            )}
            <h2 className="text-sm  space-x-2">

              <span className="font-bold text-primary ">Pregunta {currentIndex + 1}.-</span>
              <span>{currentQuestion.enunciado}</span>
            </h2>

            {currentQuestion.assets?.map((asset, i) => (
              <div key={i} className="flex justify-center">
                <div className="rounded-xl overflow-hidden border shadow-sm max-w-lg">
                  <Image src={asset.url} alt="Recurso" width={600} height={400} className="w-full h-auto object-cover" />
                </div>
              </div>
            ))}

            <div className="pt-2">
              {currentQuestion.tipo === "CERRADA" ? (
                currentQuestion.solucionKind === "CHOICE_MULTI" ? (
                  <div className="grid gap-2">
                    {normalizeOptions(currentQuestion.opciones).map((o: any) => {
                      const selected = (responses[currentQuestion.id] || "").includes(String(o.value));
                      return (
                        <div
                          key={o.value}
                          className={`flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer ${selected ? "border-primary bg-primary/5 shadow-sm" : "border-border/60 hover:bg-muted/30"}`}
                          onClick={() => {
                            const current = JSON.parse(responses[currentQuestion.id] || "[]");
                            const next = !selected ? [...current, String(o.value)] : current.filter((v: string) => v !== String(o.value));
                            handleChange(currentQuestion.id, JSON.stringify(next));
                          }}
                        >
                          <Checkbox checked={selected} />
                          <div className="flex-1 text-sm">
                            {o.kind === "IMAGEN" ? <Image src={o.value} alt="Opción" width={200} height={200} className="rounded border aspect-square" /> : <span>{o.label}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <RadioGroup value={responses[currentQuestion.id]} onValueChange={(v) => handleChange(currentQuestion.id, v)} className="grid gap-2">
                    {normalizeOptions(currentQuestion.opciones).map((o: any) => (
                      <Label
                        key={o.value}
                        className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${responses[currentQuestion.id] === String(o.value) ? "border-primary bg-primary/5 shadow-sm" : "border-border/60 hover:bg-muted/30"}`}
                      >
                        <RadioGroupItem value={String(o.value)} />
                        <div className="flex-1 text-sm font-normal">
                          {o.kind === "IMAGEN" ? <Image src={o.value} alt="Opción" width={400} height={400} className="rounded aspect-auto h-auto w-fit border" /> : <span>{o.label}</span>}
                        </div>
                      </Label>
                    ))}
                  </RadioGroup>
                )
              ) : (
                <div className="space-y-4">
                  {currentQuestion.solucionKind === "NUMBER" ? (
                    <Input
                      type="number"
                      placeholder="Respuesta numérica"
                      value={responses[currentQuestion.id] ?? ""}
                      onChange={(e) => handleChange(currentQuestion.id, e.target.value)}
                      className="h-10 text-xs"
                    />
                  ) : (
                    <Textarea
                      placeholder="Escribe tu respuesta aquí..."
                      value={responses[currentQuestion.id] ?? ""}
                      onChange={(e) => handleChange(currentQuestion.id, e.target.value)}
                      className="min-h-[100px] text-xs"
                    />
                  )}
                </div>
              )}
            </div>

            {/* Pagination Container (Numbers Only) */}
            <nav className="flex items-center justify-center gap-1.5 pt-2">
              {visiblePages.map((page) => (
                <Button
                  key={page}
                  size="icon-sm"
                  variant={currentIndex === page ? "default" : "outline"}
                  onClick={() => {
                    setDirection(page > currentIndex ? 1 : -1);
                    setCurrentIndex(page);
                  }}
                >
                  {page + 1}
                </Button>
              ))}
              {endPage < questionCount && (
                <span className="text-muted-foreground text-xs px-1">...</span>
              )}
            </nav>

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="ghost"
                onClick={goPrev}
                disabled={currentIndex === 0}
                className="font-bold"
              >
                <ChevronLeft />
                Atrás
              </Button>
              {currentIndex < questionCount - 1 ? (
                <Button
                  variant="ghost"
                  onClick={goNext}
                  className="font-bold"
                >
                  Siguiente
                  <ChevronRight />
                </Button>
              ) : (
                <Button
                  onClick={() => setIsFinalizeDialogOpen(true)}
                  className="font-bold"
                >
                  Finalizar
                </Button>
              )}
            </div>


          </motion.div>
        </AnimatePresence>
      </div>

      {/* Fixed Bottom Bar */}
      <footer className="fixed bottom-0 left-0 right-0 border-t backdrop-blur-md p-4 z-50">
        <div className="container max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ModeToggle />
            <div className="flex items-center gap-2 px-2 bg-muted/30 rounded-full h-9">
              <Timer className={`h-4 w-4 ${timeLeft < 60 ? "text-destructive" : "text-primary"}`} />
              <span className={`text-sm  ${timeLeft < 60 ? "text-destructive" : ""}`}>
                {formatSeconds(timeLeft)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setIsPaused(!isPaused)}
            >
              {isPaused ? <Play /> : <Pause />}
            </Button>

            <AlertDialog open={isFinalizeDialogOpen} onOpenChange={setIsFinalizeDialogOpen}>
              <Button
                size="sm"
                disabled={isSaving || isAutoSaving}
                onClick={() => setIsFinalizeDialogOpen(true)}
              >
                {(isSaving || isAutoSaving) ? (
                  <span className="flex items-center gap-2">
                    <Loader variant="dual-ring" size={16} />
                    Guardando...
                  </span>
                ) : (
                  "Finalizar Evaluación"
                )}
              </Button>
              <AlertDialogContent
                bottomStickOnMobile={false}
                className="max-w-md text-center"
              >
                <AlertDialogHeader className="items-center">
                  <AlertDialogTitle className="text-xl">Terminar Prueba</AlertDialogTitle>
                  <AlertDialogDescription className="text-balance">
                    ¿Estás seguro de enviar tus respuestas finales?
                  </AlertDialogDescription>
                </AlertDialogHeader>

                {evaluacion.preguntas.some(p => !responses[p.id] || responses[p.id] === "" || responses[p.id] === "[]") && (
                  <div className="space-y-3 pb-5">
                    <p className="text-sm text-destructive">Tienes preguntas sin responder:</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {evaluacion.preguntas.map((p, i) => ({ id: p.id, num: i + 1 }))
                        .filter(item => !responses[item.id] || responses[item.id] === "" || responses[item.id] === "[]")
                        .map(item => (
                          <div
                            key={item.id}
                            className="size-6 rounded-full border border-destructive text-destructive flex items-center justify-center text-xs font-bold"
                          >
                            {item.num}
                          </div>
                        ))
                      }
                    </div>
                  </div>
                )}

                <AlertDialogFooter className="justify-center gap-2">
                  <Button
                    onClick={() => setIsFinalizeDialogOpen(false)}
                    type="button"
                    variant="outline"
                  >
                    Regresar
                  </Button>
                  <Button
                    disabled={isSaving}
                    onClick={handleFinish}
                    type="button"
                  >
                    Confirmar Envío
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </footer>
    </div>
  );
}




