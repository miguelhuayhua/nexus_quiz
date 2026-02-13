import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveUsuarioEstudianteIdFromSession } from "@/lib/subscription-access";
import HistorialClient, { type HistorialIntentoRow } from "./client";

export const metadata: Metadata = {
  title: "Historial",
  description: "Historial de intentos y resultados del estudiante.",
};

export default async function HistorialPage() {
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

  const intentosRaw = await prisma.intentos.findMany({
    where: {
      usuarioEstudianteId,
    },
    select: {
      id: true,
      banqueoId: true,
      correctas: true,
      incorrectas: true,
      tiempoDuracion: true,
      estado: true,
      creadoEn: true,
      actualizadoEn: true,
      banqueo: {
        select: {
          titulo: true,
          tipo: true,
          tipoCreado: true,
          preguntas: {
            select: {
              id: true,
            },
          },
        },
      },
      respuestasIntentos: {
        select: {
          id: true,
          respondida: true,
          resultado: true,
        },
      },
    },
    orderBy: {
      actualizadoEn: "desc",
    },
    take: 300,
  });

  const cohortPuntajesPorcentaje = intentosRaw
    .map((item) => {
      const total = item.banqueo.preguntas.length;
      return total > 0 ? Math.round((item.correctas / total) * 100) : 0;
    })
    .filter((item) => Number.isFinite(item));

  const intentos: HistorialIntentoRow[] = intentosRaw.map((item, index) => {
    const totalPreguntas = item.banqueo.preguntas.length;
    const respondidas = item.respuestasIntentos.filter((resp) => resp.respondida).length;
    const precision = respondidas > 0 ? Math.round((item.correctas / respondidas) * 100) : 0;
    const puntajePorcentaje =
      totalPreguntas > 0 ? Math.round((item.correctas / totalPreguntas) * 100) : 0;

    return {
      id: item.id,
      numero: index + 1,
      estado: item.estado as HistorialIntentoRow["estado"],
      iniciadoEn: item.creadoEn.toISOString(),
      enviadoEn: item.actualizadoEn.toISOString(),
      bancoId: item.banqueoId,
      bancoTitulo: item.banqueo.titulo,
      bancoTipo: item.banqueo.tipo,
      bancoTipoCreado: item.banqueo.tipoCreado,
      respondidas,
      totalPreguntas,
      correctas: item.correctas,
      incorrectas: item.incorrectas,
      precision,
      puntajePorcentaje,
      tiempoDuracion: item.tiempoDuracion,
    };
  });

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 p-6">
      <header className="space-y-1">
        <h1 className="font-semibold text-2xl tracking-tight">Historial</h1>
        <p className="text-muted-foreground text-sm">
          Historial de intentos en banqueos y sus resultados.
        </p>
      </header>

      <HistorialClient cohortPuntajesPorcentaje={cohortPuntajesPorcentaje} intentos={intentos} />
    </main>
  );
}
