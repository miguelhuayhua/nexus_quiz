import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BarChart3Icon, InfoIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BanqueoTipoCreado } from "@/prisma/generated";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveUsuarioEstudianteIdFromSession } from "@/lib/subscription-access";
import { BanqueoDetailCharts } from "@/app/banqueos/[id]/detail-charts";
import { StartPruebaButton } from "./start-prueba-button";

type Params = {
  bancoId: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { bancoId } = await params;
  const banqueo = await prisma.banqueo.findFirst({
    where: {
      id: bancoId,
      tipoCreado: BanqueoTipoCreado.ESTUDIANTE,
    },
    select: { titulo: true },
  });

  return {
    title: banqueo ? `${banqueo.titulo}` : "Detalle de mi banqueo",
    description: "Vista de detalle y estadisticas de banqueo personal.",
  };
}

function formatBanqueoId(id: string) {
  return `BNQ-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

export default async function MisBanqueoDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const session = await getServerAuthSession();
  if (!session?.user?.id && !session?.user?.email) {
    redirect("/");
  }

  const { bancoId } = await params;
  const usuarioEstudianteId = await resolveUsuarioEstudianteIdFromSession({
    userId: session?.user?.id,
    email: session?.user?.email ?? null,
  });
  if (!usuarioEstudianteId) {
    return notFound();
  }

  const banqueo = await prisma.banqueo.findFirst({
    where: {
      id: bancoId,
      tipoCreado: BanqueoTipoCreado.ESTUDIANTE,
    },
    select: {
      id: true,
      titulo: true,
      duracion: true,
      preguntas: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!banqueo) {
    return notFound();
  }

  const intentos = await prisma.intentos.findMany({
    where: {
      banqueoId: banqueo.id,
      usuarioEstudianteId,
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
          esCorrecta: true,
        },
      },
    },
    orderBy: {
      creadoEn: "desc",
    },
    take: 200,
  });

  const totalIntentos = intentos.length;
  const totalCorrectas = intentos.reduce((acc, item) => acc + item.correctas, 0);
  const totalIncorrectas = intentos.reduce((acc, item) => acc + item.incorrectas, 0);
  const promedioCorrectas = totalIntentos > 0 ? (totalCorrectas / totalIntentos).toFixed(1) : "0.0";
  const promedioTiempo =
    totalIntentos > 0
      ? Math.round(intentos.reduce((acc, item) => acc + item.tiempoDuracion, 0) / totalIntentos)
      : 0;

  const attemptMetrics = intentos.map((intento) => {
    const respondidas = intento.respuestasIntentos.filter((item) => item.esCorrecta !== null).length;
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
            <Badge variant="outline">PERSONAL</Badge>
            <Badge variant="outline">{formatBanqueoId(banqueo.id)}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button render={<Link href="/mis-banqueos" />} variant="outline">
            Volver a mis banqueos
          </Button>
          <StartPruebaButton bancoId={bancoId} />
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
          <section className="space-y-2">
            <h2 className="mb-2 font-semibold">Informacion de mi banqueo</h2>
            <div className="overflow-hidden rounded-lg border bg-background">
              <div className="grid grid-cols-1 divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
                <div className="p-3">
                  <p className="font-semibold text-sm">Tipo</p>
                  <p className="text-sm text-muted-foreground">PERSONAL</p>
                </div>
                <div className="p-3">
                  <p className="font-semibold text-sm">Duracion</p>
                  <p className="text-sm text-muted-foreground">{Math.max(1, Math.ceil(banqueo.duracion / 60))} min</p>
                </div>
                <div className="p-3">
                  <p className="font-semibold text-sm">Preguntas</p>
                  <p className="text-sm text-muted-foreground">{banqueo.preguntas.length}</p>
                </div>
                <div className="p-3">
                  <p className="font-semibold text-sm">Intentos</p>
                  <p className="text-sm text-muted-foreground">{totalIntentos}</p>
                </div>
                <div className="p-3">
                  <p className="font-semibold text-sm">Promedio de aciertos</p>
                  <p className="text-sm text-muted-foreground">{promedioCorrectas}</p>
                </div>
                <div className="p-3">
                  <p className="font-semibold text-sm">Promedio de tiempo</p>
                  <p className="text-sm text-muted-foreground">{promedioTiempo}s</p>
                </div>
                <div className="p-3">
                  <p className="font-semibold text-sm">Total correctas</p>
                  <p className="text-sm text-muted-foreground">{totalCorrectas}</p>
                </div>
                <div className="p-3">
                  <p className="font-semibold text-sm">Total incorrectas</p>
                  <p className="text-sm text-muted-foreground">{totalIncorrectas}</p>
                </div>
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
                      <th className="px-3 py-2">Fecha</th>
                      <th className="px-3 py-2 text-center">Correctas</th>
                      <th className="px-3 py-2 text-center">Incorrectas</th>
                      <th className="px-3 py-2 text-center">Tiempo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {intentos.map((item) => {
                      return (
                        <tr className="border-b last:border-0" key={item.id}>
                          <td className="px-3 py-2">{new Date(item.creadoEn).toLocaleString("es-PE")}</td>
                          <td className="px-3 py-2 text-center">{item.correctas}</td>
                          <td className="px-3 py-2 text-center">{item.incorrectas}</td>
                          <td className="px-3 py-2 text-center">{item.tiempoDuracion}s</td>
                        </tr>
                      );
                    })}
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
