import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "../auth/checkauth";
const getBancos = async (search: string, take: number, skip: number) => {
    return await prisma.banqueo.findMany({
        take,
        skip,
        where: {
            OR: [
                {
                    titulo: {
                        mode: "insensitive",
                        contains: search,
                    },
                },

            ],
        },
        orderBy: {
            creadoEn: 'desc'
        },
    })
}
export default async function GET(req: NextRequest) {
    if (!await checkAuth(req)) return NextResponse.json({ message: "No autorizado", estado: 401 }, { status: 401 })
    const search = req.nextUrl.searchParams.get("search") || "";
    const take = Number(req.nextUrl.searchParams.get("take")) || 10;
    const skip = Number(req.nextUrl.searchParams.get("skip")) || 0;
    const bancos = await getBancos(search, take, skip)
    return NextResponse.json(bancos)
}

export type BanqueosGET = Awaited<ReturnType<typeof getBancos>>