import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock3Icon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function EvaluacionesPage() {
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

  const compras = await prisma.compraEvaluacion.findMany({
    where: {
      estado: "COMPLETADO",
      estudianteId,
      evaluacion: {
        estado: "DISPONIBLE",
      },
    },
    select: {
      id: true,
      creadoEn: true,
      evaluacion: {
        select: {
          id: true,
          titulo: true,
          tipo: true,
          gestion: true,
          tiempo_segundos: true,
          precio: true,
        },
      },
    },
    orderBy: {
      creadoEn: "desc",
    },
  });

  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 p-6">
      <header className="space-y-1">
        <h1 className="font-semibold text-2xl tracking-tight">Mis evaluaciones</h1>
        <p className="text-muted-foreground text-sm">
          Aquí aparecen tus evaluaciones registradas para empezar a practicar.
        </p>
      </header>

      {compras.length === 0 ? (
        <section className="space-y-3 rounded-lg border p-5">
          <p className="text-muted-foreground text-sm">
            Aún no tienes evaluaciones registradas.
          </p>
          <Button render={<Link href="/market" />} size="sm">
            Ir al market
          </Button>
        </section>
      ) : (
        <section className="divide-y rounded-lg border">
          {compras.map((item) => {
            const evaluacion = item.evaluacion;
            const esOficial = evaluacion.tipo === "OFICIAL";

            return (
              <article
                className="flex flex-wrap items-center justify-between gap-3 p-4"
                key={item.id}
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{evaluacion.tipo}</Badge>
                    <Badge variant="secondary">Gestión {evaluacion.gestion}</Badge>
                    <Badge variant={esOficial ? "default" : "success"}>
                      {esOficial ? `USD ${evaluacion.precio.toFixed(2)}` : "Gratis"}
                    </Badge>
                  </div>
                  <h2 className="font-medium">{evaluacion.titulo}</h2>
                  <p className="flex items-center gap-1 text-muted-foreground text-sm">
                    <Clock3Icon className="size-3.5" />
                    {Math.ceil(evaluacion.tiempo_segundos / 60)} min
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button render={<Link href={`/prueba/${evaluacion.id}`} />} size="sm">
                    Empezar práctica
                  </Button>
                </div>
              </article>
            );
          })}
        </section>
      )}
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
