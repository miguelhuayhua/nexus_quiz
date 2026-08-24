import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { PreguntaEstado, } from "@/prisma/generated";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { compareRespuesta, normalizeSolucion, parseRespuesta } from "@/lib/evaluacion-eval";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { ResultadoInsights } from "./resultado-insights";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { preguntas } from "@prisma/client";

type Props = {
    params: Promise<{ bancoId: string }>;
    searchParams: Promise<{ intentoId?: string }>;
};


export async function generateMetadata({ params }: Props): Promise<Metadata> {
    return {
        title: `Estadisticas - Banco`,
        description: "Resultados finales, estadisticas y ranking del banqueo.",
    };
}




type ComparativoResumen = {
    yo: {
        puntaje: number;
        porcentaje: number;
        tiempo: number;
        correctas: number;
        incorrectas: number;
        sinResponder: number;
    };
    otros: {
        disponibles: number;
        puntajePromedio: number;
        porcentajePromedio: number;
        tiempoPromedio: number;
        correctasPromedio: number;
        incorrectasPromedio: number;
    };
    delta: {
        puntaje: number;
        porcentaje: number;
        tiempo: number;
    };
    ranking: {
        posicion: number;
        total: number;
        percentil: number;
    };
};

const getBanco = async (bancoId: string) => {
    return await prisma.banqueo.findFirst({
        where: {
            id: bancoId,
        },
        include: {
            preguntas: {
                where: {
                    estado: PreguntaEstado.DISPONIBLE,
                },
            },
        },
    });
}

export type BancoType = NonNullable<Awaited<ReturnType<typeof getBanco>>>;


const getIntentos = async (bancoId: string) => {
    return await prisma.intentos.findMany({
        where: {
            banqueoId: bancoId,
        },
        include: {
            respuestasIntentos: true,
            usuariosEstudiantes: { select: { id: true, avatar: true, estudiantes: true } }
        },
        orderBy: { correctas: 'desc' }
    });
}
export type IntentosType = Awaited<ReturnType<typeof getIntentos>>;
const getIntento = async (intentoId: string) => {
    return await prisma.intentos.findFirst({
        where: {
            id: intentoId,
        },
        include: {
            respuestasIntentos: true
        },
    })
}
export type IntentoType = NonNullable<Awaited<ReturnType<typeof getIntento>>>;

export default async function EvaluacionResultadoPage({ params, searchParams }: Props) {
    const session = await getServerAuthSession();
    const { bancoId } = await params;
    const { intentoId } = await searchParams;

    if (!session || !intentoId || !bancoId) {
        return notFound();
    }

    const banco = await getBanco(bancoId);
    if (!banco) {
        return notFound();
    }
    const intento = await getIntento(intentoId)
    if (!intento) return notFound();

    const respuestas = misRespuestas(intento.respuestasIntentos);
    const resumen = miResumen(banco.preguntas, intento.respuestasIntentos, intento.tiempoDuracion);

    const todosIntentos = await getIntentos(bancoId);
    const preguntaStats = buildPreguntaStats(banco.preguntas, todosIntentos, respuestas);
    const ranking = buildRanking(todosIntentos);
    const comparativo = buildComparativo({
        resumen,
        intentoFinal: {
            id: intento.id,
            usuarioEstudianteId: intento.usuarioEstudianteId ?? null,
            correctas: intento.correctas,
            incorrectas: intento.incorrectas,
            tiempoDuracion: intento.tiempoDuracion,
        },
        todosIntentos,
    });
    const respuestasGlobales = buildRespuestasGlobales(todosIntentos, banco.preguntas.length);



    return (
        <main className="min-h-screen  py-10 space-y-4 container mx-auto">
            <Button render={<Link href={`/prueba/${bancoId}/resultado?intentoId=${intento.id}`} />} variant="outline" size="sm" >
                <ArrowLeft size={18} />
                Regresar
            </Button>
            <h1 className="text-center text-2xl">{banco.titulo}</h1>


            <ResultadoInsights
                preguntaStats={preguntaStats}
                comparativo={comparativo}
                respuestasGlobales={respuestasGlobales}
            />
            <h2 className="text-2xl text-center my-10">
                Ranking de estudiantes
            </h2>
            <Table className="w-full text-sm">
                <TableHeader>
                    <TableRow className="border-b bg-muted/30 text-left">
                        <TableHead>#</TableHead>
                        <TableHead >Estudiante</TableHead>
                        <TableHead >Max. Aciertos</TableHead>
                        <TableHead >Acierto %</TableHead>
                        <TableHead >Tiempo prom.</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {ranking.map((item) => (
                        <TableRow className="border-b last:border-0" key={item.estudianteId}>
                            <TableCell >{item.rank}</TableCell>
                            <TableCell >
                                <div className="flex items-center gap-2">
                                    <Avatar>
                                        <AvatarImage alt={item.nombre} src={item.avatar ?? ""} />
                                        <AvatarFallback>{getInitial(item.nombre)}</AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium">{item.nombre}</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-emerald-600">{item.mejorPuntaje}</TableCell>
                            <TableCell>{item.porcentaje}%</TableCell>
                            <TableCell>{formatDuration(item.tiempoPromedio)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </main>
    );
}




function misRespuestas(respuestasIntentos: IntentoType["respuestasIntentos"]) {
    const map: Record<string, string> = {};
    for (const item of respuestasIntentos) {
        if (typeof item.respuesta === "string") {
            map[item.preguntaId] = item.respuesta;
            continue;
        }

        if (typeof item.respuesta === "number" || typeof item.respuesta === "boolean") {
            map[item.preguntaId] = String(item.respuesta);
            continue;
        }

        if (Array.isArray(item.respuesta) || (item.respuesta && typeof item.respuesta === "object")) {
            map[item.preguntaId] = JSON.stringify(item.respuesta);
        }
    }

    return map;
}

function miResumen(
    preguntas: preguntas[],
    respuestasIntentos: IntentoType["respuestasIntentos"],
    tiempoConsumido: number,
) {
    const total = preguntas.length;

    const correctas = respuestasIntentos.filter((item) => item.esCorrecta === true)
        .length;
    const incorrectas = respuestasIntentos.filter((item) => item.esCorrecta === false)
        .length;
    const sinResponder = total - correctas - incorrectas;

    const porcentaje = total > 0 ? Math.round((correctas / total) * 100) : 0;

    return {
        total,
        correctas,
        incorrectas,
        sinResponder,
        porcentaje,
        tiempoEmpleado: tiempoConsumido,
    };
}

type Resumen = ReturnType<typeof miResumen>;



function buildPreguntaStats(
    preguntas: BancoType["preguntas"],
    todosIntentos: IntentosType,
    respuestas: Record<string, string>,
) {
    const stats = new Map<string, { bien: number; mal: number }>();
    for (const pregunta of preguntas) {
        stats.set(pregunta.id, { bien: 0, mal: 0 });
    }

    for (const intento of todosIntentos) {
        for (const respuesta of intento.respuestasIntentos) {
            const entry = stats.get(respuesta.preguntaId);
            if (!entry) continue;
            if (respuesta.esCorrecta === true) {
                entry.bien += 1;
            } else if (respuesta.esCorrecta === false) {
                entry.mal += 1;
            }
        }
    }

    return preguntas.map((pregunta) => {
        const entry = stats.get(pregunta.id) ?? { bien: 0, mal: 0 };
        const totalRespondida = entry.bien + entry.mal;
        const porcentajeAcierto =
            totalRespondida > 0 ? Math.round((entry.bien / totalRespondida) * 100) : 0;
        const porcentajeError = totalRespondida > 0 ? 100 - porcentajeAcierto : 0;

        const miRespuesta = respuestas[pregunta.id]?.trim() ?? "";
        let miEstado: "BIEN" | "MAL" | "SIN_RESPONDER" = "SIN_RESPONDER";

        if (miRespuesta) {
            const kind = extractSolucionKind(pregunta.solucion);
            const user = parseRespuesta(miRespuesta, kind ?? undefined);
            const correct = normalizeSolucion(
                extractSolucionValue(pregunta.solucion),
                kind ?? undefined,
            );
            const esCorrecta =
                user !== null && correct !== null
                    ? compareRespuesta(user, correct)
                    : false;
            miEstado = esCorrecta ? "BIEN" : "MAL";
        }

        return {
            preguntaId: pregunta.id,
            codigo: pregunta.codigo,
            enunciado: pregunta.enunciado,
            bien: entry.bien,
            mal: entry.mal,
            totalIntentos: totalRespondida,
            porcentajeAcierto,
            porcentajeError,
            miEstado,
        };
    });
}

function buildRanking(todosIntentos: IntentosType) {
    const grouped = new Map<
        string,
        {
            estudianteId: string;
            nombre: string;
            avatar: string | null;
            intentos: number;
            correctas: number;
            incorrectas: number;
            tiempoSum: number;
        }
    >();

    for (const item of todosIntentos) {
        const user = item.usuariosEstudiantes;
        const nombre = user?.estudiantes?.nombre || "Usuario"
        const key = user?.id ?? item.id;
        const current = grouped.get(key) ?? {
            estudianteId: key,
            nombre,
            avatar: user?.avatar ?? null,
            intentos: 0,
            correctas: 0,
            incorrectas: 0,
            puntos: 0,
            tiempoSum: 0,
        };
        current.intentos += 1;
        if (current.correctas < item.correctas) {
            current.correctas = item.correctas;
            current.tiempoSum = Math.max(0, Math.floor(item.tiempoDuracion));
        }
        current.incorrectas += item.incorrectas;
        //mejor tiempo 
        if (current.tiempoSum > item.tiempoDuracion || current.tiempoSum === 0) {
            current.tiempoSum = Math.max(0, Math.floor(item.tiempoDuracion));
        }
        if (!current.avatar && user?.avatar) current.avatar = user.avatar;
        grouped.set(key, current);
    }

    const rows = Array.from(grouped.values()).map((item) => {
        const respondidas = item.correctas + item.incorrectas;
        const porcentaje = respondidas > 0 ? Math.round((item.correctas / respondidas) * 100) : 0;
        const tiempoPromedio = item.intentos > 0 ? Math.round(item.tiempoSum / item.intentos) : 0;

        return {
            estudianteId: item.estudianteId,
            nombre: item.nombre,
            avatar: item.avatar,
            intentos: item.intentos,
            mejorPuntaje: item.correctas,
            porcentaje,
            tiempoPromedio,
        };
    });

    rows.sort((a, b) => {
        if (b.mejorPuntaje !== a.mejorPuntaje) return b.mejorPuntaje - a.mejorPuntaje;
        return a.tiempoPromedio - b.tiempoPromedio;
    });

    return rows.map((item, index) => ({
        ...item,
        rank: index + 1,
    }));
}

function getInitial(value: string) {
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, 1).toUpperCase() : "U";
}

function extractSolucionKind(value: unknown): string | null {
    if (!value || typeof value !== "object") return null;
    const candidate = value as Record<string, unknown>;
    return typeof candidate.kind === "string" ? candidate.kind : null;
}

function buildComparativo(params: {
    resumen: Resumen;
    intentoFinal: {
        id: string;
        usuarioEstudianteId: string | null;
        correctas: number;
        incorrectas: number;
        tiempoDuracion: number;
    };
    todosIntentos: IntentosType
}): ComparativoResumen {
    const { resumen, intentoFinal, todosIntentos } = params;

    const otros = todosIntentos.filter((item) => {
        if (item.id === intentoFinal.id) return false;
        if (intentoFinal.usuarioEstudianteId) {
            return item.usuarioEstudianteId !== intentoFinal.usuarioEstudianteId;
        }
        return true;
    });

    const safeAvg = (values: number[]) => {
        if (values.length === 0) return 0;
        return values.reduce((acc, value) => acc + value, 0) / values.length;
    };

    const otrosPuntaje = safeAvg(otros.map((item) => item.correctas));
    const otrosCorrectas = safeAvg(otros.map((item) => item.correctas));
    const otrosIncorrectas = safeAvg(otros.map((item) => item.incorrectas));
    const otrosTiempo = safeAvg(otros.map((item) => Math.max(0, item.tiempoDuracion)));
    const otrosPorcentaje = safeAvg(
        otros.map((item) => {
            const respondidas = item.correctas + item.incorrectas;
            return respondidas > 0 ? (item.correctas / respondidas) * 100 : 0;
        }),
    );

    const ordered = [...todosIntentos].sort((a, b) => {
        if (b.correctas !== a.correctas) return b.correctas - a.correctas;
        const porA =
            a.correctas + a.incorrectas > 0 ? (a.correctas / (a.correctas + a.incorrectas)) * 100 : 0;
        const porB =
            b.correctas + b.incorrectas > 0 ? (b.correctas / (b.correctas + b.incorrectas)) * 100 : 0;
        if (porB !== porA) return porB - porA;
        return a.tiempoDuracion - b.tiempoDuracion;
    });

    const posicion = Math.max(1, ordered.findIndex((item) => item.id === intentoFinal.id) + 1);
    const total = Math.max(1, ordered.length);
    const percentil = Math.round(((total - posicion) / total) * 100);

    return {
        yo: {
            puntaje: resumen.correctas,
            porcentaje: resumen.porcentaje,
            tiempo: resumen.tiempoEmpleado,
            correctas: resumen.correctas,
            incorrectas: resumen.incorrectas,
            sinResponder: resumen.sinResponder,
        },
        otros: {
            disponibles: otros.length,
            puntajePromedio: otrosPuntaje,
            porcentajePromedio: otrosPorcentaje,
            tiempoPromedio: otrosTiempo,
            correctasPromedio: otrosCorrectas,
            incorrectasPromedio: otrosIncorrectas,
        },
        delta: {
            puntaje: resumen.correctas - otrosPuntaje,
            porcentaje: resumen.porcentaje - otrosPorcentaje,
            tiempo: resumen.tiempoEmpleado - otrosTiempo,
        },
        ranking: {
            posicion,
            total,
            percentil,
        },
    };
}

function extractSolucionValue(value: unknown): unknown {
    if (value === null || value === undefined) return null;
    if (typeof value !== "object") return value;
    if (Array.isArray(value)) return value;
    const candidate = value as Record<string, unknown>;
    return (
        candidate.value ??
        candidate.correcta ??
        candidate.correct ??
        candidate.respuesta ??
        candidate.solucion ??
        value
    );
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

function buildRespuestasGlobales(intentos: IntentosType, preguntasLength: number) {

    const totalEsperado = intentos.length * preguntasLength;

    const bien = intentos.reduce((acc, item) => acc + Math.max(0, item.correctas), 0);
    const mal = intentos.reduce((acc, item) => acc + Math.max(0, item.incorrectas), 0);
    const sinResponder = Math.max(0, totalEsperado - bien - mal);
    console.log(bien, mal, sinResponder, totalEsperado, "total esperado")
    return { bien: Math.round((bien / totalEsperado) * 100), mal: Math.round((mal / totalEsperado) * 100), sinResponder: Math.round((sinResponder / totalEsperado) * 100) };
}
