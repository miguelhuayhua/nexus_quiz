import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { notFound } from "next/navigation";
import PracticaList from "./client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const revalidate = 0;

export type EvaluacionRepaso = {
  id: string;
  titulo: string;
  preguntasCount: number;
  totalQuestions: number;
};

export default async function RepasoPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id && !session?.user?.email) {
    return notFound();
  }

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
      resuelta: false,
      evaluaciones: {
        estado: "DISPONIBLE",
      },
      preguntas: {
        estado: "DISPONIBLE",
      },
    },
    select: {
      evaluacionId: true,
      evaluaciones: {
        select: {
          id: true,
          titulo: true,
        },
      },
    },
  });

  const grouped = entries.reduce(
    (acc, entry) => {
      const evalId = entry.evaluacionId;
      if (!acc[evalId]) {
        acc[evalId] = {
          id: evalId,
          titulo: entry.evaluaciones.titulo,
          preguntasCount: 0,
          totalQuestions: 0,
        };
      }
      acc[evalId].preguntasCount += 1;
      return acc;
    },
    {} as Record<string, EvaluacionRepaso>,
  );

  const evaluationIds = Object.keys(grouped);
  if (evaluationIds.length > 0) {
    const totalsByEvalId = await prisma.$transaction(
      evaluationIds.map((evaluacionId) =>
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

    evaluationIds.forEach((evaluacionId, index) => {
      grouped[evaluacionId].totalQuestions = totalsByEvalId[index]?.length ?? 0;
    });
  }

  const evaluations = Object.values(grouped);

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 lg:px-10">
      <div className="mx-auto max-w-5xl space-y-4">
        <Button size="sm" asChild>
          <Link href="/market">
            <ArrowLeft />
            Volver
          </Link>
        </Button>

        <header>
          <h1 className="text-xl">Area de repaso</h1>
        </header>

        <PracticaList evaluations={evaluations} />
      </div>
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
