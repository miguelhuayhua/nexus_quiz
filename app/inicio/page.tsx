import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { EstadoIntento } from "@/prisma/generated";
import {
    PlayIcon,
    SparklesIcon,
    CircleIcon,
    ClockIcon,
    TrophyIcon,
    TargetIcon,
    ZapIcon,
    CalendarDaysIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
    hasActiveProSubscription,
    resolveUsuarioEstudianteIdFromSession,
} from "@/lib/subscription-access";
import { AreaRadarChart, ActivityLineChart } from "./charts";

export const metadata: Metadata = {
    title: "Inicio",
    description: "Página de inicio con resumen de actividad.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatTimeRemaining(seconds: number) {
    const safe = Math.max(0, Math.floor(seconds));
    const h = Math.floor(safe / 3600);
    const m = Math.floor((safe % 3600) / 60);
    const s = safe % 60;

    if (h > 0) return `${h}h ${m}m restantes`;
    if (m > 0) return `${m}m ${s}s restantes`;
    return `${s}s restantes`;
}

// Returns day label: L, M, X, J, V, S, D
function getDayLabel(dayIndex: number) {
    return ["D", "L", "M", "X", "J", "V", "S"][dayIndex] ?? "";
}

export default async function InicioPage() {
    const session = await getServerAuthSession();
    if (!session?.user?.id && !session?.user?.email) {
        redirect("/");
    }

    const usuarioEstudianteId = await resolveUsuarioEstudianteIdFromSession({
        userId: session?.user?.id,
        email: session?.user?.email ?? null,
    });
    const hasPro = await hasActiveProSubscription(usuarioEstudianteId);

    let userName = session?.user?.name?.trim() || "Estudiante";

    if (usuarioEstudianteId) {
        const usuarioEstudiante = await prisma.usuariosEstudiantes.findUnique({
            where: { id: usuarioEstudianteId },
            select: {
                estudiantes: {
                    select: {
                        nombre: true,
                        apellido: true,
                    },
                },
            },
        });

        if (usuarioEstudiante?.estudiantes) {
            const { nombre, apellido } = usuarioEstudiante.estudiantes;
            userName = `${nombre} ${apellido || ""}`.trim();
        }
    }
    const planLabel = hasPro ? "PRO" : "BASIC";
    const PlanIcon = hasPro ? SparklesIcon : CircleIcon;

    // ─── Last unfinished test ───────────────────────────────────────────
    let lastUnfinishedTest: {
        banqueoId: string;
        banqueoTitulo: string;
        tiempoRestante: number;
        intentoId: string;
    } | null = null;

    if (usuarioEstudianteId) {
        const recentIntento = await prisma.intentos.findFirst({
            where: {
                usuarioEstudianteId,
                estado: EstadoIntento.EN_PROGRESO,
            },
            select: {
                id: true,
                tiempoDuracion: true,
                banqueo: {
                    select: {
                        id: true,
                        titulo: true,
                        duracion: true,
                    },
                },
            },
            orderBy: {
                creadoEn: "desc",
            },
        });

        if (recentIntento?.banqueo) {
            const tiempoRestante = Math.max(
                0,
                (recentIntento.banqueo.duracion * 60) - recentIntento.tiempoDuracion,
            );
            if (tiempoRestante > 0) {
                lastUnfinishedTest = {
                    banqueoId: recentIntento.banqueo.id,
                    banqueoTitulo: recentIntento.banqueo.titulo,
                    tiempoRestante,
                    intentoId: recentIntento.id,
                };
            }
        }
    }

    // ─── Stats & Chart Data ──────────────────────────────────────────────
    let totalCorrectas = 0;
    let totalIncorrectas = 0;
    let totalBanqueosCompletados = 0;
    let rachaActual = 0;
    let radarData: { area: string; puntos: number }[] = [];
    let lineData: { date: string; correctas: number; incorrectas: number }[] = [];
    const weekActivity: boolean[] = [false, false, false, false, false, false, false];

    if (usuarioEstudianteId) {
        // Global stats from intentos
        const intentosStats = await prisma.intentos.aggregate({
            where: { usuarioEstudianteId, estado: "FINALIZADO" },
            _sum: { correctas: true, incorrectas: true },
            _count: true,
        });
        totalCorrectas = intentosStats._sum.correctas ?? 0;
        totalIncorrectas = intentosStats._sum.incorrectas ?? 0;
        totalBanqueosCompletados = intentosStats._count;

        // ─── Racha (streak): consecutive days with finished intentos ────────
        const allIntentoDates = await prisma.intentos.findMany({
            where: { usuarioEstudianteId, estado: "FINALIZADO" },
            select: { creadoEn: true },
            orderBy: { creadoEn: "desc" },
        });

        if (allIntentoDates.length > 0) {
            // Unique dates
            const uniqueDates = [
                ...new Set(
                    allIntentoDates.map((i) =>
                        i.creadoEn.toISOString().slice(0, 10),
                    ),
                ),
            ].sort((a, b) => b.localeCompare(a));

            const today = new Date().toISOString().slice(0, 10);
            // Streak must start today or yesterday
            if (uniqueDates[0] === today || uniqueDates[0] === getYesterday(today)) {
                rachaActual = 1;
                for (let i = 1; i < uniqueDates.length; i++) {
                    const prev = new Date(uniqueDates[i - 1]);
                    const curr = new Date(uniqueDates[i]);
                    const diff =
                        (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
                    if (Math.round(diff) === 1) {
                        rachaActual++;
                    } else {
                        break;
                    }
                }
            }
        }

        // ─── Weekly activity (last 7 days) ─────────────────────────────────
        const now = new Date();
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 6);
        weekAgo.setHours(0, 0, 0, 0);

        const weekIntentos = await prisma.intentos.findMany({
            where: {
                usuarioEstudianteId,
                creadoEn: { gte: weekAgo },
            },
            select: { creadoEn: true },
        });

        for (const intento of weekIntentos) {
            const day = intento.creadoEn.getDay();
            weekActivity[day] = true;
        }

        // ─── Radar: points per area ──────────────────────────────────────
        const areas = await prisma.areas.findMany({
            select: {
                id: true,
                titulo: true,
                preguntas: {
                    select: {
                        respuestasIntentos: {
                            where: {
                                intentos: { usuarioEstudianteId },
                                esCorrecta: true,
                            },
                            select: { id: true },
                        },
                    },
                },
            },
        });

        radarData = areas
            .map((a) => ({
                area: a.titulo.length > 14 ? a.titulo.slice(0, 12) + "…" : a.titulo,
                puntos: a.preguntas.reduce(
                    (sum, p) => sum + p.respuestasIntentos.length,
                    0,
                ),
            }))
            .filter((a) => a.puntos > 0 || areas.length <= 8);

        // If no areas have data, keep all for the radar
        if (radarData.every((d) => d.puntos === 0) && radarData.length > 0) {
            radarData = areas.map((a) => ({
                area: a.titulo.length > 14 ? a.titulo.slice(0, 12) + "…" : a.titulo,
                puntos: 0,
            }));
        }

        // ─── Line chart: last 30 days activity ────────────────────────────
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
        thirtyDaysAgo.setHours(0, 0, 0, 0);

        const recentResponses = await prisma.respuestasIntentos.findMany({
            where: {
                intentos: { usuarioEstudianteId },
                respondida: true,
                respondidaEn: { gte: thirtyDaysAgo },
            },
            select: {
                esCorrecta: true,
                respondidaEn: true,
            },
        });

        // Group by day
        const dayMap = new Map<
            string,
            { correctas: number; incorrectas: number }
        >();

        for (let d = 0; d < 30; d++) {
            const date = new Date(thirtyDaysAgo);
            date.setDate(date.getDate() + d);
            const key = date.toISOString().slice(0, 10);
            dayMap.set(key, { correctas: 0, incorrectas: 0 });
        }

        for (const r of recentResponses) {
            if (!r.respondidaEn) continue;
            const key = r.respondidaEn.toISOString().slice(0, 10);
            const entry = dayMap.get(key);
            if (entry) {
                if (r.esCorrecta) {
                    entry.correctas++;
                } else {
                    entry.incorrectas++;
                }
            }
        }

        lineData = Array.from(dayMap.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, vals]) => ({ date, ...vals }));
    }

    // Reorder weekActivity to start with Monday (today highlighted)
    const today = new Date();
    const todayDayIndex = today.getDay();
    const weekDays: { label: string; active: boolean; isToday: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
        const dayOffset = (todayDayIndex - i + 7) % 7;
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        weekDays.push({
            label: getDayLabel(date.getDay()),
            active: weekActivity[date.getDay()],
            isToday: i === 0,
        });
    }

    const tasaAcierto =
        totalCorrectas + totalIncorrectas > 0
            ? Math.round(
                (totalCorrectas / (totalCorrectas + totalIncorrectas)) * 100,
            )
            : 0;

    return (
        <main className="mx-auto w-full max-w-5xl space-y-6 p-6">
            {/* ── Welcome Header ──────────────────────────────────────── */}
            <header className="space-y-1">
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="font-semibold text-2xl tracking-tight">
                        Bienvenido, {userName}
                    </h1>
                    <Badge
                        className={
                            hasPro
                                ? "border-yellow-400 bg-yellow-50 text-yellow-800 dark:border-yellow-500/50 dark:bg-yellow-500/20 dark:text-yellow-300"
                                : undefined
                        }
                        variant="outline"
                    >
                        <PlanIcon className="size-3" />
                        {planLabel}
                    </Badge>
                </div>
                <p className="text-muted-foreground text-sm italic">
                    &ldquo;La constancia de hoy es la especialidad de mañana&rdquo;
                </p>
            </header>

            {/* ── Resume Last Test ────────────────────────────────────── */}
            {lastUnfinishedTest && (
                <Card className="overflow-hidden border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5">
                    <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                        <div className="space-y-1">
                            <p className="text-xs font-medium uppercase tracking-wide text-primary">
                                Prueba en progreso
                            </p>
                            <h2 className="font-semibold text-lg">
                                {lastUnfinishedTest.banqueoTitulo}
                            </h2>
                            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                <ClockIcon className="size-4" />
                                <span>
                                    {formatTimeRemaining(
                                        lastUnfinishedTest.tiempoRestante,
                                    )}
                                </span>
                            </div>
                        </div>
                        <Button
                            render={
                                <Link
                                    href={`/prueba/${lastUnfinishedTest.banqueoId}?intentoId=${lastUnfinishedTest.intentoId}`}
                                />
                            }
                        >
                            <PlayIcon className="size-4" />
                            Reanudar prueba
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* ── Stats Row + Weekly Activity ────────────────────────── */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardContent className="flex items-center gap-3 p-4">
                        <div className="rounded-lg bg-primary/10 p-2.5">
                            <TrophyIcon className="size-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-muted-foreground text-xs">
                                Correctas
                            </p>
                            <p className="font-bold text-xl tabular-nums">
                                {totalCorrectas.toLocaleString()}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="flex items-center gap-3 p-4">
                        <div className="rounded-lg bg-emerald-500/10 p-2.5">
                            <TargetIcon className="size-5 text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-muted-foreground text-xs">
                                Tasa de acierto
                            </p>
                            <p className="font-bold text-xl tabular-nums">
                                {tasaAcierto}%
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="flex items-center gap-3 p-4">
                        <div className="rounded-lg bg-amber-500/10 p-2.5">
                            <ZapIcon className="size-5 text-amber-500" />
                        </div>
                        <div>
                            <p className="text-muted-foreground text-xs">
                                Racha actual
                            </p>
                            <p className="font-bold text-xl tabular-nums">
                                {rachaActual} {rachaActual === 1 ? "día" : "días"}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="flex items-center gap-3 p-4">
                        <div className="rounded-lg bg-blue-500/10 p-2.5">
                            <CalendarDaysIcon className="size-5 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-muted-foreground text-xs">
                                Banqueos completados
                            </p>
                            <p className="font-bold text-xl tabular-nums">
                                {totalBanqueosCompletados}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ── Weekly Timeline + Subscription ──────────────────────── */}
            <div className="grid gap-3 sm:grid-cols-2">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">
                            Actividad de la semana
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4">
                        <div className="flex items-center justify-between gap-1">
                            {weekDays.map((day, idx) => (
                                <div
                                    key={idx}
                                    className="flex flex-col items-center gap-1.5"
                                >
                                    <div
                                        className={`size-8 rounded-full border-2 transition-colors ${day.active
                                            ? "border-primary bg-primary/20"
                                            : "border-muted bg-muted/40"
                                            } ${day.isToday
                                                ? "ring-2 ring-primary/40 ring-offset-2 ring-offset-background"
                                                : ""
                                            } flex items-center justify-center`}
                                    >
                                        {day.active && (
                                            <div className="size-2.5 rounded-full bg-primary" />
                                        )}
                                    </div>
                                    <span
                                        className={`text-xs ${day.isToday
                                            ? "font-semibold text-primary"
                                            : "text-muted-foreground"
                                            }`}
                                    >
                                        {day.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">
                            Tu suscripción
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4">
                        <div className="flex items-center gap-3">
                            <div
                                className={`rounded-lg p-2.5 ${hasPro
                                    ? "bg-gradient-to-br from-yellow-400/20 to-amber-500/20"
                                    : "bg-muted"
                                    }`}
                            >
                                <PlanIcon
                                    className={`size-5 ${hasPro
                                        ? "text-yellow-600 dark:text-yellow-400"
                                        : "text-muted-foreground"
                                        }`}
                                />
                            </div>
                            <div>
                                <p className="font-semibold">
                                    Plan{" "}
                                    <span
                                        className={
                                            hasPro
                                                ? "text-yellow-600 dark:text-yellow-400"
                                                : "text-muted-foreground"
                                        }
                                    >
                                        {planLabel}
                                    </span>
                                </p>
                                <p className="text-muted-foreground text-xs">
                                    {hasPro
                                        ? "Acceso completo a todos los banqueos."
                                        : "Acceso limitado. Mejora a PRO para más contenido."}
                                </p>
                            </div>
                        </div>
                        {!hasPro && (
                            <Button
                                className="mt-3 w-full"
                                size="sm"
                                variant="outline"
                                render={<Link href="/market" />}
                            >
                                <SparklesIcon className="size-3.5" />
                                Mejorar a PRO
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ── Radar Chart (Area Progress) ─────────────────────────── */}
            <AreaRadarChart data={radarData} />

            {/* ── Line Chart (Activity Trend) ─────────────────────────── */}
            <ActivityLineChart data={lineData} />
        </main>
    );
}

// helper
function getYesterday(isoDate: string) {
    const d = new Date(isoDate);
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
}
