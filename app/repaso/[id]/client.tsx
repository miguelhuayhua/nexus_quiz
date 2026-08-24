"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, CheckCircle2, XCircle, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { compareRespuesta, normalizeSolucion, parseRespuesta } from "@/lib/evaluacion-eval";
import { toast } from "sonner";
import { Loader } from "@/components/ui/loader";
import CountingNumber from "@/components/ui/counting-number";

type Asset = { kind: string; url: string; alt?: string; title?: string; orden?: number };
type PreguntaTipo = "ABIERTA" | "CERRADA";

type Pregunta = {
    id: string;
    bancoId: string;
    codigo?: string | null;
    explicacion?: string | null;
    temaNombre?: string | null;
    temaDescripcion?: string | null;
    enunciado: string;
    tipo: PreguntaTipo;
    opciones?: any;
    assets?: Asset[] | null;
    solucionKind?: string | null;
    solucion?: {
        kind: string;
        value: any;
    } | null;
    failCount?: number;
    dificultad?: "DIFICIL" | "MEDIO" | "SENCILLO";
    tasaAciertoHistorica?: number;
};

export type RepasoTakeClientProps = {
    banqueo: { id: string; titulo: string };
    preguntas: Pregunta[];
    repasoStatsPrevios?: {
        total: number;
        correctas: number;
    };
};

export default function RepasoTakeClient({
    banqueo,
    preguntas: initialPreguntas,
    repasoStatsPrevios,
}: RepasoTakeClientProps) {
    const getDificultadLabel = (value?: "DIFICIL" | "MEDIO" | "SENCILLO") => {
        if (value === "DIFICIL") return "ALTA";
        if (value === "SENCILLO") return "BAJA";
        return "MEDIA";
    };

    const getDificultadClass = (value?: "DIFICIL" | "MEDIO" | "SENCILLO") => {
        if (value === "DIFICIL") {
            return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300";
        }
        if (value === "SENCILLO") {
            return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300";
        }
        return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300";
    };

    const router = useRouter();
    const [activeQuestions, setActiveQuestions] = React.useState<Pregunta[]>(initialPreguntas);
    const [sessionResolvedIds, setSessionResolvedIds] = React.useState<Set<string>>(new Set());
    const [previewQuestionId, setPreviewQuestionId] = React.useState<string | null>(null);
    const [currentIndex, setCurrentIndex] = React.useState(0);
    const [responses, setResponses] = React.useState<Record<string, string>>({});
    const [isFinished, setIsFinished] = React.useState(false);
    const [showFeedback, setShowFeedback] = React.useState(false);
    const [isCorrect, setIsCorrect] = React.useState(false);
    const [isValidating, setIsValidating] = React.useState(false);
    const [isMarking, setIsMarking] = React.useState(false);
    const [resultadosRepaso, setResultadosRepaso] = React.useState<Record<string, boolean>>({});

    if (!activeQuestions.length && !isFinished) {
        return null;
    }

    const currentQuestion = previewQuestionId
        ? initialPreguntas.find(p => p.id === previewQuestionId)!
        : activeQuestions[currentIndex];

    const isPreview = !!previewQuestionId;

    const handleChange = (id: string, value: string) => {
        if (isPreview || showFeedback) return;
        setResponses((prev) => ({ ...prev, [id]: value }));
    };

    const normalizeOptions = (opciones?: any): any[] => {
        if (!opciones || !Array.isArray(opciones)) return [];
        return opciones.map((o) => {
            if (o && typeof o === "object" && !Array.isArray(o)) {
                const rawUrl = "url" in o && typeof o.url === "string" ? o.url : undefined;
                const value = ("value" in o && (typeof o.value === "string" || typeof o.value === "number") && String(o.value).trim())
                    || (rawUrl && rawUrl.trim())
                    || "";
                if (!value) return null;
                const rawLabel = ("label" in o && typeof o.label === "string" && o.label)
                    || ("text" in o && typeof o.text === "string" && o.text)
                    || "";
                let kind = "kind" in o && typeof o.kind === "string" ? o.kind : undefined;
                if (!kind && "type" in o && typeof o.type === "string") kind = o.type;

                if (!kind && (rawUrl || value.startsWith("http") || value.startsWith("/") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(value))) {
                    kind = "IMAGEN";
                }
                const alt = "alt" in o && typeof o.alt === "string" ? o.alt : undefined;
                const label = kind === "IMAGEN" ? undefined : (rawLabel || value);
                const imageAlt = kind === "IMAGEN" ? alt : alt;
                return { label, value, kind, alt: imageAlt };
            }
            return { label: String(o), value: String(o) };
        }).filter(Boolean);
    };

    const getVal = (v: any) => {
        if (v && typeof v === "object" && v.url) return String(v.url).trim().toLowerCase();
        if (v && typeof v === "object" && v.value) return String(v.value).trim().toLowerCase();
        return String(v).trim().toLowerCase();
    };

    const getOptionCandidateValues = (opt: any) => {
        const values = [getVal(opt?.value)];
        const rawLabel = opt?.label || opt?.text;
        if (rawLabel !== undefined && rawLabel !== null) values.push(getVal(rawLabel));
        return Array.from(new Set(values.filter((item) => item.length > 0)));
    };

    const renderContent = (item: any) => {
        if (!item) return null;
        const isImage = (typeof item === 'object' && !Array.isArray(item) && (item.kind === 'IMAGEN' || item.type === 'IMAGEN' || item.url)) ||
            (typeof item === 'string' && (item.startsWith('http') || item.startsWith('/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(item)));

        if (isImage) {
            const url = typeof item === 'object' ? (item.value || item.url) : item;
            const altText = typeof item === 'object' ? item.alt : null;
            return (
                <div className="flex flex-col gap-2">
                    <Image src={url} alt={altText || "Contenido"} width={400} height={250} className="rounded-lg border h-auto w-auto max-h-[200px] object-contain bg-white dark:bg-zinc-900 shadow-sm" />
                    {altText && <p className="text-sm font-medium text-emerald-600 leading-tight">{altText}</p>}
                </div>
            );
        }

        if (typeof item === 'object' && !Array.isArray(item)) {
            return <span className="font-medium">{String(item.label || item.text || item.value || "")}</span>;
        }
        return <span className="font-medium">{String(item)}</span>;
    };

    const renderSolucion = (sol: any) => {
        if (!sol || sol.value === undefined || sol.value === null) return <span className="text-xl font-bold">Sin soluciÃ³n</span>;
        const v = sol.value;
        const normalizedSol = Array.isArray(v) ? v : [v];

        return (
            <div className="flex flex-col gap-3">
                {normalizedSol.map((item, idx) => {
                    const isImg = (typeof item === 'object' && item?.url) || (typeof item === 'string' && (item.startsWith('http') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(item)));
                    const url = typeof item === 'object' ? item.url : item;
                    const alt = typeof item === 'object' ? item.alt : null;

                    return (
                        <div key={idx} className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-lg font-bold text-foreground">
                                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                                {!isImg && renderContent(item)}
                            </div>
                            {isImg && (
                                <div className="ml-7 space-y-2">
                                    <Image src={url} alt={alt || "SoluciÃ³n"} width={400} height={250} className="rounded-lg border shadow-sm max-h-[200px] w-auto h-auto object-contain bg-white dark:bg-zinc-900" />
                                    {alt && <p className="text-sm font-medium text-emerald-600 leading-tight italic">{alt}</p>}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    const validateResponse = async () => {
        setIsValidating(true);
        const kind = currentQuestion.solucionKind || currentQuestion.solucion?.kind;
        const resp = responses[currentQuestion.id];
        const solValueRaw = currentQuestion.solucion?.value;

        const u = parseRespuesta(resp, kind);
        const c = normalizeSolucion(solValueRaw, kind);

        // Normalize both to sets of values for easier inclusion check in the UI map
        const correct = u !== null && c !== null ? compareRespuesta(u, c) : false;

        setIsCorrect(correct);
        setShowFeedback(true);

        if (correct) {
            setSessionResolvedIds(prev => {
                const next = new Set(prev);
                next.add(currentQuestion.bancoId);
                return next;
            });
        }
        setResultadosRepaso((prev) => ({ ...prev, [currentQuestion.id]: correct }));
        setIsValidating(false);
    };

    const handleNext = () => {
        const nextPool = [...activeQuestions];
        let nextIdx = currentIndex;

        if (isCorrect) {
            nextPool.splice(currentIndex, 1);
            if (nextPool.length === 0) {
                setIsFinished(true);
                return;
            }
            if (nextIdx >= nextPool.length) nextIdx = 0;
        } else {
            nextIdx = (currentIndex + 1) % nextPool.length;
        }

        setActiveQuestions(nextPool);
        setCurrentIndex(nextIdx);
        setResponses({});
        setShowFeedback(false);
        setIsCorrect(false);
    };

    const handleFinalize = async () => {
        setIsMarking(true);
        try {
            const payload = Object.entries(resultadosRepaso).map(([preguntaId, esCorrecta]) => ({
                preguntaId,
                esCorrecta,
            }));
            if (payload.length > 0) {
                await fetch("/api/repaso/finalizar", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        bancoId: banqueo.id,
                        resultados: payload,
                    }),
                });
            }
            router.replace("/repaso");
        } catch (e) { toast.error("Error al cerrar repaso"); }
        finally { setIsMarking(false); }
    };

    const totalQuestions = initialPreguntas.length;
    const correctCount = sessionResolvedIds.size;
    const incorrectCount = Math.max(0, totalQuestions - correctCount);
    const prevTotal = repasoStatsPrevios?.total ?? 0;
    const prevCorrectas = repasoStatsPrevios?.correctas ?? 0;
    const prevRate = prevTotal > 0 ? (prevCorrectas / prevTotal) * 100 : 0;
    const newRate =
        prevTotal + totalQuestions > 0
            ? ((prevCorrectas + correctCount) / (prevTotal + totalQuestions)) * 100
            : 0;
    const deltaRate = Math.round(newRate - prevRate);
    const fallosHistoricos = initialPreguntas.reduce((acc, item) => acc + (item.failCount ?? 0), 0);

    const loadingOverlay = (
        <AnimatePresence>
            {isMarking && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-background/50 backdrop-blur-md flex items-center justify-center h-screen w-screen"
                >
                    <div className="flex flex-col items-center gap-4">
                        <Loader variant="cube" size={40} />
                        <span className="text-foreground font-semibold">Procesando repaso...</span>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );

    if ((isFinished || !currentQuestion) && !isPreview) {
        return (
            <div className="space-y-6 max-w-5xl mx-auto text-center ">
                {loadingOverlay}
                <h1 className="text-3xl">Repaso completado</h1>
                <p className="text-muted-foreground">Terminaste el repaso. Estos son tus resultados:</p>
                <div className=" grid grid-cols-4 gap-2 ">
                    <div className="flex flex-col items-center gap-1">
                        <span>Total</span>
                        <CountingNumber number={totalQuestions} className="text-4xl" />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <span>Aciertos</span>
                        <CountingNumber number={correctCount} className="text-4xl text-emerald-600" />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <span>Fallos</span>
                        <CountingNumber number={incorrectCount} className="text-4xl text-destructive" />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <span>Fallos históricos</span>
                        <CountingNumber number={fallosHistoricos} className="text-4xl" />
                    </div>

                </div>
                <div className="space-x-2">
                    <Button onClick={handleFinalize} disabled={isMarking}>
                        Terminar y Borrar Repaso
                    </Button>
                    <Button onClick={() => {
                        router.replace('/repaso')
                    }} variant="destructive-outline" >
                        Salir sin Guardar
                    </Button>
                </div>
            </div>
        );
    }

    const isMulti = currentQuestion.solucionKind === "CHOICE_MULTI" || currentQuestion.solucion?.kind === "CHOICE_MULTI";

    return (
        <div className="flex flex-col items-center gap-6 w-full max-w-3xl mx-auto">
            {loadingOverlay}
            <header className="text-center space-y-2">
                <div className="flex flex-col items-center gap-1">
                    <h1 className="text-2xl">{banqueo.titulo}</h1>
                    <Badge variant="outline" >
                        MODO REPASO
                    </Badge>
                </div>
                <p className=" text-muted-foreground">
                    {activeQuestions.length} preguntas
                </p>
            </header>

            <motion.div key={currentQuestion.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full space-y-6">
                <div className="space-y-3">

                    <h2 className="text-md space-x-2">

                        <span className=" text-primary">Pregunta.-</span>
                        <span className="text-foreground">{currentQuestion.enunciado}</span>
                    </h2>
                    <Badge variant="outline" className={getDificultadClass(currentQuestion.dificultad)}>
                        Dificultad: {getDificultadLabel(currentQuestion.dificultad)}
                    </Badge>
                    {showFeedback && currentQuestion.explicacion?.trim() && (
                        <div className="rounded-lg border border-emerald-500 p-3">
                            <p className="text-xs font-medium text-emerald-500">
                                Explicación
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {currentQuestion.explicacion}
                            </p>
                        </div>
                    )}

                </div>

                <div className="grid gap-2">
                    {currentQuestion.tipo === "CERRADA" ? (
                        normalizeOptions(currentQuestion.opciones).map((opt: any, idx: number) => {
                            const val = String(opt.value).trim().toLowerCase();
                            const isSelected = isMulti
                                ? responses[currentQuestion.id]?.toLowerCase().includes(val)
                                : responses[currentQuestion.id] === val;
                            const effectiveShowFeedback = isPreview ? true : showFeedback;

                            // Comparison logic for UI feedback
                            const kind = currentQuestion.solucionKind || currentQuestion.solucion?.kind || undefined;
                            const solValue = normalizeSolucion(currentQuestion.solucion?.value, kind);
                            const optionCandidates = getOptionCandidateValues(opt);
                            const solvedValues = Array.isArray(solValue) ? solValue : [solValue];
                            const isOptionCorrect = solValue !== null && optionCandidates.some((candidate) =>
                                solvedValues.some((solved) => compareRespuesta(candidate, solved))
                            );
                            const correctAlt = Array.isArray(solValue)
                                ? (solValue as any[]).find(sv => getVal(sv) === val)?.alt
                                : (getVal(solValue) === val ? (solValue as any)?.alt : undefined);

                            let bgClass = isSelected ? "bg-primary/5 border-primary " : "border-border/60 hover:bg-muted/30";
                            let icon = null;

                            if (effectiveShowFeedback) {
                                if (isSelected) {
                                    bgClass = isOptionCorrect ? "bg-emerald-500/10 border-emerald-500" : "bg-destructive/10 border-destructive";
                                    icon = isOptionCorrect ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-destructive" />;
                                } else if (isOptionCorrect) {
                                    bgClass = "border-emerald-500 bg-emerald-500/10";
                                    icon = <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
                                }
                            } else {
                                if (isMulti) {
                                    icon = <Checkbox checked={isSelected} className={cn("pointer-events-none", isSelected && "border-primary")} />;
                                } else {
                                    icon = isSelected ? <div className="w-2 h-2 bg-primary rounded-full transition-all" /> : null;
                                }
                            }

                            return (
                                <div
                                    key={idx}
                                    onClick={() => {
                                        if (isPreview || showFeedback) return;
                                        if (isMulti) {
                                            const current = JSON.parse(responses[currentQuestion.id] || "[]").map((v: string) => v.toLowerCase().trim());
                                            const next = isSelected
                                                ? current.filter((v: any) => v !== val)
                                                : [...current, val];
                                            handleChange(currentQuestion.id, JSON.stringify(next));
                                        } else {
                                            handleChange(currentQuestion.id, val);
                                        }
                                    }}
                                    className={cn(
                                        "flex items-center gap-3 p-3  border transition-all cursor-pointer relative ",
                                        bgClass,
                                        isPreview && "cursor-default"
                                    )}
                                >
                                    <div className={cn(
                                        "w-5 h-5 flex items-center justify-center shrink-0 transition-all",
                                        !effectiveShowFeedback && !isMulti && "rounded-full border border-muted-foreground/40",
                                        !effectiveShowFeedback && !isMulti && isSelected && "border-primary"
                                    )}>
                                        {icon}
                                    </div>
                                    <div className="text-sm flex-1">
                                        {opt.kind === "IMAGEN" || (typeof opt.value === 'string' && (opt.value.startsWith('http') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(opt.value))) ? (
                                            <div className="space-y-1">
                                                <Image src={opt.value} alt={opt.alt || "Opcion"} width={400} height={200} className="rounded-lg border shadow-sm aspect-auto h-auto w-fit max-h-40 bg-zinc-50" />
                                                {opt.alt && (
                                                    <p className={cn(
                                                        "text-sm font-medium leading-tight",
                                                        effectiveShowFeedback && isOptionCorrect ? "text-emerald-600" : "text-muted-foreground/60"
                                                    )}>
                                                        {opt.alt}
                                                    </p>
                                                )}
                                                {!opt.alt && effectiveShowFeedback && isOptionCorrect && correctAlt && (
                                                    <p className="text-sm font-medium leading-tight text-emerald-600">
                                                        {correctAlt}
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <span className={cn(
                                                showFeedback && isOptionCorrect && "text-emerald-700 dark:text-emerald-300",
                                                showFeedback && isSelected && !isOptionCorrect && "text-destructive"
                                            )}>
                                                {opt.label || opt.text || opt.value}
                                            </span>
                                        )}
                                    </div>
                                    {((effectiveShowFeedback && isOptionCorrect) || (isPreview && isOptionCorrect)) && (
                                        <Badge variant="secondary" className="ml-auto">
                                            Correcta
                                        </Badge>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <Input
                            placeholder="Introduzca su respuesta..."
                            value={responses[currentQuestion.id] ?? ""}
                            onChange={(e) => handleChange(currentQuestion.id, e.target.value)}
                            className="h-11 text-sm rounded-xl border-border bg-transparent"
                            disabled={isPreview || showFeedback}
                        />
                    )}
                </div>


                <div className="flex flex-col gap-4">
                    <Button
                        onClick={() => {
                            if (isPreview) {
                                setPreviewQuestionId(null);
                            } else if (showFeedback) {
                                if (activeQuestions.length === 1 && isCorrect) {
                                    setIsFinished(true);
                                    setActiveQuestions([]);
                                    setCurrentIndex(0);
                                    setResponses({});
                                    setShowFeedback(false);
                                    setIsCorrect(false);
                                } else {
                                    handleNext();
                                }
                            } else {
                                validateResponse();
                            }
                        }}
                        disabled={!isPreview && !responses[currentQuestion.id] && !showFeedback || isValidating}
                        variant={isPreview ? "secondary" : "default"}
                    >
                        {isPreview ? "Volver al repaso" : (showFeedback ? (activeQuestions.length === 1 && isCorrect ? "Finalizar" : "Siguiente") : "Validar")}
                    </Button>

                    {sessionResolvedIds.size > 0 && (
                        <div className="pt-6 ">
                            <p className="text-sm font-medium text-muted-foreground mb-3 text-center">
                                Aciertos
                            </p>
                            <div className="flex flex-wrap justify-center gap-2">
                                {initialPreguntas.filter(p => sessionResolvedIds.has(p.bancoId)).map((p, idx) => (
                                    <Button
                                        key={p.id}
                                        variant="outline"
                                        size="icon"
                                        className={cn("", previewQuestionId === p.id && "border-primary bg-primary/5 text-primary")}
                                        onClick={() => setPreviewQuestionId(p.id)}
                                    >
                                        {initialPreguntas.indexOf(p) + 1}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div >
    );
}



