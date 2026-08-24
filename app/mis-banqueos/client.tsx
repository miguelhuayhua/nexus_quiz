"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2Icon, MessageCircleIcon, PlayIcon, Plus, SparklesIcon, Trash2Icon } from "lucide-react";
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
  activeIntentoId?: string | null;
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
    <main className="mx-auto  container space-y-4 ">
      {isDeleting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader size={40} variant="cube" />
            <p className="text-sm font-medium">Eliminando banqueo...</p>
          </div>
        </div>
      )}

      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl">Mis banqueos</h1>
        <Button
          disabled={!hasPro}
          render={hasPro ? <Link href="/mis-banqueos/crear" /> : undefined}
        >
          <Plus />
          Crear banqueo
        </Button>
      </header>

      {!hasPro && (
        <Card className="bg-gradient-to-br from-green-600  to-green-900">

          <CardContent >
            <div className="flex items-center lg:gap-30 gap-4">

              <div className="space-y-1" >
                <CardTitle >
                  Sube a premium y desbloqueda todo el contenido
                </CardTitle>
                <CardDescription className="text-white/70">
                  Modo pro, acceso a banqueos ilimitados, simulacros semanales a nivel nacional, ranking en vivo, activación en menos de 10 minutos por Whatsapp.
                </CardDescription>
              </div>
              <Button
                variant={'outline'}
                className="bg-white text-foreground"
                render={<Link href="https://wa.me/573227529005" target="_blank" />}
              >
                Hablar por Whatsapp
              </Button>
            </div>


          </CardContent>
        </Card>
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
                Usa el botón superior para realizar tu consulta y compra de bancos.
              </p>
            ) : null}
          </EmptyContent>
        </Empty>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.id}>
              <CardHeader >

                <CardTitle >{item.titulo}</CardTitle>

              </CardHeader>
              <CardContent >
                <div className="space-x-2">
                  <Badge variant="outline">{item.preguntasCount} preguntas</Badge>
                  <Badge variant={'secondary'}>
                    {item.duracion} min
                  </Badge>
                </div>
                <div className="space-y-1 text-xs">
                  <p className="text-muted-foreground">
                    <span className="text-foreground">Temas:</span> {item.temas.slice(0, 3).join(", ") || "Sin temas"}
                  </p>
                  <p className="text-muted-foreground">
                    <span className="text-foreground">Áreas:</span> {item.areas.slice(0, 3).join(", ") || "Sin áreas"}
                  </p>
                  <p className="text-muted-foreground">
                    <span className="text-foreground">Capítulos:</span> {item.capitulos.slice(0, 3).join(", ") || "Sin capítulos"}
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">

                {item.activeIntentoId ? (
                  <Button
                    render={<Link href={`/prueba/${item.id}?intentoId=${item.activeIntentoId}`} />}
                    size="sm"
                    variant="secondary"
                  >
                    <PlayIcon />
                    Reanudar
                  </Button>
                ) : (
                  <Button variant={'secondary'} render={<Link href={`/prueba/${item.id}`} />} size="sm">
                    Intentar ahora
                  </Button>
                )}
                <Button
                  onClick={() => setBanqueoToDeleteId(item.id)}
                  size="icon-sm"
                  variant="destructive-outline"
                >
                  <Trash2Icon />
                </Button>
              </CardFooter>
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
              <Button disabled={isDeleting} onClick={onDeleteBanqueo} type="button" variant="destructive-outline">
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
