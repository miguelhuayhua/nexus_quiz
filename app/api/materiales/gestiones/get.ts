import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "../../auth/checkauth";
const getGestiones = async () => {

    const materiales = await prisma.materialBanqueo.findMany({

        orderBy: {
            gestion: 'desc'
        },

    })
    const gestiones = [...new Set(materiales.map(material => material.gestion))].sort((a, b) => b - a)
    return gestiones
}
export default async function GET(req: NextRequest) {
    const correo = await checkAuth(req)
    if (!correo) return NextResponse.json({ message: "No autorizado", estado: 401 }, { status: 401 })
    const gestiones = await getGestiones()
    return NextResponse.json(gestiones)
}

export type GestionesGET = Awaited<ReturnType<typeof getGestiones>>