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

type Asset = { kind: string; url: string; alt?: string; title?: string; orden?: number };
type PreguntaTipo = "ABIERTA" | "CERRADA";

type Pregunta = {
    id: string;
    bancoId: string;
    codigo?: string | null;
    enunciado: string;
    tipo: PreguntaTipo;
    opciones?: any;
    assets?: Asset[] | null;
    solucionKind?: string | null;
    solucion?: {
        kind: string;
        value: any;
    } | null;
};

export type RepasoTakeClientProps = {
    evaluacion: { id: string; titulo: string };
    preguntas: Pregunta[];
};

export default function RepasoTakeClient({
    evaluacion,
    preguntas: initialPreguntas,
}: RepasoTakeClientProps) {
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
        const correct = kind && u !== null && c !== null ? compareRespuesta(u, c) : false;

        setIsCorrect(correct);
        setShowFeedback(true);

        if (correct) {
            setSessionResolvedIds(prev => {
                const next = new Set(prev);
                next.add(currentQuestion.bancoId);
                return next;
            });
        }
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
            const ids = Array.from(sessionResolvedIds);
            if (ids.length > 0) {
                await Promise.all(ids.map(bancoId =>
                    fetch("/api/evaluacion/preguntas-falladas", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ entryId: bancoId, resuelta: true }),
                    })
                ));
            }
            router.replace("/repaso");
        } catch (e) { toast.error("Error al guardar"); }
        finally { setIsMarking(false); }
    };

    const totalQuestions = initialPreguntas.length;
    const correctCount = sessionResolvedIds.size;
    const incorrectCount = Math.max(0, totalQuestions - correctCount);

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
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 gap-6 max-w-sm mx-auto text-center font-sans">
                {loadingOverlay}
                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                <div className="space-y-1">
                    <h1 className="text-xl font-bold">Repaso completado</h1>
                    <p className="text-sm text-muted-foreground">Terminaste el repaso. Estos son tus resultados:</p>
                </div>
                <div className="w-full grid gap-2 text-left text-sm">
                    <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                        <span>Total</span>
                        <span className="font-semibold">{totalQuestions}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                        <span>Aciertos</span>
                        <span className="font-semibold text-emerald-600">{correctCount}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                        <span>Fallos</span>
                        <span className="font-semibold text-destructive">{incorrectCount}</span>
                    </div>
                </div>
                <div className="flex flex-col gap-2 w-full">
                    <Button onClick={handleFinalize} disabled={isMarking}>
                        Terminar y Borrar Repaso
                    </Button>
                    <Button onClick={() => {
                        router.replace('/repaso')
                    }} variant="outline" >
                        Salir sin Guardar
                    </Button>
                </div>
            </div>
        );
    }

    const isMulti = currentQuestion.solucionKind === "CHOICE_MULTI" || currentQuestion.solucion?.kind === "CHOICE_MULTI";

    return (
        <div className="min-h-screen bg-background flex flex-col items-center px-4 py-8 gap-6 w-full max-w-xl mx-auto font-sans">
            {loadingOverlay}
            <header className="text-center space-y-2">
                <div className="flex flex-col items-center gap-1">
                    <h1 className="text-xl font-bold">{evaluacion.titulo}</h1>
                    <Badge variant="outline" className="font-semibold">
                        MODO REPASO
                    </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                    {activeQuestions.length} preguntas restantes
                </p>
            </header>

            <div className="w-full flex-1 space-y-4">
                <motion.div key={currentQuestion.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full space-y-6">
                    <div className="space-y-3">
                        {currentQuestion.codigo && (
                            <Badge variant="outline">{currentQuestion.codigo}</Badge>
                        )}
                        <h2 className="text-sm font-medium space-x-2">

                            <span className="font-bold text-primary shrink-0">Pregunta.-</span>
                            <span className="text-foreground">{currentQuestion.enunciado}</span>
                        </h2>
                        {currentQuestion.assets?.map((asset, i) => (
                            <div key={i} className="flex justify-center py-1">
                                <Image src={asset.url} alt="recurso" width={500} height={300} className="rounded-lg border w-full max-h-60 object-contain" />
                            </div>
                        ))}
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
                                const solValue = normalizeSolucion(currentQuestion.solucion?.value);
                                const isOptionCorrect = Array.isArray(solValue)
                                    ? solValue.some(sv => getVal(sv) === val)
                                    : getVal(solValue) === val;
                                const correctAlt = Array.isArray(solValue)
                                    ? (solValue as any[]).find(sv => getVal(sv) === val)?.alt
                                    : (getVal(solValue) === val ? (solValue as any)?.alt : undefined);

                                let bgClass = isSelected ? "bg-primary/5 border-primary shadow-sm" : "border-border/60 hover:bg-muted/30";
                                let icon = null;

                                if (effectiveShowFeedback) {
                                    if (isSelected) {
                                        bgClass = isOptionCorrect ? "bg-emerald-500/10 border-emerald-500" : "bg-destructive/10 border-destructive";
                                        icon = isOptionCorrect ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-destructive" />;
                                    } else if (isOptionCorrect) {
                                        bgClass = "border-emerald-500/40 bg-emerald-50/5";
                                        icon = <CheckCircle2 className="w-5 h-5 text-emerald-600/40" />;
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
                                            "flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer relative min-h-[4rem]",
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
                                                <span className={cn("font-medium", showFeedback && isSelected && !isOptionCorrect ? "text-destructive" : "")}>
                                                    {opt.label || opt.text || opt.value}
                                                </span>
                                            )}
                                        </div>
                                        {(effectiveShowFeedback && isOptionCorrect) || (isPreview && isOptionCorrect) && (
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
                            className="w-full font-bold"
                            disabled={!isPreview && !responses[currentQuestion.id] && !showFeedback || isValidating}
                            variant={isPreview ? "secondary" : "default"}
                        >
                            {isPreview ? "Volver al repaso" : (showFeedback ? (activeQuestions.length === 1 && isCorrect ? "Finalizar" : "Siguiente") : "Validar")}
                        </Button>

                        {sessionResolvedIds.size > 0 && (
                            <div className="pt-6 ">
                                <p className="text-sm font-medium text-muted-foreground mb-3 text-center">
                                    Aciertos ({sessionResolvedIds.size})
                                </p>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {initialPreguntas.filter(p => sessionResolvedIds.has(p.bancoId)).map((p, idx) => (
                                        <Button
                                            key={p.id}
                                            variant="outline"
                                            size="icon"
                                            className={cn("h-8 w-8 text-xs border-2", previewQuestionId === p.id && "border-primary bg-primary/5 text-primary")}
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
        </div >
    );
}



