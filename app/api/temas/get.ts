import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "../auth/checkauth";

const getTemas = async (capitulos: string[]) => {
    return await prisma.temas.findMany({
        where: {
            capituloId: {
                in: capitulos
            }
        }
    })
}



export default async function GET(req: NextRequest) {
    const email = await checkAuth(req)
    if (!email) {
        return NextResponse.json({ message: "No autorizado" }, { status: 401 })
    }
    const capitulos = req.nextUrl.searchParams.get("capitulos")?.split(",") || []
    const temas = await getTemas(capitulos)
    return NextResponse.json(temas)
}

export type TemasGET = Awaited<ReturnType<typeof getTemas>>