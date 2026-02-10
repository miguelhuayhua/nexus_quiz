import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import SolucionarioClient, {
  type SolucionarioEvaluacion,
  type SolucionarioPregunta,
} from "./client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = {
  evaluacionId: string;
};

type Props = {
  params: Params | Promise<Params>;
};

export default async function SolucionarioPage({ params }: Props) {
  const session = await getServerAuthSession();
  if (!session?.user?.id && !session?.user?.email) {
    return notFound();
  }

  const resolvedParams = await Promise.resolve(params);
  if (!resolvedParams?.evaluacionId) {
    return notFound();
  }

  const estudianteId = await resolveEstudianteIdFromSession({
    userId: session?.user?.id,
    email: session?.user?.email ?? null,
  });

  if (!estudianteId) {
    return notFound();
  }

  const evaluacion = await loadEvaluacionConAcceso(
    resolvedParams.evaluacionId,
    estudianteId,
  );

  if (!evaluacion) {
    return notFound();
  }

  const intentoFinal = await prisma.evaluacionIntentos.findFirst({
    where: {
      evaluacionId: evaluacion.id,
      estudianteId,
      estado: { in: ["ENVIADO", "EXPIRADO"] },
    },
    orderBy: [{ enviadoEn: "desc" }, { iniciadoEn: "desc" }],
  });

  if (!intentoFinal) {
    return notFound();
  }

  const respuestas =
    intentoFinal.progreso &&
    typeof intentoFinal.progreso === "object" &&
    "respuestas" in intentoFinal.progreso
      ? (intentoFinal.progreso.respuestas as Record<string, string>)
      : {};

  const evaluacionPayload: SolucionarioEvaluacion = {
    id: evaluacion.id,
    titulo: evaluacion.titulo,
    descripcion: evaluacion.descripcion,
    tipo: evaluacion.tipo,
    gestion: evaluacion.gestion,
  };

  const preguntas: SolucionarioPregunta[] = getPreguntasFromTemas(evaluacion.temas);

  return (
    <main className="min-h-screen bg-background py-10 text-foreground">
      <SolucionarioClient
        evaluacion={evaluacionPayload}
        preguntas={preguntas}
        respuestas={respuestas}
      />
    </main>
  );
}

async function loadEvaluacionConAcceso(evaluacionId: string, estudianteId: string) {
  return prisma.evaluaciones.findFirst({
    where: {
      id: evaluacionId,
      estado: "DISPONIBLE",
      compraEvaluacions: {
        some: {
          estudianteId,
          estado: "COMPLETADO",
        },
      },
    },
    select: {
      id: true,
      titulo: true,
      descripcion: true,
      tipo: true,
      gestion: true,
      temas: {
        orderBy: {
          nombre: "asc",
        },
        include: {
          temaPreguntas: {
            where: {
              preguntas: {
                estado: "DISPONIBLE",
              },
            },
            orderBy: {
              orden: "asc",
            },
            include: {
              preguntas: {
                select: {
                  id: true,
                  codigo: true,
                  enunciado: true,
                  explicacion: true,
                  tipo: true,
                  opciones: true,
                  assets: true,
                  solucion: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

function getPreguntasFromTemas(
  temas: {
    temaPreguntas: {
      preguntaId: string;
      preguntas: {
        id: string;
        codigo: string;
        enunciado: string;
        explicacion: string | null;
        tipo: "ABIERTA" | "CERRADA";
        opciones: unknown;
        assets: unknown;
        solucion: unknown;
      };
    }[];
  }[],
): SolucionarioPregunta[] {
  const seen = new Set<string>();
  const preguntas: SolucionarioPregunta[] = [];

  for (const tema of temas) {
    for (const item of tema.temaPreguntas) {
      if (seen.has(item.preguntaId)) continue;
      seen.add(item.preguntaId);

      const pregunta = item.preguntas;
      preguntas.push({
        id: pregunta.id,
        codigo: pregunta.codigo,
        temaNombre: tema.nombre,
        temaDescripcion: tema.descripcion,
        enunciado: pregunta.enunciado,
        explicacion: pregunta.explicacion,
        tipo: pregunta.tipo,
        opciones: pregunta.opciones,
        assets: pregunta.assets,
        solucionKind: extractSolucionKind(pregunta.solucion),
        solucionValue: extractSolucionValue(pregunta.solucion),
      });
    }
  }

  return preguntas;
}

function extractSolucionKind(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.kind === "string" ? candidate.kind : null;
}

function extractSolucionValue(value: unknown): unknown {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  return candidate.value ?? null;
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
