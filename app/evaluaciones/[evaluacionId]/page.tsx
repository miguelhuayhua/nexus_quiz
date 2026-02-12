import type { Metadata } from "next";
import { redirect } from "next/navigation";

type Params = { evaluacionId: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { evaluacionId } = await params;

  return {
    title: `Banqueo ${evaluacionId}`,
    description: "Redireccion al flujo de prueba por banqueo.",
  };
}

export default async function EvaluacionDetallePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { evaluacionId } = await params;
  redirect(`/prueba/${evaluacionId}`);
}
