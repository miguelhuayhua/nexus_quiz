import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "../auth/checkauth";

const getCapitulos = async (areas: string[]) => {
    return await prisma.capitulos.findMany({
        where: {
            areaId: {
                in: areas
            }
        }
    })
}



export default async function GET(req: NextRequest) {
    const email = await checkAuth(req)
    if (!email) {
        return NextResponse.json({ message: "No autorizado" }, { status: 401 })
    }
    const areas = req.nextUrl.searchParams.get("areas")?.split(",") || []
    const capitulos = await getCapitulos(areas)
    return NextResponse.json(capitulos)
}

export type CapitulosGET = Awaited<ReturnType<typeof getCapitulos>>