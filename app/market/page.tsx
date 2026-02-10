import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { EvaluacionTipo, Prisma } from "@/generated/prisma/client";
import MarketClient from "./client";

const marketEvaluacionSelect = {
  id: true,
  titulo: true,
  tipo: true,
  gestion: true,
  descripcion: true,
  tiempo_segundos: true,
  nota_min: true,
  nota_max: true,
  precio: true,
} as const;

type MarketTipo = EvaluacionTipo;
const PAGE_SIZE = 8;

function parseTipo(value?: string): MarketTipo {
  if (value === EvaluacionTipo.OFICIAL) return EvaluacionTipo.OFICIAL;
  if (value === EvaluacionTipo.PRUEBA) return EvaluacionTipo.PRUEBA;
  return EvaluacionTipo.PRUEBA;
}

function parsePage(value?: string): number {
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed > 0) return parsed;
  return 1;
}

async function getMarketData(params: {
  num: number;
  page: number;
  q?: string;
  tipo: MarketTipo;
  estudianteId?: string | null;
}) {
  const q = params.q?.trim();
  const where: Prisma.evaluacionesWhereInput = {
    estado: "DISPONIBLE" as const,
    tipo: params.tipo,
    ...(q
      ? {
          OR: [
            { titulo: { contains: q, mode: "insensitive" as const } },
            { descripcion: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(params.tipo === EvaluacionTipo.OFICIAL && params.estudianteId
      ? {
          NOT: {
            compraEvaluacions: {
              some: {
                estudianteId: params.estudianteId,
                estado: "COMPLETADO" as const,
              },
            },
          },
        }
      : {}),
  };

  const total = await prisma.evaluaciones.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / params.num));
  const page = Math.min(params.page, totalPages);

  const rawEvaluaciones = await prisma.evaluaciones.findMany({
    select: marketEvaluacionSelect,
    where,
    orderBy: { actualizado_en: "desc" },
    skip: (page - 1) * params.num,
    take: params.num,
  });

  const evaluacionIds = rawEvaluaciones.map((item) => item.id);
  const temasCounts = await prisma.$transaction(
    evaluacionIds.map((evaluacionId) =>
      prisma.temas.count({
        where: {
          evaluaciones: {
            some: {
              id: evaluacionId,
            },
          },
        },
      }),
    ),
  );
  const preguntasCounts = await prisma.$transaction(
    evaluacionIds.map((evaluacionId) =>
      prisma.temaPreguntas.findMany({
        where: {
          temas: {
            evaluaciones: {
              some: {
                id: evaluacionId,
              },
            },
          },
        },
        select: {
          preguntaId: true,
        },
        distinct: ["preguntaId"],
      }),
    ),
  );

  const evaluaciones = rawEvaluaciones.map((item, index) => ({
    id: item.id,
    titulo: item.titulo,
    tipo: item.tipo,
    gestion: item.gestion,
    descripcion: item.descripcion,
    tiempo_segundos: item.tiempo_segundos,
    nota_min: item.nota_min,
    nota_max: item.nota_max,
    precio: item.precio,
    temasCount: temasCounts[index] ?? 0,
    preguntasCount: preguntasCounts[index]?.length ?? 0,
  }));

  return {
    evaluaciones,
    pagination: {
      num: params.num,
      page,
      q: params.q ?? "",
      tipo: params.tipo,
      total,
      totalPages,
    },
  };
}

export type MarketData = Awaited<ReturnType<typeof getMarketData>>;

export default async function MarketPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    tipo?: string;
  }>;
}) {
  const session = await getServerAuthSession();
  const estudianteId = await resolveEstudianteIdFromSession({
    userId: session?.user?.id,
    email: session?.user?.email ?? null,
  });

  const params = await searchParams;
  const data = await getMarketData({
    num: PAGE_SIZE,
    page: parsePage(params.page),
    q: params.q,
    tipo: parseTipo(params.tipo),
    estudianteId,
  });

  return (
    <MarketClient
      evaluaciones={data.evaluaciones}
      pagination={data.pagination}
    />
  );
}

async function resolveEstudianteIdFromSession(params: {
  userId?: string | null;
  email?: string | null;
}) {
  const userId = params.userId?.trim();
  const email = params.email?.trim();

  if (userId) {
    const usuarioEstudiante = await prisma.usuariosEstudiantes.findUnique({
      where: { id: userId },
      select: { estudianteId: true },
    });

    if (usuarioEstudiante?.estudianteId) {
      return usuarioEstudiante.estudianteId;
    }

    const estudiante = await prisma.estudiantes.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (estudiante?.id) {
      return estudiante.id;
    }
  }

  if (email) {
    const estudiante = await prisma.estudiantes.findFirst({
      where: {
        usuariosEstudiantes: {
          correo: email,
        },
      },
      select: { id: true },
    });

    if (estudiante?.id) {
      return estudiante.id;
    }
  }

  return null;
}
