import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { PreguntaDificultad, ResultadoRespuesta } from "@/generated/prisma/client";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveUsuarioEstudianteIdFromSession } from "@/lib/subscription-access";
import RepasoTakeClient from "./client";

type Params = {
  id: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id } = await params;
  const banqueo = await prisma.banqueo.findUnique({
    where: { id },
    select: { titulo: true },
  });

  return {
    title: banqueo ? `Repaso: ${banqueo.titulo}` : "Detalle de repaso",
    description: "Preguntas incorrectas para repasar.",
  };
}

export default async function RepasoDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const session = await getServerAuthSession();
  if (!session?.user?.id && !session?.user?.email) {
    redirect("/");
  }

  const usuarioEstudianteId = await resolveUsuarioEstudianteIdFromSession({
    userId: session?.user?.id,
    email: session?.user?.email ?? null,
  });
  if (!usuarioEstudianteId) {
    redirect("/");
  }

  const { id } = await params;
  const banqueo = await prisma.banqueo.findFirst({
    where: { id },
    select: {
      id: true,
      titulo: true,
    },
  });

  if (!banqueo) {
    notFound();
  }

  const fallosHistoricos = await prisma.respuestasIntentos.groupBy({
    by: ["preguntaId"],
    where: {
      resultado: ResultadoRespuesta.MAL,
      intentos: {
        usuarioEstudianteId,
        banqueoId: banqueo.id,
      },
    },
    _count: {
      preguntaId: true,
    },
  });

  const repasoRevisado = await prisma.repasoRegistros.findMany({
    where: {
      usuarioEstudianteId,
      banqueoId: banqueo.id,
    },
    select: {
      preguntaId: true,
      esCorrecta: true,
    },
  });
  const preguntasRevisadas = new Set(repasoRevisado.map((item) => item.preguntaId));
  const fallosPendientes = fallosHistoricos.filter((item) => !preguntasRevisadas.has(item.preguntaId));

  if (fallosPendientes.length === 0) {
    return (
      <main className="mx-auto w-full max-w-4xl space-y-4 p-6">
        <h1 className="font-semibold text-2xl tracking-tight">{banqueo.titulo}</h1>
        <p className="text-muted-foreground text-sm">No hay preguntas pendientes para repasar.</p>
      </main>
    );
  }

  const preguntaIds = fallosPendientes.map((item) => item.preguntaId);
  const preguntasRaw = await prisma.preguntas.findMany({
    where: {
      id: { in: preguntaIds },
      banqueo: {
        some: {
          id: banqueo.id,
        },
      },
    },
    select: {
      id: true,
      codigo: true,
      enunciado: true,
      explicacion: true,
      dificultad: true,
      tasaAcierto: true,
      opciones: true,
      solucion: true,
      temas: {
        select: {
          titulo: true,
          descripcion: true,
        },
        orderBy: {
          titulo: "asc",
        },
      },
    },
  });

  const falloCountByPregunta = new Map<string, number>();
  for (const item of fallosPendientes) {
    falloCountByPregunta.set(item.preguntaId, item._count.preguntaId);
  }

  const preguntas = preguntasRaw.map((item) => ({
    id: item.id,
    bancoId: item.id,
    codigo: item.codigo,
    explicacion: item.explicacion,
    temaNombre: item.temas[0]?.titulo ?? null,
    temaDescripcion: item.temas[0]?.descripcion ?? null,
    enunciado: item.enunciado,
    tipo:
      Array.isArray(item.opciones) && item.opciones.length > 0
        ? ("CERRADA" as const)
        : ("ABIERTA" as const),
    opciones: item.opciones,
    assets: [],
    solucionKind: extractSolucionKind(item.solucion),
    solucion: {
      kind: extractSolucionKind(item.solucion) ?? "TEXT",
      value: extractSolucionValue(item.solucion),
    },
    failCount: falloCountByPregunta.get(item.id) ?? 1,
    dificultad: item.dificultad ?? PreguntaDificultad.MEDIO,
    tasaAciertoHistorica: item.tasaAcierto ?? 0,
  }));

  const correctasPrevias = repasoRevisado.filter((item) => item.esCorrecta).length;

  return (
    <main className="min-h-screen bg-background py-10 text-foreground">
      <RepasoTakeClient
        banqueo={banqueo}
        preguntas={preguntas}
        repasoStatsPrevios={{
          total: repasoRevisado.length,
          correctas: correctasPrevias,
        }}
      />
    </main>
  );
}

function extractSolucionKind(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.kind === "string" ? candidate.kind : null;
}

function extractSolucionValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.value ??
    candidate.correcta ??
    candidate.correct ??
    candidate.respuesta ??
    candidate.solucion ??
    value
  );
}
