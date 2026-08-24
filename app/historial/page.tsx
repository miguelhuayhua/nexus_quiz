import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import HistorialClient, { type HistorialIntentoRow } from "./client";

export const metadata: Metadata = {
  title: "Historial",
  description: "Historial de intentos y resultados del estudiante.",
};

const getMisIntentos = async (correo: string) => {
  return await prisma.intentos.findMany({
    where: {
      usuariosEstudiantes: {
        correo,
      }
    },
    include: {

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
  });
}
export type MisIntentos = Awaited<ReturnType<typeof getMisIntentos>>;
export default async function HistorialPage() {
  const session = await getServerAuthSession();
  if (!session) return notFound();

  const misIntentos = await getMisIntentos(session.user?.email ?? "")

  const cohortPuntajesPorcentaje = misIntentos
    .map((item) => {
      const total = item.banqueo.preguntas.length;
      return total > 0 ? Math.round((item.correctas / total) * 100) : 0;
    })
    .filter((item) => Number.isFinite(item));

  const intentos: HistorialIntentoRow[] = misIntentos.map((item, index) => {
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
    <main className="mx-auto container space-y-4">
      <header className="space-y-1">
        <h1 className=" text-3xl">Historial</h1>
        <p className="text-muted-foreground text-sm">
          Historial de intentos en banqueos y sus resultados.
        </p>
      </header>

      <HistorialClient cohortPuntajesPorcentaje={cohortPuntajesPorcentaje} intentos={intentos} />
    </main>
  );
}
