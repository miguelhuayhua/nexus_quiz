import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "../../auth/checkauth";
const getBancos = async (search: string | null, take: number, skip: number, correo: string, areas: string[], temas: string[], capitulos: string[]) => {

    return await prisma.banqueo.findMany({
        take,
        skip,
        where: {

            ...(search && {
                titulo: {
                    contains: search, mode: "insensitive"
                }
            }),
            ...(areas.length > 0 && {
                preguntas: {
                    some: {
                        areas: {
                            some: {
                                id: {
                                    in: areas
                                }
                            }
                        }
                    }
                }
            }),
            ...(temas.length > 0 && {
                preguntas: {
                    some: {
                        temas: {
                            some: {
                                id: {
                                    in: temas
                                }
                            }
                        }
                    }
                }
            }),
            ...(capitulos.length > 0 && {
                preguntas: {
                    some: {
                        capitulos: {
                            some: {
                                id: {
                                    in: capitulos
                                }
                            }
                        }
                    }
                }
            }),

            tipo: { in: ["SIMULACRO"] },
            tipoCreado: "ADMIN"
        },
        orderBy: {
            creadoEn: 'desc'
        },
        include: {
            intentos: {
                where: {
                    usuariosEstudiantes: {
                        correo
                    }
                }
            },
            preguntas: { include: { areas: true, capitulos: true, temas: true } },
        }
    })
}
export default async function GET(req: NextRequest) {
    const correo = await checkAuth(req)
    if (!correo) return NextResponse.json({ message: "No autorizado", estado: 401 }, { status: 401 })
    const search = req.nextUrl.searchParams.get("search") || "";
    const take = Number(req.nextUrl.searchParams.get("take")) || 10;
    const skip = Number(req.nextUrl.searchParams.get("skip")) || 0;
    const areas = req.nextUrl.searchParams.get("areas") || null;
    const temas = req.nextUrl.searchParams.get("temas") || null;
    const capitulos = req.nextUrl.searchParams.get("capitulos") || null;
    const bancos = await getBancos(search, take, skip, correo, areas?.split(",") || [], temas?.split(",") || [], capitulos?.split(",") || [])
    return NextResponse.json(bancos)
}

export type BanqueosSimulacrosGET = Awaited<ReturnType<typeof getBancos>>