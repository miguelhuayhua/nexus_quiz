import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Button } from "@/components/ui/button";
import { ResultadoRespuesta } from "@/prisma/generated";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveUsuarioEstudianteIdFromSession } from "@/lib/subscription-access";
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item";
import { CircleQuestionMark, Icon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

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
          actualizadoEn: true,
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
      creadoEn: true,
    },
  });

  const repasoStatsByBanqueo = new Map<string, { total: number; correctas: number }>();
  for (const item of repasoRegistros) {
    const current = repasoStatsByBanqueo.get(item.banqueoId) ?? { total: 0, correctas: 0 };
    current.total += 1;
    if (item.esCorrecta) current.correctas += 1;
    repasoStatsByBanqueo.set(item.banqueoId, current);
  }

  const ultimaCorreccionByBanqueoPregunta = new Map<string, Date>();
  for (const item of repasoRegistros) {
    if (!item.esCorrecta) continue;
    const key = `${item.banqueoId}:${item.preguntaId}`;
    const prev = ultimaCorreccionByBanqueoPregunta.get(key);
    if (!prev || item.creadoEn > prev) {
      ultimaCorreccionByBanqueoPregunta.set(key, item.creadoEn);
    }
  }

  const ultimoFalloByBanqueoPregunta = new Map<string, Date>();
  for (const item of intentos) {
    for (const respuesta of item.respuestasIntentos) {
      if (respuesta.resultado === ResultadoRespuesta.MAL) {
        const key = `${item.banqueoId}:${respuesta.preguntaId}`;
        const prev = ultimoFalloByBanqueoPregunta.get(key);
        if (!prev || respuesta.actualizadoEn > prev) {
          ultimoFalloByBanqueoPregunta.set(key, respuesta.actualizadoEn);
        }
      }
    }
  }

  const pendientesByBanqueo = new Map<string, Set<string>>();
  for (const [key, ultimoFallo] of ultimoFalloByBanqueoPregunta.entries()) {
    const [banqueoId, preguntaId] = key.split(":");
    const ultimaCorreccion = ultimaCorreccionByBanqueoPregunta.get(key);
    const siguePendiente = !ultimaCorreccion || ultimoFallo > ultimaCorreccion;
    if (!siguePendiente) continue;
    const current = pendientesByBanqueo.get(banqueoId) ?? new Set<string>();
    current.add(preguntaId);
    pendientesByBanqueo.set(banqueoId, current);
  }

  const BanqueosRepasar = Array.from(pendientesByBanqueo.entries())
    .map(([banqueoId, preguntas]) => {
      return {
        banqueoId,
        titulo: banqueoMap.get(banqueoId) ?? "Banqueo",
        pendientes: preguntas.size,
      };
    })
    .filter((item) => item.pendientes > 0);

  return (
    <main className="mx-auto  container space-y-4 ">
      <h1 className="text-3xl">Repaso</h1>


      {BanqueosRepasar.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CircleQuestionMark />
            </EmptyMedia>
            <EmptyTitle>No hay preguntas pendientes</EmptyTitle>
            <EmptyDescription>No has tenido errores en los banqueos que has realizado</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button render={<Link href="/banqueos" />}>Empezar un banqueo</Button>
          </EmptyContent>
        </Empty>
      ) : (
        <Card>
          <CardContent>


            {BanqueosRepasar.map((item) => {
              const stats = repasoStatsByBanqueo.get(item.banqueoId) ?? { total: 0, correctas: 0 };

              return (
                <Item
                  className="flex flex-wrap items-center justify-between gap-3 "
                  key={item.banqueoId}
                >
                  <ItemContent>
                    <ItemTitle>{item.titulo}</ItemTitle>
                    <ItemDescription>
                      {item.pendientes} pregunta{item.pendientes === 1 ? "" : "s"} por repasar
                    </ItemDescription>
                  </ItemContent>

                  <ItemActions>
                    <Button variant={'secondary'} render={<Link href={`/repaso/${item.banqueoId}`} />} size="sm">
                      Repasar erradas
                    </Button>
                    <Button render={<Link href={`/repaso/${item.banqueoId}?mode=all`} />} variant={'outline'} size="sm">
                      Repasar todo
                    </Button>
                  </ItemActions>
                </Item>
              );
            })}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
