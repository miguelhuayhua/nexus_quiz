import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import MarketEvaluacionDetailClient from "./client";

export default async function MarketEvaluacionDetailPage({
  params,
}: {
  params: Promise<{ evaluacionId: string }>;
}) {
  const { evaluacionId } = await params;

  const evaluacion = await prisma.evaluaciones.findFirst({
    where: {
      id: evaluacionId,
      estado: "DISPONIBLE",
    },
    select: {
      id: true,
      titulo: true,
      tipo: true,
      estado: true,
      descripcion: true,
      tiempo_segundos: true,
      nota_max: true,
      nota_min: true,
      gestion: true,
      areas: true,
      capitulos: true,
      precio: true,
    },
  });

  if (!evaluacion) {
    notFound();
  }

  return <MarketEvaluacionDetailClient evaluacion={evaluacion} />;
}
