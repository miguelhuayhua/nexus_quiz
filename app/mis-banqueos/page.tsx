import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BanqueoTipoCreado } from "@/generated/prisma/client";
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
    },
    orderBy: {
      actualizadoEn: "desc",
    },
  });

  return <MisBanqueosClient hasPro={hasPro} items={banqueos} />;
}
