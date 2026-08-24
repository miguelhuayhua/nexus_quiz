import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { EstadoIntento } from "@/prisma/generated";
import {
    PlayIcon,
    ClockIcon
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
    hasActiveProSubscription,
    resolveUsuarioEstudianteIdFromSession,
} from "@/lib/subscription-access";
import { GridChart } from "./grid";
import AIOrbFace from "@/components/smoothui/ai-orb-face";
import CountingNumber from "@/components/ui/counting-number";
import { Confetti } from "@/components/ui/confetti";
import { sendWhatsapp } from "@/helpers/whatsapp";
import { formatTimeRemaining } from "@/helpers/date";

export const metadata: Metadata = {
    title: "Inicio",
    description: "Página de inicio con resumen de actividad.",
};

function getDia(dayIndex: number) {
    return ["Dom", "Lun", "Mar", "Mier", "Jue", "Vie", "Sáb"][dayIndex] ?? "";
}
const getActividadFlashCards = async (usuarioEstudianteId: string) => {
    const semana = new Date();
    semana.setDate(semana.getDate() - 7);
    semana.setHours(0, 0, 0, 0);
    const actividad = await prisma.registroFlashCards.findMany({
        where: {
            usuarioEstudianteId,
            creadoEn: {
                gte: semana,
            },
        },
    })
    const tarjetasPorDia = actividad.reduce((acc, recordatorio) => {
        const diaIndex = recordatorio.creadoEn.getDay();
        const dia = getDia(diaIndex);
        if (!acc[dia]) {
            acc[dia] = 0;
        }
        acc[dia]++;
        return acc;
    }, ["Dom", "Lun", "Mar", "Mier", "Jue", "Vie", "Sáb"].reduce((acc, dia) => {
        acc[dia] = 0;
        return acc;
    }, {} as Record<string, number>));
    return Object.entries(tarjetasPorDia).map(([dia, actividad]) => ({
        dia,
        actividad,
    }));
}

const getIntentos = async (usuarioEstudianteId: string) => {
    const semana = new Date();
    semana.setDate(semana.getDate() - 7);
    semana.setHours(0, 0, 0, 0);
    return await prisma.intentos.findMany({
        where: {
            usuarioEstudianteId,
            creadoEn: {
                gte: semana,
            },
        },
    })
}
export type FlashCardsType = Awaited<ReturnType<typeof getActividadFlashCards>>;




export default async function InicioPage() {
    const session = await getServerAuthSession();

    const usuarioEstudianteId = await resolveUsuarioEstudianteIdFromSession({
        userId: session?.user?.id,
        email: session?.user?.email ?? null,
    });
    if (!usuarioEstudianteId) return notFound();

    const hasPro = await hasActiveProSubscription(usuarioEstudianteId);


    const recentIntento = await prisma.intentos.findFirst({
        where: {
            usuarioEstudianteId,
            estado: EstadoIntento.EN_PROGRESO,
        },
        include: {
            banqueo: true
        },
        orderBy: {
            creadoEn: "desc",
        },
    });


    const flashcardsData = await getActividadFlashCards(usuarioEstudianteId)
    // ─── Stats & Chart Data ──────────────────────────────────────────────

    let lineData: { date: string; correctas: number; incorrectas: number }[] = [];
    const weekActivity: boolean[] = [false, false, false, false, false, false, false];
    let rachaActual = 0;

    const intentosFinalizados = await prisma.intentos.findMany({
        where: {
            usuarioEstudianteId,
            estado: "FINALIZADO",
        },
        orderBy: {
            creadoEn: "desc",
        },
    });
    if (intentosFinalizados.length > 0) {
        const uniqueDates = [
            ...new Set(
                intentosFinalizados.map((intento) =>
                    intento.creadoEn.toISOString().slice(0, 10),
                ),
            ),
        ].sort((a, b) => b.localeCompare(a));

        const hoy = new Date().toISOString().slice(0, 10);

        // La racha solamente existe si estudió hoy
        if (uniqueDates[0] === hoy) {
            rachaActual = 1;

            for (let i = 1; i < uniqueDates.length; i++) {
                const prev = new Date(uniqueDates[i - 1]);
                const curr = new Date(uniqueDates[i]);

                const diff =
                    (prev.getTime() - curr.getTime()) /
                    (1000 * 60 * 60 * 24);

                if (Math.round(diff) === 1) {
                    rachaActual++;
                } else {
                    break;
                }
            }
        }
    }
    const intentosSemanales = await getIntentos(usuarioEstudianteId);

    const activityDates = new Set(
        intentosSemanales.map((intento) =>
            intento.creadoEn.toISOString().slice(0, 10)
        )
    );
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

    const radarData = areas
        .map((a) => ({
            area: a.titulo.length > 14 ? a.titulo.slice(0, 12) + "…" : a.titulo,
            puntos: a.preguntas.reduce(
                (sum, p) => sum + p.respuestasIntentos.length,
                0,
            ),
        }))
        .filter((a) => a.puntos > 0 || areas.length <= 8);


    // ─── Line chart: last 30 days activity ────────────────────────────
    const thirtyDaysAgo = new Date();
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

    // Reorder weekActivity to start with Monday (today highlighted)
    const today = new Date();
    const weekDays: { label: string; active: boolean; isToday: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);

        const dateKey = date.toISOString().slice(0, 10);

        weekDays.push({
            label: getDia(date.getDay()),
            active: activityDates.has(dateKey),
            isToday: i === 0,
        });
    }
    return (
        <main className="mx-auto max-w-5xl space-y-4 ">
            {/* ── Welcome Header ──────────────────────────────────────── */}
            <header className="space-y-1">
                <h1 className=" text-2xl ">
                    Bienvenido, {session?.user?.name?.trim() || "Estudiante"}
                </h1>
                <p className="text-muted-foreground text-sm italic">
                    {`"El éxito es la suma de pequeños esfuerzos repetidos día tras día."`}
                </p>
            </header>

            {/* ── Resume Last Test ────────────────────────────────────── */}
            {recentIntento ? (
                <Card className="bg-primary/10" >
                    <CardContent className="flex flex-wrap items-center justify-between ">
                        <div className="space-y-1">
                            <Badge variant={'secondary'}>
                                Prueba en progreso
                            </Badge>
                            <h2 className=" text-xl">
                                {recentIntento.banqueo.titulo}
                            </h2>
                            <div className="flex items-center gap-2 text-muted-foreground ">
                                <ClockIcon className="size-4" />
                                <span>
                                    {formatTimeRemaining(
                                        (recentIntento.banqueo.duracion * 60) - recentIntento.tiempoDuracion,
                                    )}
                                </span>
                            </div>
                        </div>
                        <Button
                            render={
                                <Link
                                    href={`/prueba/${recentIntento.banqueo.id}?intentoId=${recentIntento.id}`}
                                />
                            }
                        >
                            <PlayIcon />
                            Reanudar prueba
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Card className="bg-secondary/10" >
                    <CardContent className="flex flex-wrap items-center justify-between ">
                        <div className="space-y-1">

                            <h2 className=" text-xl">
                                Aún no has comenzado a prepararte
                            </h2>
                            <p className="text-muted-foreground ">
                                Realiza tu primera prueba para empezar a mejorar tu rendimiento
                            </p>

                        </div>
                        <Button
                            variant={'secondary'}
                            render={
                                <Link
                                    href={`/banqueos/`}
                                />
                            }
                        >
                            Iniciar nueva prueba
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* ── Stats Row + Weekly Activity ────────────────────────── */}

            <div className="flex flex-col mx-auto justify-center items-center gap-2">
                <AIOrbFace size={102} state={rachaActual == 3 || rachaActual == 7 ? "done" : "streaming"} />
                <p className="text-muted-foreground text-xs">
                    Racha actual
                </p>
                {
                    (rachaActual == 3 || rachaActual == 3) && (
                        <Confetti
                            className="fixed  z-0  w-full"

                        />
                    )
                }
                <p className="text-4xl">
                    <CountingNumber number={rachaActual} /> Días
                </p>

            </div>

            <GridChart flashcard={flashcardsData} lineData={lineData} radarData={radarData} activityData={lineData} hasPro={hasPro} weekDays={weekDays} />
            {
                !hasPro && (
                    <Card className="bg-gradient-to-br from-green-600  to-green-900">

                        <CardContent >
                            <div className="flex items-center lg:gap-30 gap-4">

                                <div className="space-y-1" >
                                    <CardTitle >
                                        Sube a premium y desbloqueda todo el contenido
                                    </CardTitle>
                                    <CardDescription className="text-white/70">
                                        Modo pro, acceso a banqueos ilimitados, simulacros semanales a nivel nacional, ranking en vivo, activación en menos de 10 minutos por Whatsapp.
                                    </CardDescription>
                                </div>
                                <Button
                                    variant={'outline'}
                                    className="bg-white text-foreground"
                                    render={<Link href={sendWhatsapp("Hola, quiero subir a Pro en el Banqueo de Nexus Educa")} target="_blank" />}
                                >
                                    Hablar por Whatsapp
                                </Button>
                            </div>


                        </CardContent>
                    </Card>
                )
            }
        </main>
    );
}

// helper
function getYesterday(isoDate: string) {
    const d = new Date(isoDate);
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
}
