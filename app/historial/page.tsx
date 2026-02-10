import { redirect } from "next/navigation";

import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import HistorialClient, {
  type HistorialIntentoRow,
} from "./client";

export default async function HistorialPage() {
  const session = await getServerAuthSession();

  if (!session?.user?.id && !session?.user?.email) {
    redirect("/");
  }

  const estudianteId =
    (await resolveEstudianteIdFromSession({
      userId: session?.user?.id,
      email: session?.user?.email ?? null,
    })) ?? null;

  if (!estudianteId) {
    redirect("/");
  }

  const intentos = await prisma.evaluacionIntentos.findMany({
    where: {
      estudianteId,
    },
    select: {
      id: true,
      estado: true,
      iniciadoEn: true,
      enviadoEn: true,
      vence_en: true,
      evaluacionId: true,
      evaluaciones: {
        select: {
          id: true,
          titulo: true,
          tipo: true,
          gestion: true,
        },
      },
      respuestasEstudiantes: {
        select: {
          esCorrecta: true,
          puntajeObtenido: true,
        },
      },
    },
    orderBy: {
      iniciadoEn: "desc",
    },
  });

  const evaluacionIds = Array.from(new Set(intentos.map((item) => item.evaluacionId)));

  const evaluacionesPuntaje = await prisma.evaluaciones.findMany({
    where: {
      id: { in: evaluacionIds },
    },
    select: {
      id: true,
      temas: {
        select: {
          temaPreguntas: {
            select: {
              preguntaId: true,
              puntaje: true,
            },
          },
        },
      },
    },
  });

  const totalPuntosPorEvaluacion = new Map<string, number>();
  const totalPreguntasPorEvaluacion = new Map<string, number>();
  for (const evaluacion of evaluacionesPuntaje) {
    const seen = new Set<string>();
    let total = 0;
    for (const tema of evaluacion.temas) {
      for (const item of tema.temaPreguntas) {
        if (seen.has(item.preguntaId)) continue;
        seen.add(item.preguntaId);
        total += item.puntaje ?? 0;
      }
    }
    totalPuntosPorEvaluacion.set(evaluacion.id, total);
    totalPreguntasPorEvaluacion.set(evaluacion.id, seen.size);
  }

  const intentosRows: HistorialIntentoRow[] = intentos.map((item, index) => {
    const correctas = item.respuestasEstudiantes.filter(
      (respuesta) => respuesta.esCorrecta === true,
    ).length;
    const incorrectas = item.respuestasEstudiantes.filter(
      (respuesta) => respuesta.esCorrecta === false,
    ).length;
    const respondidas = item.respuestasEstudiantes.length;
    const precision = respondidas > 0 ? Math.round((correctas / respondidas) * 100) : 0;
    const puntaje = item.respuestasEstudiantes.reduce(
      (total, respuesta) => total + (respuesta.puntajeObtenido ?? 0),
      0,
    );
    const totalPuntosEvaluacion =
      totalPuntosPorEvaluacion.get(item.evaluacionId) ?? 0;
    const totalPreguntas =
      totalPreguntasPorEvaluacion.get(item.evaluacionId) ?? 0;
    const puntajePorcentaje =
      totalPuntosEvaluacion > 0
        ? Math.round((puntaje / totalPuntosEvaluacion) * 100)
        : 0;

    const row: HistorialIntentoRow = {
      id: item.id,
      numero: index + 1,
      estado: item.estado,
      iniciadoEn: item.iniciadoEn.toISOString(),
      enviadoEn: item.enviadoEn?.toISOString() ?? null,
      venceEn: item.vence_en.toISOString(),
      evaluacionId: item.evaluaciones.id,
      evaluacionTitulo: item.evaluaciones.titulo,
      evaluacionTipo: item.evaluaciones.tipo,
      gestion: item.evaluaciones.gestion,
      respondidas,
      totalPreguntas,
      correctas,
      incorrectas,
      precision,
      puntaje: Number(puntaje.toFixed(2)),
      puntajePorcentaje,
    };

    return row;
  });

  const cohortIntentos = evaluacionIds.length
    ? await prisma.evaluacionIntentos.findMany({
        where: {
          evaluacionId: { in: evaluacionIds },
          estudianteId: { not: estudianteId },
          estado: { in: ["ENVIADO", "EXPIRADO"] },
        },
        select: {
          evaluacionId: true,
          respuestasEstudiantes: {
            select: {
              puntajeObtenido: true,
            },
          },
        },
      })
    : [];

  const cohortPuntajesPorcentaje = cohortIntentos.map((intento) => {
    const puntaje = intento.respuestasEstudiantes.reduce(
      (acc, item) => acc + (item.puntajeObtenido ?? 0),
      0,
    );
    const totalPuntos = totalPuntosPorEvaluacion.get(intento.evaluacionId) ?? 0;
    if (totalPuntos <= 0) return 0;
    return Math.round((puntaje / totalPuntos) * 100);
  });

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 p-6">
      <header className="space-y-1">
        <h1 className="font-semibold text-2xl tracking-tight">Historial</h1>
        <p className="text-muted-foreground text-sm">
          Revisa solo tus intentos, puntaje y respuestas por intento.
        </p>
      </header>

      <HistorialClient
        intentos={intentosRows}
        cohortPuntajesPorcentaje={cohortPuntajesPorcentaje}
      />
    </main>
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
