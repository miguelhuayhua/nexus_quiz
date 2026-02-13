"use client";

import Link from "next/link";
import { LockIcon, SparklesIcon } from "lucide-react";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type BanqueoItem = {
  id: string;
  titulo: string;
  duracion: number;
  actualizadoEn: Date;
  preguntasCount: number;
  temas: string[];
  capitulos: string[];
  areas: string[];
  minGestion: number | null;
  maxGestion: number | null;
  intentosRestantes?: number;
  intentosMaximos?: number;
};

function BanqueoList({
  items,
  canAccess,
  tab,
}: {
  items: BanqueoItem[];
  canAccess: boolean;
  tab: "PRO" | "FREE";
}) {
  if (items.length === 0) {
    const isProTab = tab === "PRO";
    const Icon = isProTab ? SparklesIcon : LockIcon;
    return (
      <Empty className="rounded-xl border border-dashed bg-muted/20 py-10">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Icon />
          </EmptyMedia>
          <EmptyTitle>
            {isProTab ? "Aún no hay banqueos Pro" : "Aún no hay banqueos gratis"}
          </EmptyTitle>
          <EmptyDescription>
            {isProTab
              ? "Cuando se publiquen, aparecerán aquí."
              : "No hay banqueos disponibles por ahora."}
          </EmptyDescription>
        </EmptyHeader>
        {isProTab && !canAccess && (
          <EmptyContent>
            <Badge variant="outline">Vista solo lectura</Badge>
          </EmptyContent>
        )}
      </Empty>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((item) => (
        <Card className="relative" key={item.id}>
          {tab === "FREE" && typeof item.intentosRestantes === "number" && (
            <div className="absolute top-3 right-3">
              <Badge
                variant="outline"
                className={
                  item.intentosRestantes > 0
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300"
                    : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300"
                }
              >
                {item.intentosRestantes}/{item.intentosMaximos ?? 3} intentos
              </Badge>
            </div>
          )}
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">{item.titulo}</CardTitle>
              {!canAccess && <Badge variant="secondary">Pro</Badge>}
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
            {canAccess ? (
              <div className="flex gap-2">
                <Button className="flex-1" render={<Link href={`/banqueos/${item.id}`} />} size="sm" variant="outline">
                  Detalles
                </Button>
                <Button className="flex-1" render={<Link href={`/prueba/${item.id}`} />} size="sm">
                  Intentar ahora
                </Button>
              </div>
            ) : (
              <Button className="w-full" disabled size="sm" variant="outline">
                <LockIcon className="size-4" />
                Bloqueado
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function BanqueosClient({
  proItems,
  freeItems,
  hasPro,
}: {
  proItems: BanqueoItem[];
  freeItems: BanqueoItem[];
  hasPro: boolean;
}) {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 p-6">
      <header className="space-y-2">
        <h1 className="font-semibold text-2xl tracking-tight">Banqueos</h1>
      </header>

      <Tabs defaultValue="PRO">
        <TabsList>
          <TabsTrigger
            className="data-active:border-amber-300 data-active:bg-amber-100 data-active:text-amber-900 dark:data-active:bg-amber-500/20 dark:data-active:text-amber-300"
            value="PRO"
          >
            {hasPro ? <SparklesIcon className="size-4" /> : <LockIcon className="size-4" />}
            Pro
          </TabsTrigger>
          <TabsTrigger value="FREE">Basic</TabsTrigger>
        </TabsList>
        <TabsContent className="pt-2" value="PRO">
          <BanqueoList canAccess={hasPro} items={proItems} tab="PRO" />
        </TabsContent>
        <TabsContent className="pt-2" value="FREE">
          <BanqueoList canAccess items={freeItems} tab="FREE" />
        </TabsContent>
      </Tabs>
    </main>
  );
}
