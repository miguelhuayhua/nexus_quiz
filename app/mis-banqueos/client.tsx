"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2Icon, MessageCircleIcon, SparklesIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Loader } from "@/components/ui/loader";

type BanqueoItem = {
  id: string;
  titulo: string;
  duracion: number;
  maxPreguntas: number;
  actualizadoEn: Date;
  preguntasCount: number;
  temas: string[];
  capitulos: string[];
  areas: string[];
  minGestion: number | null;
  maxGestion: number | null;
};

export default function MisBanqueosClient({
  items: initialItems,
  hasPro,
}: {
  items: BanqueoItem[];
  hasPro: boolean;
}) {
  const [items, setItems] = React.useState(initialItems);
  const [banqueoToDeleteId, setBanqueoToDeleteId] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const whatsappNumber = process.env.NEXT_PUBLIC_MARKET_WHATSAPP ?? "51999999999";
  const whatsappHref = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    "Hola, quiero solicitar una cuenta Pro para crear banqueos.",
  )}`;

  const onDeleteBanqueo = React.useCallback(async () => {
    if (!banqueoToDeleteId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/banqueos/${banqueoToDeleteId}`, {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;

      if (!response.ok) {
        toast.error(payload?.message ?? "No se pudo eliminar el banqueo.");
        return;
      }

      setItems((prev) => prev.filter((item) => item.id !== banqueoToDeleteId));
      toast.success("Banqueo eliminado.");
      setBanqueoToDeleteId(null);
    } catch {
      toast.error("No se pudo conectar con el servidor.");
    } finally {
      setIsDeleting(false);
    }
  }, [banqueoToDeleteId]);

  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 p-6">
      {isDeleting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader size={40} variant="cube" />
            <p className="text-sm font-medium">Eliminando banqueo...</p>
          </div>
        </div>
      )}

      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          <h1 className="font-semibold text-2xl tracking-tight">Mis banqueos</h1>
          <p className="text-muted-foreground text-sm">Administra y elimina tus banqueos.</p>
        </div>
        <Button
          disabled={!hasPro}
          render={hasPro ? <Link href="/mis-banqueos/crear" /> : undefined}
        >
          Crear banqueo
        </Button>
      </header>

      {!hasPro && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-500/40 dark:bg-amber-500/10">
          <div className="flex items-center gap-2">
            <SparklesIcon className="size-4 text-amber-600" />
            <p className="text-amber-800 text-sm dark:text-amber-300">
              Necesitas suscripcion Pro para crear banqueos.
            </p>
          </div>
          <Button
            render={<a href={whatsappHref} rel="noreferrer" target="_blank" />}
            size="sm"
            variant="outline"
          >
            <MessageCircleIcon className="size-4" />
            Solicitar cuenta Pro
          </Button>
        </div>
      )}

      {items.length === 0 ? (
        <Empty className="rounded-2xl border border-dashed bg-gradient-to-b from-amber-50/50 to-background dark:from-amber-500/10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SparklesIcon />
            </EmptyMedia>
            <EmptyTitle>Aun no tienes banqueos</EmptyTitle>
            <EmptyDescription>
              Crea tu primer banqueo y genera varios intentos.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            {!hasPro ? (
              <p className="text-muted-foreground text-sm">
                Usa el boton superior para solicitar tu cuenta Pro.
              </p>
            ) : null}
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <Card key={item.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{item.titulo}</CardTitle>
                  <Badge variant="outline">PERSONAL</Badge>
                </div>
                <CardDescription>
                  Tiempo: {Math.max(1, Math.ceil(item.duracion / 60))} min
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="mb-3 flex flex-wrap gap-1.5">
                  <Badge variant="outline">{item.preguntasCount} preguntas</Badge>
                  <Badge variant="outline">
                    Año:{" "}
                    {item.minGestion !== null && item.maxGestion !== null
                      ? item.minGestion === item.maxGestion
                        ? item.minGestion
                        : `${item.minGestion}-${item.maxGestion}`
                      : new Date(item.actualizadoEn).getFullYear()}
                  </Badge>
                </div>
                <div className="mb-3 space-y-1 text-xs">
                  <p className="text-muted-foreground">
                    Temas: {item.temas.slice(0, 3).join(", ") || "Sin temas"}
                  </p>
                  <p className="text-muted-foreground">
                    Áreas: {item.areas.slice(0, 3).join(", ") || "Sin áreas"}
                  </p>
                  <p className="text-muted-foreground">
                    Capítulos: {item.capitulos.slice(0, 3).join(", ") || "Sin capítulos"}
                  </p>
                </div>
                <div className="flex w-full items-center gap-2">
                  <Button className="flex-1" render={<Link href={`/mis-banqueos/${item.id}`} />} size="sm" variant="outline">
                    Detalles
                  </Button>
                  <Button className="flex-1" render={<Link href={`/prueba/${item.id}`} />} size="sm">
                    Intentar ahora
                  </Button>
                  <Button
                    onClick={() => setBanqueoToDeleteId(item.id)}
                    size="icon-sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog
        open={Boolean(banqueoToDeleteId)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setBanqueoToDeleteId(null);
        }}
      >
        <AlertDialogContent centered className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar banqueo</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el banqueo y también se borrará del Historial. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button disabled={isDeleting} type="button" variant="outline">
                Cancelar
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button disabled={isDeleting} onClick={onDeleteBanqueo} type="button" variant="destructive">
                {isDeleting ? <Loader2Icon className="size-4 animate-spin" /> : null}
                Eliminar
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
