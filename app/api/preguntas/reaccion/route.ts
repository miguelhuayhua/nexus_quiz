import { NextResponse } from "next/server";

import { TipoReaccion } from "@/prisma/generated";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveUsuarioEstudianteIdFromSession } from "@/lib/subscription-access";

type ReaccionBody = {
    preguntaId?: unknown;
    tipo?: unknown; // "LIKE" | "DISLIKE"
};

export async function POST(request: Request) {
    try {
        const session = await getServerAuthSession();
        if (!session?.user?.id && !session?.user?.email) {
            return NextResponse.json({ message: "No autenticado." }, { status: 401 });
        }

        const body = (await request.json().catch(() => null)) as ReaccionBody | null;
        const preguntaId = typeof body?.preguntaId === "string" ? body.preguntaId.trim() : "";
        const tipoRaw = typeof body?.tipo === "string" ? body.tipo.trim() : "";

        if (!preguntaId) {
            return NextResponse.json({ message: "preguntaId es obligatorio." }, { status: 400 });
        }

        if (tipoRaw !== "LIKE" && tipoRaw !== "DISLIKE") {
            return NextResponse.json({ message: "tipo debe ser LIKE o DISLIKE." }, { status: 400 });
        }

        const tipo = tipoRaw as TipoReaccion;

        const usuarioEstudianteId = await resolveUsuarioEstudianteIdFromSession({
            userId: session.user.id,
            email: session.user.email ?? null,
        });
        if (!usuarioEstudianteId) {
            return NextResponse.json({ message: "Estudiante no encontrado." }, { status: 404 });
        }

        // Check if user already has a reaction for this question
        const existing = await prisma.reaccionesPreguntas.findUnique({
            where: {
                preguntaId_usuarioEstudianteId: {
                    preguntaId,
                    usuarioEstudianteId,
                },
            },
        });

        if (existing) {
            if (existing.tipo === tipo) {
                // Same reaction => remove it (toggle off)
                await prisma.$transaction([
                    prisma.reaccionesPreguntas.delete({
                        where: { id: existing.id },
                    }),
                    prisma.preguntas.update({
                        where: { id: preguntaId },
                        data: {
                            [tipo === TipoReaccion.LIKE ? "likes" : "dislikes"]: { decrement: 1 },
                        },
                    }),
                ]);

                return NextResponse.json({ ok: true, reaccion: null });
            } else {
                // Different reaction => switch
                const oldField = existing.tipo === TipoReaccion.LIKE ? "likes" : "dislikes";
                const newField = tipo === TipoReaccion.LIKE ? "likes" : "dislikes";

                await prisma.$transaction([
                    prisma.reaccionesPreguntas.update({
                        where: { id: existing.id },
                        data: { tipo },
                    }),
                    prisma.preguntas.update({
                        where: { id: preguntaId },
                        data: {
                            [oldField]: { decrement: 1 },
                            [newField]: { increment: 1 },
                        },
                    }),
                ]);

                return NextResponse.json({ ok: true, reaccion: tipo });
            }
        } else {
            // No existing reaction => create new
            await prisma.$transaction([
                prisma.reaccionesPreguntas.create({
                    data: {
                        preguntaId,
                        usuarioEstudianteId,
                        tipo,
                    },
                }),
                prisma.preguntas.update({
                    where: { id: preguntaId },
                    data: {
                        [tipo === TipoReaccion.LIKE ? "likes" : "dislikes"]: { increment: 1 },
                    },
                }),
            ]);

            return NextResponse.json({ ok: true, reaccion: tipo });
        }
    } catch {
        return NextResponse.json(
            { message: "No se pudo procesar la reaccion." },
            { status: 500 },
        );
    }
}
