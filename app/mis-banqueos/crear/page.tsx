import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getServerAuthSession } from "@/lib/auth";
import {
  hasActiveProSubscription,
  resolveUsuarioEstudianteIdFromSession,
} from "@/lib/subscription-access";
import CrearBanqueoClient from "./client";

export const metadata: Metadata = {
  title: "Crear banqueo",
  description: "Creación de banqueos aleatorios con filtros personalizados.",
};

export default async function CrearBanqueoPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id && !session?.user?.email) {
    redirect("/");
  }

  const usuarioEstudianteId = await resolveUsuarioEstudianteIdFromSession({
    userId: session?.user?.id,
    email: session?.user?.email ?? null,
  });
  const hasPro = await hasActiveProSubscription(usuarioEstudianteId);

  return <CrearBanqueoClient hasPro={hasPro} />;
}
