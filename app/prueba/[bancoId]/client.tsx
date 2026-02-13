"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import * as React from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Timer, Pause, Play, ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
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
  dificultad?: "SENCILLO" | "MEDIO" | "DIFICIL";
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
  initialCurrentIndex?: number;
  initialIsPaused?: boolean;
  savedResponses?: Record<string, string>;
  intentoId?: string | null;
  resultBasePath?: string;
  areas?: any;
  capitulos?: any;
  preguntas: PreguntaRender[];
};

const MULTI_SEPARATOR = "|";
const TIME_WARNING_THRESHOLD_SECONDS = 5 * 60;
const TIME_WARNING_COOKIE_NAME = "quiz_hide_time_warning";
const TIME_WARNING_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const formatSeconds = (value: number) => {
  const m = Math.floor(value / 60).toString().padStart(2, "0");
  const s = (value % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

function parseMultiValue(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(MULTI_SEPARATOR)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function serializeMultiValue(values: string[]) {
  return values.join(MULTI_SEPARATOR);
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split(";").map((item) => item.trim());
  const match = parts.find((item) => item.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(name.length + 1));
}

function writeCookie(name: string, value: string, maxAgeSeconds: number) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

export default function EvaluacionTake({ evaluacion }: { evaluacion: EvaluacionForClient }) {
  const router = useRouter();
  const resultBasePath = evaluacion.resultBasePath ?? `/prueba/${evaluacion.id}`;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [intentoId, setIntentoId] = React.useState<string | null>(evaluacion.intentoId ?? null);
  const storageKey = React.useMemo(() => {
    const intentoKey = intentoId ?? "new";
    return `evaluacion-progress:${evaluacion.id}:${intentoKey}`;
  }, [evaluacion.id, intentoId]);

  const baseTimeLeft = evaluacion.initialTimeLeft ?? evaluacion.tiempoSegundos;
  const [currentIndex, setCurrentIndex] = React.useState(evaluacion.initialCurrentIndex ?? 0);
  const [responses, setResponses] = React.useState<Record<string, string>>(evaluacion.savedResponses ?? {});
  const [finalizado, setFinalizado] = React.useState(false);
  const [timeLeft, setTimeLeft] = React.useState(baseTimeLeft);
  const [isPaused, setIsPaused] = React.useState(evaluacion.initialIsPaused ?? false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isAutoSaving, setIsAutoSaving] = React.useState(false);
  const [direction, setDirection] = React.useState(0);
  const [isFinalizeDialogOpen, setIsFinalizeDialogOpen] = React.useState(false);
  const [isTimeWarningOpen, setIsTimeWarningOpen] = React.useState(false);
  const [hasShownTimeWarning, setHasShownTimeWarning] = React.useState(() => readCookie(TIME_WARNING_COOKIE_NAME) === "1");
  const [hideTimeWarning, setHideTimeWarning] = React.useState(() => readCookie(TIME_WARNING_COOKIE_NAME) === "1");
  const [attemptLimitMessage, setAttemptLimitMessage] = React.useState<string | null>(null);
  const isFinishingRef = React.useRef(false);
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

      if (parsed.intentoId && intentoId && parsed.intentoId !== intentoId) {
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
        setCurrentIndex(Math.max(0, Math.min(questionCount - 1, parsed.currentIndex)));
      }
      setTimeLeft(nextTimeLeft);
      setIsPaused(parsed.isPaused ?? false);
    } catch {
      // ignore invalid cache
    }
  }, [baseTimeLeft, evaluacion.tipo, intentoId, questionCount, storageKey]);

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
    if (timeLeft <= 0 && !finalizado && !isSaving) {
      void handleFinish();
    }
  }, [timeLeft, finalizado, isSaving]);

  React.useEffect(() => {
    if (finalizado || hasShownTimeWarning || hideTimeWarning) return;
    if (timeLeft > 0 && timeLeft <= TIME_WARNING_THRESHOLD_SECONDS) {
      setHasShownTimeWarning(true);
      setIsTimeWarningOpen(true);
    }
  }, [timeLeft, finalizado, hasShownTimeWarning, hideTimeWarning]);

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
      intentoId: intentoId ?? null,
      ...overrides,
    };
    localStorage.setItem(storageKey, JSON.stringify(snapshot));
  }, [evaluacion.tipo, intentoId, storageKey]);

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

  // Auto-save progress every 60 seconds
  React.useEffect(() => {
    if (finalizado) return;

    const intervalId = setInterval(() => {
      void handleSaveProgreso(false, true);
    }, 60000);

    return () => clearInterval(intervalId);
  }, [finalizado]);

  // Save shortly after each response change to persist selected/typed answer.
  React.useEffect(() => {
    if (finalizado) return;
    const timeoutId = setTimeout(() => {
      void handleSaveProgreso(false, false);
    }, 900);
    return () => clearTimeout(timeoutId);
  }, [responses, finalizado]);

  React.useEffect(() => {
    if (finalizado) return;
    void handleSaveProgreso(false, false);
  }, [isPaused, finalizado]);

  React.useEffect(() => {
    if (!intentoId) return;
    const params = new URLSearchParams(searchParams.toString());
    if (params.get("intentoId") === intentoId) return;
    params.set("intentoId", intentoId);
    router.replace(`${pathname}?${params.toString()}`);
  }, [intentoId, pathname, router, searchParams]);

  const handleSaveProgreso = async (
    marcarFinalizado: boolean,
    showIndicator = false,
    overrideResponses?: Record<string, string>,
  ) => {
    if (showIndicator) {
      setIsAutoSaving(true);
    }
    const nextResponses = overrideResponses ?? responsesRef.current;
    persistLocalProgress({ responses: nextResponses });
    try {
      const res = await fetch("/api/evaluacion/progreso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bancoId: evaluacion.id,
          intentoId,
          respuestas: nextResponses,
          finalizar: marcarFinalizado,
          tiempoConsumido: evaluacion.tiempoSegundos - timeLeftRef.current,
          isPaused: isPausedRef.current,
          currentIndex: currentIndexRef.current,
          timeLeft: timeLeftRef.current,
        }),
      });
      if (res.ok) {
        const payload = (await res.json().catch(() => null)) as
          | { intentoId?: string }
          | null;
        if (typeof payload?.intentoId === "string" && payload.intentoId.trim().length > 0) {
          setIntentoId(payload.intentoId);
        }
      } else if (res.status === 409) {
        const payload = (await res.json().catch(() => null)) as { message?: string } | null;
        setAttemptLimitMessage(payload?.message ?? "Se alcanzó el máximo de intentos.");
      }
    } catch (error) {
      console.error("Error al guardar progreso:", error);
    } finally {
      if (showIndicator) {
        setTimeout(() => setIsAutoSaving(false), 1200);
      }
    }
  };

  const handleChange = (id: string, value: string, persistNow = false) => {
    const nextResponses = { ...responsesRef.current, [id]: value };
    responsesRef.current = nextResponses;
    setResponses(nextResponses);
    if (persistNow) {
      void handleSaveProgreso(false, false, nextResponses);
    }
  };

  const handleFinish = async () => {
    if (isFinishingRef.current) return;
    isFinishingRef.current = true;
    setIsSaving(true);
    try {
      const res = await fetch("/api/evaluacion/progreso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bancoId: evaluacion.id,
          intentoId,
          respuestas: responsesRef.current,
          finalizar: true,
          tiempoConsumido: evaluacion.tiempoSegundos - timeLeftRef.current,
        }),
      });
      if (res.ok) {
        const payload = (await res.json().catch(() => null)) as
          | { intentoId?: string }
          | null;
        const intentoIdFinal =
          typeof payload?.intentoId === "string" && payload.intentoId.trim().length > 0
            ? payload.intentoId
            : intentoId ?? evaluacion.intentoId ?? "";

        if (intentoIdFinal) {
          setIntentoId(intentoIdFinal);
        }
        setFinalizado(true);
        if (typeof window !== "undefined") {
          localStorage.removeItem(storageKey);
        }
        router.replace(
          intentoIdFinal
            ? `${resultBasePath}/resultado?intentoId=${intentoIdFinal}`
            : `${resultBasePath}/resultado`,
        );
      } else if (res.status === 409) {
        const payload = (await res.json().catch(() => null)) as { message?: string } | null;
        setAttemptLimitMessage(payload?.message ?? "Se alcanzó el máximo de intentos.");
      }
    } finally {
      setIsSaving(false);
      isFinishingRef.current = false;
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      void handleSaveProgreso(false, false);
      setDirection(-1);
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goNext = () => {
    if (currentIndex < questionCount - 1) {
      void handleSaveProgreso(false, false);
      setDirection(1);
      setCurrentIndex(currentIndex + 1);
    }
  };

  const normalizeOptions = (opciones: any) => {
    if (!Array.isArray(opciones)) return [];
    return opciones.map((o) => (typeof o === "object" ? o : { label: String(o), value: String(o) }));
  };

  // Seeded shuffle for deterministic randomization per question
  const seededShuffle = React.useCallback(<T,>(arr: T[], seed: string): T[] => {
    const result = [...arr];
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
      h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
    }
    for (let i = result.length - 1; i > 0; i--) {
      h = ((h << 5) - h + i) | 0;
      const j = Math.abs(h) % (i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }, []);

  // Memoize shuffled options per question ID
  const shuffledOptionsMap = React.useMemo(() => {
    const map = new Map<string, any[]>();
    for (const q of evaluacion.preguntas) {
      const normalized = normalizeOptions(q.opciones);
      map.set(q.id, seededShuffle(normalized, q.id));
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evaluacion.preguntas]);

  if (!currentQuestion) return null;

  // Pagination Logic – grouped with lateral ellipsis buttons
  const PAGE_GROUP_SIZE = 5;
  const totalGroups = Math.ceil(questionCount / PAGE_GROUP_SIZE);
  const activeGroup = Math.floor(currentIndex / PAGE_GROUP_SIZE);
  const [pageGroup, setPageGroup] = React.useState(activeGroup);

  // Keep the visible group in sync when the user navigates to a question outside the current group
  React.useEffect(() => {
    const neededGroup = Math.floor(currentIndex / PAGE_GROUP_SIZE);
    if (neededGroup !== pageGroup) setPageGroup(neededGroup);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  const groupStart = pageGroup * PAGE_GROUP_SIZE;
  const groupEnd = Math.min(questionCount, groupStart + PAGE_GROUP_SIZE);
  const visiblePages = Array.from({ length: groupEnd - groupStart }, (_, i) => groupStart + i);
  const hasPrevGroup = pageGroup > 0;
  const hasNextGroup = pageGroup < totalGroups - 1;

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
        <header className="text-center space-y-2 w-full pt-4">
          <h1 className="text-xl font-bold">{evaluacion.titulo}</h1>
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

            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-primary">
                Pregunta {currentIndex + 1}.-
              </h2>
              {currentQuestion.dificultad && (
                <Badge variant={currentQuestion.dificultad === "SENCILLO" ? "secondary" : currentQuestion.dificultad === "MEDIO" ? "default" : "destructive"}>
                  {currentQuestion.dificultad === "SENCILLO" ? "BAJA" : currentQuestion.dificultad === "MEDIO" ? "MEDIA" : "ALTA"}
                </Badge>
              )}
            </div>

            <p className="text-sm font-medium leading-relaxed">{currentQuestion.enunciado}</p>

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
                    {(shuffledOptionsMap.get(currentQuestion.id) ?? []).map((o: any, idx: number) => {
                      const current = parseMultiValue(responses[currentQuestion.id]);
                      const selected = current.includes(String(o.value));
                      const letter = String.fromCharCode(65 + idx);
                      return (
                        <div
                          key={o.value}
                          className={`flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer ${selected ? "border-primary bg-primary/5 shadow-sm" : "border-border/60 hover:bg-muted/30"}`}
                          onClick={() => {
                            const next = !selected
                              ? [...current, String(o.value)]
                              : current.filter((v: string) => v !== String(o.value));
                            handleChange(currentQuestion.id, serializeMultiValue(next), true);
                          }}
                        >
                          <Checkbox checked={selected} />
                          <span className="font-bold text-primary w-4">{letter}.</span>
                          <div className="flex-1 text-sm">
                            {o.kind === "IMAGEN" ? <Image src={o.value} alt="Opción" width={200} height={200} className="rounded border aspect-square" /> : <span>{o.label}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <RadioGroup
                    value={responses[currentQuestion.id] ?? ""}
                    onValueChange={(v) => handleChange(currentQuestion.id, v, true)}
                    className="grid gap-2"
                  >
                    {(shuffledOptionsMap.get(currentQuestion.id) ?? []).map((o: any, idx: number) => {
                      const letter = String.fromCharCode(65 + idx);
                      const isSelected = responses[currentQuestion.id] === String(o.value);
                      return (
                        <Label
                          key={o.value}
                          className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-border/60 hover:bg-muted/30"}`}
                        >
                          <RadioGroupItem value={String(o.value)} className="sr-only" />
                          <div className={`size-4 rounded-full border flex items-center justify-center text-[10px] ${isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground"}`}>
                            {isSelected && <div className="size-2 rounded-full bg-current" />}
                          </div>
                          <span className="font-bold text-primary w-4">{letter}.</span>
                          <div className="flex-1 text-sm font-normal">
                            {o.kind === "IMAGEN" ? <Image src={o.value} alt="Opción" width={400} height={400} className="rounded aspect-auto h-auto w-fit border" /> : <span>{o.label}</span>}
                          </div>
                        </Label>
                      )
                    })}
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

            {/* Pagination Container (Numbers + Ellipsis) */}
            <nav className="flex items-center justify-center gap-1.5 pt-2">
              {/* Previous group ellipsis */}
              {hasPrevGroup && (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => setPageGroup((g) => Math.max(0, g - 1))}
                  title="Grupo anterior"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              )}

              {/* Page numbers */}
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

              {/* Next group ellipsis */}
              {hasNextGroup && (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => setPageGroup((g) => Math.min(totalGroups - 1, g + 1))}
                  title="Grupo siguiente"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
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
              <Timer
                className={`h-4 w-4 ${timeLeft <= TIME_WARNING_THRESHOLD_SECONDS ? "text-destructive" : "text-primary"}`}
              />
              <span className={`text-sm  ${timeLeft <= TIME_WARNING_THRESHOLD_SECONDS ? "text-destructive" : ""}`}>
                {formatSeconds(timeLeft)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void handleSaveProgreso(false, false);
                router.push("/inicio");
              }}
            >
              Pausar y Salir
            </Button>
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
                centered
                className="max-w-md text-center"
              >
                <AlertDialogHeader className="items-center">
                  <AlertDialogTitle className="text-xl">Terminar Prueba</AlertDialogTitle>
                  <AlertDialogDescription className="text-balance">
                    ¿Estás seguro de enviar tus respuestas finales?
                  </AlertDialogDescription>
                </AlertDialogHeader>

                {evaluacion.preguntas.some(p => !responses[p.id] || responses[p.id] === "") && (
                  <div className="space-y-3 pb-5">
                    <p className="text-sm text-destructive">Tienes preguntas sin responder:</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {evaluacion.preguntas.map((p, i) => ({ id: p.id, num: i + 1 }))
                        .filter(item => !responses[item.id] || responses[item.id] === "")
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

      <AlertDialog open={isTimeWarningOpen} onOpenChange={setIsTimeWarningOpen}>
        <AlertDialogContent
          bottomStickOnMobile={false}
          centered
          className="max-w-md text-center"
        >
          <AlertDialogHeader className="items-center">
            <AlertDialogTitle className="text-destructive">Te quedan 5 minutos</AlertDialogTitle>
            <AlertDialogDescription>
              El tiempo esta por terminar. Revisa tus respuestas y finaliza si es necesario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                writeCookie(TIME_WARNING_COOKIE_NAME, "1", TIME_WARNING_COOKIE_MAX_AGE);
                setHideTimeWarning(true);
                setHasShownTimeWarning(true);
                setIsTimeWarningOpen(false);
              }}
            >
              No volver a recordar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsTimeWarningOpen(false);
                void handleSaveProgreso(false, false);
                router.push("/inicio");
              }}
            >
              Pausar y Salir
            </Button>
            <Button type="button" onClick={() => setIsTimeWarningOpen(false)}>
              Entendido
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(attemptLimitMessage)}
        onOpenChange={(open) => {
          if (!open) setAttemptLimitMessage(null);
        }}
      >
        <AlertDialogContent bottomStickOnMobile={false} centered className="max-w-md text-center">
          <AlertDialogHeader className="items-center">
            <AlertDialogTitle>Límite de intentos</AlertDialogTitle>
            <AlertDialogDescription>{attemptLimitMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="justify-center">
            <Button type="button" onClick={() => setAttemptLimitMessage(null)}>
              Entendido
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
