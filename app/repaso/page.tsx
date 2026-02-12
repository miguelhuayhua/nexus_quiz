import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResultadoRespuesta } from "@/generated/prisma/client";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveUsuarioEstudianteIdFromSession } from "@/lib/subscription-access";

export const metadata: Metadata = {
  title: "Repaso",
  description: "Preguntas erradas para repasar por banqueo.",
};

export default async function RepasoPage() {
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

  const intentos = await prisma.intentos.findMany({
    where: {
      usuarioEstudianteId,
    },
    select: {
      banqueoId: true,
      respuestasIntentos: {
        select: {
          preguntaId: true,
          resultado: true,
        },
      },
    },
  });

  const banqueos = await prisma.banqueo.findMany({
    where: {
      id: {
        in: Array.from(new Set(intentos.map((item) => item.banqueoId))),
      },
    },
    select: {
      id: true,
      titulo: true,
    },
  });
  const banqueoMap = new Map(banqueos.map((item) => [item.id, item.titulo]));

  const repasoRegistros = await prisma.repasoRegistros.findMany({
    where: {
      usuarioEstudianteId,
    },
    select: {
      banqueoId: true,
      preguntaId: true,
      esCorrecta: true,
    },
  });

  const repasoStatsByBanqueo = new Map<string, { total: number; correctas: number }>();
  for (const item of repasoRegistros) {
    const current = repasoStatsByBanqueo.get(item.banqueoId) ?? { total: 0, correctas: 0 };
    current.total += 1;
    if (item.esCorrecta) current.correctas += 1;
    repasoStatsByBanqueo.set(item.banqueoId, current);
  }

  const revisadasByBanqueo = new Map<string, Set<string>>();
  for (const item of repasoRegistros) {
    const current = revisadasByBanqueo.get(item.banqueoId) ?? new Set<string>();
    current.add(item.preguntaId);
    revisadasByBanqueo.set(item.banqueoId, current);
  }

  const pendientesByBanqueo = new Map<string, Set<string>>();
  for (const item of intentos) {
    const current = pendientesByBanqueo.get(item.banqueoId) ?? new Set<string>();
    for (const respuesta of item.respuestasIntentos) {
      if (respuesta.resultado === ResultadoRespuesta.MAL) {
        current.add(respuesta.preguntaId);
      }
    }
    pendientesByBanqueo.set(item.banqueoId, current);
  }

  const rows = Array.from(pendientesByBanqueo.entries())
    .map(([banqueoId, preguntas]) => {
      const revisadas = revisadasByBanqueo.get(banqueoId) ?? new Set<string>();
      const pendientesActuales = Array.from(preguntas).filter((preguntaId) => !revisadas.has(preguntaId));
      return {
        banqueoId,
        titulo: banqueoMap.get(banqueoId) ?? "Banqueo",
        pendientes: pendientesActuales.length,
      };
    })
    .filter((item) => item.pendientes > 0);

  return (
    <main className="mx-auto w-full max-w-4xl space-y-4 p-6">
      <header className="space-y-1">
        <h1 className="font-semibold text-2xl tracking-tight">Repaso</h1>
        <p className="text-muted-foreground text-sm">
          Preguntas erradas por banqueo y progreso de mejora por perfil.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          No hay preguntas pendientes en tus intentos recientes.
        </div>
      ) : (
        <section className="divide-y rounded-lg border">
          {rows.map((item) => {
            const stats = repasoStatsByBanqueo.get(item.banqueoId) ?? { total: 0, correctas: 0 };
            const precision = stats.total > 0 ? Math.round((stats.correctas / stats.total) * 100) : 0;

            return (
              <article
                className="flex flex-wrap items-center justify-between gap-3 p-4"
                key={item.banqueoId}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{item.titulo}</p>
                    <Badge
                      className="border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-300"
                      variant="outline"
                    >
                      Personal
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {item.pendientes} pregunta{item.pendientes === 1 ? "" : "s"} por repasar
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Precision historica de repaso: {precision}% ({stats.correctas}/{stats.total})
                  </p>
                </div>
                <Button render={<Link href={`/repaso/${item.banqueoId}`} />} size="sm">
                  Ver repaso
                </Button>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
