import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "../auth/checkauth";
const getPreguntas = async (take: number, areas: string[], temas: string[], capitulos: string[], correo: string) => {
    return await prisma.preguntas.findMany({
        take,
        where: {
            AND: [
                {
                    areas: {
                        some: {
                            id: {
                                in: areas
                            }
                        }
                    }
                },
                {
                    temas: {
                        some: {
                            id: {
                                in: temas
                            }
                        }
                    }
                },
                {
                    capitulos: {
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
                }


            ],
        },
        include: {
            registroFlashCards: {
                where: {
                    usuariosEstudiantes: { correo }
                }
            }
        },
        orderBy: {
            creadoEn: 'desc'
        },

    })
}
export default async function GET(req: NextRequest) {
    const correo = await checkAuth(req)
    if (!correo) return NextResponse.json({ message: "No autorizado", estado: 401 }, { status: 401 })
    const take = Number(req.nextUrl.searchParams.get("take")) || 300;
    const usuario = await prisma.usuariosEstudiantes.findUnique({
        where: {
            correo
        },
        include: {
            suscripciones: {
                orderBy: { creadoEn: 'desc' },
                take: 1
            }
        }
    })
    const suscripcion = usuario?.suscripciones[0];
    const areas = req.nextUrl.searchParams.get("areas") || "";
    const temas = req.nextUrl.searchParams.get("temas") || "";
    const capitulos = req.nextUrl.searchParams.get("capitulos") || "";
    const preguntas = await getPreguntas(new Date(suscripcion?.fechaFin || 0) > new Date() ? take : 15, areas.split(","), temas.split(","), capitulos.split(","), correo)
    return NextResponse.json(preguntas)
}

export type PreguntasGET = Awaited<ReturnType<typeof getPreguntas>>