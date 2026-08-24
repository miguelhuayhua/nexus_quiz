import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "../auth/checkauth";

export default async function POST(req: NextRequest) {
    const email = await checkAuth(req)
    if (!email) {
        return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 })
    }
    const { dificultad, preguntaId, id } = await req.json()


    await prisma.registroFlashCards.upsert({
        where: {
            id,

        },
        update: {
            dificultad,
        },
        create: {
            dificultad,
            preguntas: { connect: { id: preguntaId } },
            usuariosEstudiantes: { connect: { correo: email } },
            id: crypto.randomUUID()
        }
    })

    return NextResponse.json({ mensaje: "Selección registrada" })
}