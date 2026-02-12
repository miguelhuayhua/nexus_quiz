"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";

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
import { Button } from "@/components/ui/button";

export function StartPruebaButton({ bancoId }: { bancoId: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isStarting, setIsStarting] = React.useState(false);

  const handleStart = React.useCallback(() => {
    setIsStarting(true);
    router.push(`/mis-banqueos/${bancoId}/prueba`);
  }, [bancoId, router]);

  return (
    <>
      <Button onClick={() => setOpen(true)} type="button">
        Intentar ahora
      </Button>

      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          if (!isStarting) setOpen(next);
        }}
      >
        <AlertDialogContent centered className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar intento</AlertDialogTitle>
            <AlertDialogDescription>
              Se iniciará una nueva prueba de este banqueo. ¿Deseas continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button disabled={isStarting} type="button" variant="outline">
                Cancelar
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button disabled={isStarting} onClick={handleStart} type="button">
                {isStarting ? <Loader2Icon className="size-4 animate-spin" /> : null}
                Empezar prueba
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
