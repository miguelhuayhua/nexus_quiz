"use client";

import Link from "next/link";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Clock3Icon, DollarSignIcon } from "lucide-react";
import type {
  EvaluacionEstado,
  EvaluacionTipo,
  Prisma,
} from "@/generated/prisma/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader } from "@/components/ui/loader";
import { Separator } from "@/components/ui/separator";

type EvaluacionDetail = {
  id: string;
  titulo: string;
  tipo: EvaluacionTipo;
  estado: EvaluacionEstado;
  descripcion: string | null;
  tiempo_segundos: number;
  nota_max: number;
  nota_min: number;
  gestion: number;
  areas: Prisma.JsonValue;
  capitulos: Prisma.JsonValue;
  precio: number;
};

function parseJsonList(value: Prisma.JsonValue): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item))
      .filter((item) => item.trim().length > 0);
  }
  return [];
}

export default function MarketEvaluacionDetailClient({
  evaluacion,
}: {
  evaluacion: EvaluacionDetail;
}) {
  const router = useRouter();
  const areas = parseJsonList(evaluacion.areas);
  const capitulos = parseJsonList(evaluacion.capitulos);
  const esOficial = evaluacion.tipo === "OFICIAL";
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const whatsappNumber = process.env.NEXT_PUBLIC_MARKET_WHATSAPP ?? "51999999999";
  const whatsappHref = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    `Hola, deseo registrarme en la evaluación \"${evaluacion.titulo}\" (${evaluacion.tipo}) y recibir asistencia de compra.`,
  )}`;

  const handleComprar = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/market/adquirir", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ evaluacionId: evaluacion.id }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;
        setError(payload?.message ?? "No se pudo registrar la compra.");
        return;
      }

      setIsDialogOpen(false);
      router.push("/evaluaciones");
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 p-6">
      {isSubmitting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader size={40} variant="cube" />
            <p className="text-sm font-medium text-foreground">Registrando evaluación...</p>
          </div>
        </div>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{evaluacion.tipo}</Badge>
          <Badge variant="secondary">Gestión {evaluacion.gestion}</Badge>
          <Badge variant={esOficial ? "default" : "success"}>
            {esOficial ? `USD ${evaluacion.precio.toFixed(2)}` : "Gratis"}
          </Badge>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">{evaluacion.titulo}</h1>

        {evaluacion.descripcion && (
          <p className="max-w-3xl text-muted-foreground">{evaluacion.descripcion}</p>
        )}
      </section>

      <Separator />

      <section className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Tiempo</p>
          <p className="flex items-center gap-2 font-medium">
            <Clock3Icon className="size-4 text-primary" />
            {Math.ceil(evaluacion.tiempo_segundos / 60)} min
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Costo</p>
          <p className="flex items-center gap-2 font-medium">
            <DollarSignIcon className="size-4 text-primary" />
            {esOficial ? `USD ${evaluacion.precio.toFixed(2)}` : "Gratis"}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Rango de nota</p>
          <p className="font-medium">
            <span className="text-destructive">{evaluacion.nota_min}</span> -{" "}
            <span className="text-success">{evaluacion.nota_max}</span>
          </p>
        </div>
      </section>

      <Separator />

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Áreas</h2>
          <div className="flex flex-wrap gap-2">
            {areas.length === 0 && (
              <span className="text-sm text-muted-foreground">Sin áreas</span>
            )}
            {areas.map((area) => (
              <Badge key={area} variant="outline">
                {area}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Capítulos</h2>
          <div className="flex flex-wrap gap-2">
            {capitulos.length === 0 && (
              <span className="text-sm text-muted-foreground">Sin capítulos</span>
            )}
            {capitulos.map((capitulo) => (
              <Badge key={capitulo} variant="outline">
                {capitulo}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      <section className="flex flex-wrap justify-between gap-2 pt-1">
        <Button render={<Link href="/market" />} variant="outline">
          Volver
        </Button>
        <AlertDialog onOpenChange={setIsDialogOpen} open={isDialogOpen}>
          <Button onClick={() => setIsDialogOpen(true)} type="button">
            Registrarme en evaluación
          </Button>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Vas a registrarte en la siguiente evaluación
              </AlertDialogTitle>
              <AlertDialogDescription>
                {esOficial
                  ? `Esta evaluación es oficial y tiene un costo de USD ${evaluacion.precio.toFixed(2)}. Te contactaremos por WhatsApp para asistencia de compra.`
                  : "Esta evaluación es gratuita y se registrará con monto de USD 0.00."}
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="mx-6 mb-6 overflow-hidden rounded-md border">
              <div className="grid text-sm sm:grid-cols-2">
                <div className="space-y-1 p-3 sm:col-span-2">
                  <p className="text-xs text-muted-foreground">Evaluación</p>
                  <p className="font-medium">{evaluacion.titulo}</p>
                </div>
                <div className="space-y-1 border-t p-3">
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <p className="font-medium">{evaluacion.tipo}</p>
                </div>
                <div className="space-y-1 border-t p-3">
                  <p className="text-xs text-muted-foreground">Gestión</p>
                  <p className="font-medium">{evaluacion.gestion}</p>
                </div>
                <div className="space-y-1 border-t p-3">
                  <p className="text-xs text-muted-foreground">Duración</p>
                  <p className="font-medium">
                    {Math.ceil(evaluacion.tiempo_segundos / 60)} min
                  </p>
                </div>
                <div className="space-y-1 border-t p-3">
                  <p className="text-xs text-muted-foreground">Costo</p>
                  <p className="font-medium">
                    {esOficial ? `USD ${evaluacion.precio.toFixed(2)}` : "Gratis"}
                  </p>
                </div>
              </div>
            </div>

            {error && <p className="px-6 text-sm text-destructive">{error}</p>}

            <AlertDialogFooter variant="bare">
              <Button
                onClick={() => setIsDialogOpen(false)}
                type="button"
                variant="outline"
              >
                Cancelar
              </Button>
              {esOficial ? (
                <Button
                  render={<a href={whatsappHref} rel="noreferrer" target="_blank" />}
                  type="button"
                >
                  Comprar por WhatsApp
                </Button>
              ) : (
                <Button disabled={isSubmitting} onClick={handleComprar} type="button">
                  Registrarme gratis
                </Button>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </main>
  );
}
