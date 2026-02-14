import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BanqueoTipoCreado } from "@/prisma/generated";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  hasActiveProSubscription,
  resolveUsuarioEstudianteIdFromSession,
} from "@/lib/subscription-access";
import MisBanqueosClient from "./client";

export const metadata: Metadata = {
  title: "Mis banqueos",
  description: "Listado de banqueos creados por el estudiante.",
};

export default async function MisBanqueosPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id && !session?.user?.email) {
    redirect("/");
  }

  const usuarioEstudianteId = await resolveUsuarioEstudianteIdFromSession({
    userId: session?.user?.id,
    email: session?.user?.email ?? null,
  });
  const hasPro = await hasActiveProSubscription(usuarioEstudianteId);

  const banqueos = await prisma.banqueo.findMany({
    where: {
      tipoCreado: BanqueoTipoCreado.ESTUDIANTE,
    },
    select: {
      id: true,
      titulo: true,
      duracion: true,
      maxPreguntas: true,
      actualizadoEn: true,
      preguntas: {
        select: {
          gestion: true,
          temas: {
            select: { titulo: true },
          },
          capitulos: {
            select: { titulo: true },
          },
          areas: {
            select: { titulo: true },
          },
        },
      },
    },
    orderBy: {
      actualizadoEn: "desc",
    },
  });

  const items = banqueos.map((item) => {
    const temas = Array.from(
      new Set(item.preguntas.flatMap((p) => p.temas.map((t) => t.titulo))),
    );
    const capitulos = Array.from(
      new Set(item.preguntas.flatMap((p) => p.capitulos.map((c) => c.titulo))),
    );
    const areas = Array.from(
      new Set(item.preguntas.flatMap((p) => p.areas.map((a) => a.titulo))),
    );
    const gestiones = Array.from(new Set(item.preguntas.map((p) => p.gestion)));
    const minGestion = gestiones.length ? Math.min(...gestiones) : null;
    const maxGestion = gestiones.length ? Math.max(...gestiones) : null;

    return {
      id: item.id,
      titulo: item.titulo,
      duracion: item.duracion,
      maxPreguntas: item.maxPreguntas,
      actualizadoEn: item.actualizadoEn,
      preguntasCount: item.preguntas.length,
      temas,
      capitulos,
      areas,
      minGestion,
      maxGestion,
    };
  });

  return <MisBanqueosClient hasPro={hasPro} items={items} />;
}
