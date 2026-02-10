import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { notFound } from "next/navigation";
import RepasoTakeClient, { type RepasoTakeClientProps } from "./client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = {
  id: string;
};

export default async function RepasoTakePage({ params }: { params: Params | Promise<Params> }) {
  const session = await getServerAuthSession();
  if (!session?.user?.id && !session?.user?.email) {
    return notFound();
  }

  const resolvedParams = await Promise.resolve(params);
  const evaluationId = resolvedParams.id;

  const estudianteId = await resolveEstudianteIdFromSession({
    userId: session?.user?.id,
    email: session?.user?.email ?? null,
  });

  if (!estudianteId) {
    return notFound();
  }

  const entries = await prisma.bancoPreguntasFalladas.findMany({
    where: {
      estudianteId,
      evaluacionId: evaluationId,
      resuelta: false,
    },
    select: {
      id: true,
      evaluaciones: {
        select: {
          id: true,
          titulo: true,
        },
      },
      preguntas: {
        select: {
          id: true,
          codigo: true,
          enunciado: true,
          tipo: true,
          opciones: true,
          assets: true,
          solucion: true,
        },
      },
    },
    orderBy: {
      creadoEn: "asc",
    },
  });

  if (entries.length === 0) {
    return notFound();
  }

  const evaluacion = entries[0].evaluaciones;
  const preguntas: RepasoTakeClientProps["preguntas"] = entries.map((entry) => ({
    id: entry.preguntas.id,
    bancoId: entry.id,
    codigo: entry.preguntas.codigo,
    enunciado: entry.preguntas.enunciado,
    tipo: entry.preguntas.tipo,
    opciones: entry.preguntas.opciones,
    assets: normalizeAssets(entry.preguntas.assets),
    solucionKind: extractSolucionKind(entry.preguntas.solucion),
    solucion: extractSolucion(entry.preguntas.solucion),
  }));

  return <RepasoTakeClient evaluacion={evaluacion} preguntas={preguntas} />;
}

function extractSolucionKind(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.kind === "string" ? candidate.kind : null;
}

function extractSolucion(
  value: unknown,
): RepasoTakeClientProps["preguntas"][number]["solucion"] {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Record<string, unknown>;
  if (typeof candidate.kind !== "string") return null;

  return {
    kind: candidate.kind,
    value: candidate.value,
  };
}

function normalizeAssets(value: unknown): RepasoTakeClientProps["preguntas"][number]["assets"] {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is { kind: string; url: string; alt?: string; title?: string; orden?: number } => {
    if (!item || typeof item !== "object") return false;
    const candidate = item as Record<string, unknown>;

    return (
      typeof candidate.kind === "string" &&
      typeof candidate.url === "string" &&
      (candidate.alt === undefined || typeof candidate.alt === "string") &&
      (candidate.title === undefined || typeof candidate.title === "string") &&
      (candidate.orden === undefined || typeof candidate.orden === "number")
    );
  });
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
