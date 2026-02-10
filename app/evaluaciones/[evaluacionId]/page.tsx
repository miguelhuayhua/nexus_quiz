import { redirect } from "next/navigation";

export default async function EvaluacionDetallePage({
  params,
}: {
  params: Promise<{ evaluacionId: string }>;
}) {
  const { evaluacionId } = await params;
  redirect(`/prueba/${evaluacionId}`);
}
