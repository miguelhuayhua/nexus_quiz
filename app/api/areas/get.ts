import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "../auth/checkauth";

const getAreas = async () => {
    return await prisma.areas.findMany()
}



export default async function GET(req: NextRequest) {
    const email = await checkAuth(req)
    if (!email) {
        return NextResponse.json({ message: "No autorizado" }, { status: 401 })
    }
    const areas = await getAreas()
    return NextResponse.json(areas)
}

export type AreasGET = Awaited<ReturnType<typeof getAreas>>