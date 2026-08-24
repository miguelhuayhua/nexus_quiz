import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "../auth/checkauth";
const getMateriales = async (search: string | null, take: number, skip: number,
    gestiones?: number[]
) => {

    return await prisma.materialBanqueo.findMany({
        take,
        skip,
        where: {

            ...(search && {
                OR: [
                    {
                        titulo: {
                            contains: search, mode: "insensitive"
                        },
                    },
                    {
                        descripcion: {
                            contains: search, mode: "insensitive"
                        }
                    },
                ]
            }),
            ...(gestiones && gestiones.length > 0 && {
                gestion: {
                    in: gestiones
                }
            }),
        },
        orderBy: {
            creadoEn: 'desc'
        },

    })
}
export default async function GET(req: NextRequest) {
    const correo = await checkAuth(req)
    if (!correo) return NextResponse.json({ message: "No autorizado", estado: 401 }, { status: 401 })
    const search = req.nextUrl.searchParams.get("search") || "";
    const take = Number(req.nextUrl.searchParams.get("take")) || 10;
    const skip = Number(req.nextUrl.searchParams.get("skip")) || 0;
    const gestiones = req.nextUrl.searchParams.get("gestiones") || null;
    const materiales = await getMateriales(search, take, skip, gestiones ? gestiones.split(",").map(gestion => Number(gestion)) : undefined)
    return NextResponse.json(materiales)
}

export type MaterialesGET = Awaited<ReturnType<typeof getMateriales>>