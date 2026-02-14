import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BanqueoTipo, BanqueoTipoCreado } from "@/prisma/generated";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  hasActiveProSubscription,
  resolveUsuarioEstudianteIdFromSession,
} from "@/lib/subscription-access";
import BanqueosClient from "./client";

export const metadata: Metadata = {
  title: "Banqueos",
  description: "Listado de banqueos gratuitos y Pro disponibles para practicar.",
};

export default async function BanqueosPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id && !session?.user?.email) {
    redirect("/");
  }

  const usuarioEstudianteId = await resolveUsuarioEstudianteIdFromSession({
    userId: session?.user?.id,
    email: session?.user?.email ?? null,
  });
  const hasPro = await hasActiveProSubscription(usuarioEstudianteId);

  const items = await prisma.banqueo.findMany({
    where: {
      tipoCreado: BanqueoTipoCreado.ADMIN,
    },
    select: {
      id: true,
      titulo: true,
      tipo: true,
      duracion: true,
      maxPreguntas: true,
      actualizadoEn: true,
      preguntas: {
        select: {
          id: true,
          gestion: true,
          temas: {
            select: {
              titulo: true,
            },
          },
          capitulos: {
            select: {
              titulo: true,
            },
          },
          areas: {
            select: {
              titulo: true,
            },
          },
        },
      },
    },
    orderBy: {
      actualizadoEn: "desc",
    },
  });

  // Fetch active attempts for the user
  const activeIntentos = await prisma.intentos.findMany({
    where: {
      usuarioEstudianteId,
      estado: "EN_PROGRESO",
    },
    select: {
      banqueoId: true,
      id: true,
    },
  });

  const activeAttemptsMap = new Map<string, string>();
  for (const intento of activeIntentos) {
    activeAttemptsMap.set(intento.banqueoId, intento.id);
  }

  const normalizedItems = items.map((item) => {
    const temas = Array.from(
      new Set(item.preguntas.flatMap((pregunta) => pregunta.temas.map((tema) => tema.titulo))),
    );
    const capitulos = Array.from(
      new Set(
        item.preguntas.flatMap((pregunta) =>
          pregunta.capitulos.map((capitulo) => capitulo.titulo),
        ),
      ),
    );
    const areas = Array.from(
      new Set(item.preguntas.flatMap((pregunta) => pregunta.areas.map((area) => area.titulo))),
    );
    const gestiones = Array.from(new Set(item.preguntas.map((pregunta) => pregunta.gestion)));
    const minGestion = gestiones.length ? Math.min(...gestiones) : null;
    const maxGestion = gestiones.length ? Math.max(...gestiones) : null;
    const activeIntentoId = activeAttemptsMap.get(item.id) ?? null;

    return {
      id: item.id,
      titulo: item.titulo,
      tipo: item.tipo,
      duracion: item.duracion,
      maxPreguntas: item.maxPreguntas,
      actualizadoEn: item.actualizadoEn,
      preguntasCount: item.preguntas.length,
      temas,
      capitulos,
      areas,
      minGestion,
      maxGestion,
      activeIntentoId,
    };
  });

  const proItems = normalizedItems.filter((item) => item.tipo === BanqueoTipo.PRO);
  const freeItemsRaw = normalizedItems.filter((item) => item.tipo === BanqueoTipo.FREE);

  const maxIntentosBasic = 3;
  const freeIds = freeItemsRaw.map((item) => item.id);
  const attemptsByBanqueo = new Map<string, number>();
  if (usuarioEstudianteId && freeIds.length > 0) {
    const intentosBasic = await prisma.intentos.groupBy({
      by: ["banqueoId"],
      where: {
        usuarioEstudianteId,
        banqueoId: {
          in: freeIds,
        },
      },
      _count: {
        _all: true,
      },
    });

    for (const row of intentosBasic) {
      attemptsByBanqueo.set(row.banqueoId, row._count._all);
    }
  }

  const freeItems = freeItemsRaw.map((item) => {
    const usados = attemptsByBanqueo.get(item.id) ?? 0;
    const intentosRestantes = Math.max(0, maxIntentosBasic - usados);
    return {
      ...item,
      intentosRestantes,
      intentosMaximos: maxIntentosBasic,
    };
  });

  return <BanqueosClient freeItems={freeItems} hasPro={hasPro} proItems={proItems} />;
}
