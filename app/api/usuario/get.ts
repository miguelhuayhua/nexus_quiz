import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "../auth/checkauth";
import { hasActiveProSubscription } from "@/lib/subscription-access";

const getUser = async (correo: string) => {

    const user = await prisma.usuariosEstudiantes.findUnique({
        where: {
            correo
        }
    })
    if (!user) {
        return null
    }
    const isPro = await hasActiveProSubscription(user.id)
    return { correo: user.correo, isPro }
}



export default async function GET(req: NextRequest) {
    const email = await checkAuth(req)
    if (!email) {
        return NextResponse.json({ message: "No autorizado" }, { status: 401 })
    }
    const user = await getUser(email)
    return NextResponse.json(user)
}

export type UsuarioGET = Awaited<ReturnType<typeof getUser>>