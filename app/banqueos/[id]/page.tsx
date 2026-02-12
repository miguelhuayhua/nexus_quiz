import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BarChart3Icon, InfoIcon } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BanqueoTipo } from "@/generated/prisma/client";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  hasActiveProSubscription,
  resolveUsuarioEstudianteIdFromSession,
} from "@/lib/subscription-access";
import { BanqueoDetailCharts } from "./detail-charts";

type Params = {
  id: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id } = await params;
  const banqueo = await prisma.banqueo.findUnique({
    where: { id },
    select: { titulo: true },
  });

  return {
    title: banqueo ? `${banqueo.titulo}` : "Detalle de banqueo",
    description: "Vista previa, intentos, ranking y estadisticas del banqueo.",
  };
}

function formatBanqueoId(id: string) {
  return `BNQ-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

function resolveAttemptUserLabel(
  user:
    | {
        usuario: string;
        correo: string;
      }
    | null
    | undefined,
) {
  if (!user) return "Sin usuario";
  return user.usuario || user.correo;
}

export default async function BanqueoDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const session = await getServerAuthSession();
  if (!session?.user?.id && !session?.user?.email) {
    redirect("/");
  }

  const { id } = await params;
  const usuarioEstudianteId = await resolveUsuarioEstudianteIdFromSession({
    userId: session?.user?.id,
    email: session?.user?.email ?? null,
  });
  const hasPro = await hasActiveProSubscription(usuarioEstudianteId);

  const banqueo = await prisma.banqueo.findUnique({
    where: { id },
    select: {
      id: true,
      titulo: true,
      tipo: true,
      tipoCreado: true,
      duracion: true,
      creadoEn: true,
      actualizadoEn: true,
      preguntas: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!banqueo) {
    notFound();
  }

  const isPro = banqueo.tipo === BanqueoTipo.PRO;
  const canAccess = !isPro || hasPro;
  const intentos = await prisma.intentos.findMany({
    where: {
      banqueoId: banqueo.id,
    },
    select: {
      id: true,
      usuarioEstudianteId: true,
      correctas: true,
      incorrectas: true,
      tiempoDuracion: true,
      creadoEn: true,
      respuestasIntentos: {
        select: {
          resultado: true,
          preguntaId: true,
          esCorrecta: true,
          preguntas: {
            select: {
              codigo: true,
            },
          },
        },
      },
    },
    orderBy: {
      creadoEn: "desc",
    },
    take: 200,
  });

  const usuarioIds = Array.from(
    new Set(
      intentos
        .map((item) => item.usuarioEstudianteId)
        .filter((value): value is string => typeof value === "string" && value.length > 0),
    ),
  );

  const usuarios = usuarioIds.length
    ? await prisma.usuariosEstudiantes.findMany({
        where: { id: { in: usuarioIds } },
        select: {
          id: true,
          avatar: true,
          usuario: true,
          correo: true,
        },
      })
    : [];

  const usuariosById = new Map(usuarios.map((item) => [item.id, item]));

  const totalIntentos = intentos.length;
  const totalCorrectas = intentos.reduce((acc, item) => acc + item.correctas, 0);
  const totalIncorrectas = intentos.reduce((acc, item) => acc + item.incorrectas, 0);
  const promedioCorrectas =
    totalIntentos > 0 ? (totalCorrectas / totalIntentos).toFixed(1) : "0.0";
  const promedioTiempo =
    totalIntentos > 0
      ? Math.round(intentos.reduce((acc, item) => acc + item.tiempoDuracion, 0) / totalIntentos)
      : 0;

  const attemptMetrics = intentos.map((intento) => {
    const respondidas = intento.respuestasIntentos.filter(
      (item) => item.esCorrecta !== null,
    ).length;
    const acierto = respondidas > 0 ? Math.round((intento.correctas / respondidas) * 100) : 0;

    return {
      puntaje: intento.correctas,
      acierto,
    };
  });

  return (
    <main className="mx-auto w-full max-w-5xl space-y-5 p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="font-semibold text-2xl tracking-tight">{banqueo.titulo}</h1>
          <div className="flex flex-wrap gap-2">
            <Badge
              className={
                isPro
                  ? "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-300"
                  : undefined
              }
              variant="outline"
            >
              {isPro ? "PRO" : "BASIC"}
            </Badge>
            <Badge variant="outline">{formatBanqueoId(banqueo.id)}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button render={<Link href="/banqueos" />} variant="outline">
            Volver a banqueos
          </Button>
          {canAccess ? (
            <Button render={<Link href={`/prueba/${id}`} />}>Intentar ahora</Button>
          ) : (
            <Button disabled type="button">
              Necesitas suscripcion Pro
            </Button>
          )}
        </div>
      </header>

      <Tabs className="w-full" defaultValue="informacion">
        <TabsList>
          <TabsTrigger value="informacion">
            <InfoIcon className="size-4" />
            Informacion
          </TabsTrigger>
          <TabsTrigger value="estadisticos">
            <BarChart3Icon className="size-4" />
            Estadisticos
          </TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-4 pt-2" value="informacion">
          <section className="rounded-lg p-4">
            <h2 className="mb-2 font-semibold">Informacion del banqueo</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-md border p-2">
                <p className="font-semibold text-sm">Duracion</p>
                <p className="text-sm text-muted-foreground">{Math.max(1, Math.ceil(banqueo.duracion / 60))} min</p>
              </div>
              <div className="rounded-md border p-2">
                <p className="font-semibold text-sm">Preguntas</p>
                <p className="text-sm text-muted-foreground">{banqueo.preguntas.length}</p>
              </div>
              <div className="rounded-md border p-2">
                <p className="font-semibold text-sm">Intentos</p>
                <p className="text-sm text-muted-foreground">{totalIntentos}</p>
              </div>
              <div className="rounded-md border p-2">
                <p className="font-semibold text-sm">Promedio de aciertos</p>
                <p className="text-sm text-muted-foreground">{promedioCorrectas}</p>
              </div>
              <div className="rounded-md border p-2">
                <p className="font-semibold text-sm">Promedio de tiempo</p>
                <p className="text-sm text-muted-foreground">{promedioTiempo}s</p>
              </div>
              <div className="rounded-md border p-2">
                <p className="font-semibold text-sm">Total correctas</p>
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{totalCorrectas}</p>
              </div>
              <div className="rounded-md border p-2">
                <p className="font-semibold text-sm">Total incorrectas</p>
                <p className="text-sm font-semibold text-destructive">{totalIncorrectas}</p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border p-4">
            <h2 className="mb-2 font-semibold">Intentos recientes</h2>
            {intentos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aun no hay intentos.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30 text-left">
                      <th className="px-3 py-2">Estudiante</th>
                      <th className="px-3 py-2">Fecha</th>
                      <th className="px-3 py-2 text-center">Correctas</th>
                      <th className="px-3 py-2 text-center">Incorrectas</th>
                      <th className="px-3 py-2 text-center">Tiempo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {intentos.map((item) => (
                      <tr className="border-b last:border-0" key={item.id}>
                        <td className="px-3 py-2">
                          {(() => {
                            const user = item.usuarioEstudianteId
                              ? usuariosById.get(item.usuarioEstudianteId) ?? null
                              : null;
                            const label = resolveAttemptUserLabel(user);
                            return (
                          <div className="flex items-center gap-2">
                            <Avatar className="size-8 border">
                              <AvatarImage alt={label} src={user?.avatar ?? ""} />
                              <AvatarFallback>
                                {label.slice(0, 1).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate font-medium">{label}</p>
                            </div>
                          </div>
                            );
                          })()}
                        </td>
                        <td className="px-3 py-2">{new Date(item.creadoEn).toLocaleString("es-PE")}</td>
                        <td className="px-3 py-2 text-center font-semibold text-emerald-600 dark:text-emerald-400">{item.correctas}</td>
                        <td className="px-3 py-2 text-center font-semibold text-destructive">{item.incorrectas}</td>
                        <td className="px-3 py-2 text-center">{item.tiempoDuracion}s</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </TabsContent>

        <TabsContent className="pt-2" value="estadisticos">
          <BanqueoDetailCharts
            totalCorrectas={totalCorrectas}
            totalIncorrectas={totalIncorrectas}
            attemptMetrics={attemptMetrics}
          />
        </TabsContent>
      </Tabs>
    </main>
  );
}
