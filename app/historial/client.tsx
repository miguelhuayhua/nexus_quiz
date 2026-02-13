"use client";

import * as React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { MoreHorizontal, Play, Eye, FileText } from "lucide-react";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDataTable } from "@/hooks/use-data-table";
import { formatDateTime } from "@/lib/utils";

export type HistorialIntentoRow = {
  id: string;
  numero: number;
  estado: "EN_PROGRESO" | "FINALIZADO" | "ABANDONADO";
  iniciadoEn: string;
  enviadoEn: string;
  bancoId: string;
  bancoTitulo: string;
  bancoTipo: "PRO" | "FREE";
  bancoTipoCreado: "ADMIN" | "ESTUDIANTE";
  respondidas: number;
  totalPreguntas: number;
  correctas: number;
  incorrectas: number;
  precision: number;
  puntajePorcentaje: number;
  tiempoDuracion: number;
};

function resolveHistorialBasePath(row: HistorialIntentoRow) {
  return row.bancoTipoCreado === "ESTUDIANTE" ? `/mis-banqueos/${row.bancoId}` : `/prueba/${row.bancoId}`;
}

function resolveResumePath(row: HistorialIntentoRow) {
  const base = row.bancoTipoCreado === "ESTUDIANTE" ? `/mis-banqueos/${row.bancoId}/prueba` : `/prueba/${row.bancoId}`;
  return `${base}?intentoId=${row.id}`;
}

const ESTADO_LABELS: Record<HistorialIntentoRow["estado"], string> = {
  EN_PROGRESO: "En progreso",
  FINALIZADO: "Finalizado",
  ABANDONADO: "Abandonado",
};

const ESTADO_BADGE_VARIANT: Record<HistorialIntentoRow["estado"], "default" | "success" | "secondary" | "destructive"> = {
  EN_PROGRESO: "default",
  FINALIZADO: "success",
  ABANDONADO: "destructive",
};

const precisionChartConfig = {
  precision: {
    label: "Precision",
    color: "#2563eb",
  },
} satisfies ChartConfig;

const resultadosChartConfig = {
  correctas: {
    label: "Correctas",
    color: "#16a34a",
  },
  incorrectas: {
    label: "Incorrectas",
    color: "#dc2626",
  },
} satisfies ChartConfig;

const histogramConfig = {
  personal: {
    label: "Mis intentos",
    color: "#0ea5e9",
  },
  cohorte: {
    label: "Otros",
    color: "#f59e0b",
  },
} satisfies ChartConfig;

type HistBin = {
  rango: string;
  personal: number;
  cohorte: number;
};

const HIST_RANGES = [
  { min: 0, max: 20, label: "0-20" },
  { min: 21, max: 40, label: "21-40" },
  { min: 41, max: 60, label: "41-60" },
  { min: 61, max: 80, label: "61-80" },
  { min: 81, max: 100, label: "81-100" },
];

function buildHistogram(personalScores: number[], cohortScores: number[]): HistBin[] {
  return HIST_RANGES.map((range) => {
    const inRange = (score: number) => score >= range.min && score <= range.max;
    return {
      rango: range.label,
      personal: personalScores.filter(inRange).length,
      cohorte: cohortScores.filter(inRange).length,
    };
  });
}

export default function HistorialClient({
  intentos,
  cohortPuntajesPorcentaje,
}: {
  intentos: HistorialIntentoRow[];
  cohortPuntajesPorcentaje: number[];
}) {
  const totalRespuestasGlobales = React.useMemo(
    () => intentos.reduce((acc, item) => acc + item.correctas + item.incorrectas, 0),
    [intentos],
  );

  const columns = React.useMemo<ColumnDef<HistorialIntentoRow>[]>(
    () => [
      {
        id: "banqueo",
        accessorFn: (row) => row.bancoTitulo,
        header: ({ column }) => <DataTableColumnHeader column={column} label="Banqueo" />,
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="font-medium">{row.original.bancoTitulo}</p>
            <p className="text-muted-foreground text-xs">Intento #{row.original.numero}</p>
          </div>
        ),
        meta: {
          label: "Banqueo",
          placeholder: "Buscar banqueo...",
          variant: "text",
        },
        enableColumnFilter: true,
      },
      {
        id: "tipo",
        accessorFn: (row) => row.bancoTipoCreado,
        header: ({ column }) => <DataTableColumnHeader column={column} label="Tipo" />,
        cell: ({ row }) =>
          row.original.bancoTipoCreado === "ESTUDIANTE" ? (
            <Badge variant="default">Personal</Badge>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                className={
                  row.original.bancoTipo === "PRO"
                    ? "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-300"
                    : undefined
                }
                variant="outline"
              >
                {row.original.bancoTipo === "PRO" ? "PRO" : "BASIC"}
              </Badge>
              <Badge variant="outline">General</Badge>
            </div>
          ),
      },
      {
        id: "estado",
        accessorFn: (row) => row.estado,
        header: ({ column }) => <DataTableColumnHeader column={column} label="Estado" />,
        cell: ({ row }) => (
          <Badge variant={ESTADO_BADGE_VARIANT[row.original.estado]}>
            {ESTADO_LABELS[row.original.estado]}
          </Badge>
        ),
      },
      {
        id: "fecha",
        accessorFn: (row) => row.enviadoEn,
        header: ({ column }) => <DataTableColumnHeader column={column} label="Fecha" />,
        cell: ({ row }) => formatDateTime(new Date(row.original.enviadoEn)),
      },
      {
        id: "respondidas",
        accessorFn: (row) => row.respondidas,
        header: ({ column }) => <DataTableColumnHeader column={column} label="Respondidas" />,
        cell: ({ row }) => `${row.original.respondidas}/${row.original.totalPreguntas}`,
      },
      {
        id: "correctas",
        accessorFn: (row) => row.correctas,
        header: ({ column }) => <DataTableColumnHeader column={column} label="Correctas" />,
        cell: ({ row }) => (
          <span className="font-medium text-emerald-600 dark:text-emerald-400">
            {row.original.correctas}
          </span>
        ),
      },
      {
        id: "incorrectas",
        accessorFn: (row) => row.incorrectas,
        header: ({ column }) => <DataTableColumnHeader column={column} label="Incorrectas" />,
        cell: ({ row }) => (
          <span className="font-medium text-destructive">{row.original.incorrectas}</span>
        ),
      },
      {
        id: "precision",
        accessorFn: (row) => row.precision,
        header: ({ column }) => <DataTableColumnHeader column={column} label="Precision" />,
        cell: ({ row }) => `${row.original.precision}%`,
      },
      {
        id: "puntaje",
        accessorFn: (row) => row.puntajePorcentaje,
        header: ({ column }) => <DataTableColumnHeader column={column} label="Puntaje" />,
        cell: ({ row }) => `${row.original.puntajePorcentaje}%`,
      },
      {
        id: "accion",
        accessorFn: (row) => row.id,
        header: () => null,
        cell: ({ row }) => {
          const basePath = resolveHistorialBasePath(row.original);
          const isEnProgreso = row.original.estado === "EN_PROGRESO";

          return (
            <div className="flex items-center gap-2">
              {isEnProgreso && (
                <Button
                  size="icon-sm"
                  variant="default"
                  render={<Link href={resolveResumePath(row.original)} />}
                  title="Reanudar prueba"
                >
                  <Play className="size-4" />
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon-sm" variant="ghost">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`${basePath}/resultado?intentoId=${row.original.id}`}>
                      <Eye className="mr-2 size-4" />
                      Ver resultado
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`${basePath}/solucionario?intentoId=${row.original.id}`}>
                      <FileText className="mr-2 size-4" />
                      Ver solucionario
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [],
  );

  const precisionByIntento = React.useMemo(
    () =>
      intentos
        .slice()
        .reverse()
        .map((item, index) => ({
          intento: `I${index + 1}`,
          precision: item.precision,
        })),
    [intentos],
  );

  const respuestasPieData = React.useMemo(() => {
    const totalCorrectas = intentos.reduce((acc, item) => acc + item.correctas, 0);
    const totalIncorrectas = intentos.reduce((acc, item) => acc + item.incorrectas, 0);
    return [
      { name: "correctas", value: totalCorrectas, fill: "var(--color-correctas)" },
      { name: "incorrectas", value: totalIncorrectas, fill: "var(--color-incorrectas)" },
    ];
  }, [intentos]);

  const personalPuntajesPorcentaje = React.useMemo(
    () => intentos.map((row) => row.puntajePorcentaje),
    [intentos],
  );

  const histogramData = React.useMemo(
    () => buildHistogram(personalPuntajesPorcentaje, cohortPuntajesPorcentaje),
    [cohortPuntajesPorcentaje, personalPuntajesPorcentaje],
  );

  const { table } = useDataTable({
    data: intentos,
    columns,
    pageCount: Math.ceil(Math.max(intentos.length, 1) / 8),
    initialState: { pagination: { pageIndex: 0, pageSize: 8 } },
    getRowId: (row) => row.id,
  });

  return (
    <Tabs className="w-full" defaultValue="tabla">
      <TabsList className="bg-muted/40 p-1">
        <TabsTrigger value="tabla">Tabla</TabsTrigger>
        <TabsTrigger value="graficos">Graficos</TabsTrigger>
      </TabsList>

      <TabsContent value="tabla" className="mt-3">
        <DataTable table={table}>
          <DataTableToolbar table={table} />
        </DataTable>
      </TabsContent>

      <TabsContent value="graficos" className="mt-3 space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="space-y-2 rounded-lg border border-border/60 bg-background p-4">
            <h3 className="font-semibold text-base">Precision por intento</h3>
            <ChartContainer config={precisionChartConfig} className="h-[260px] w-full">
              <BarChart data={precisionByIntento}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="intento" tickLine={false} axisLine={false} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => `Intento ${value}`}
                      formatter={(value) => {
                        const numeric = typeof value === "number" ? value : Number(value ?? 0);
                        return (
                          <div className="flex w-full items-center justify-between gap-2">
                            <span className="text-muted-foreground">Precisión de respuestas</span>
                            <span className="font-mono font-semibold">{numeric.toFixed(0)}%</span>
                          </div>
                        );
                      }}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="precision" fill="var(--color-precision)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </section>

          <section className="space-y-2 rounded-lg border border-border/60 bg-background p-4">
            <h3 className="font-semibold text-base">Correctas vs Incorrectas</h3>
            <ChartContainer config={resultadosChartConfig} className="h-[260px] w-full">
              <PieChart>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      nameKey="name"
                      formatter={(value, name) => {
                        const numeric = typeof value === "number" ? value : Number(value ?? 0);
                        const pct =
                          totalRespuestasGlobales > 0
                            ? Math.round((numeric / totalRespuestasGlobales) * 100)
                            : 0;
                        const label =
                          name === "correctas" ? "Respuestas correctas" : "Respuestas incorrectas";
                        return (
                          <div className="flex w-full items-center justify-between gap-2">
                            <span className="text-muted-foreground">{label}</span>
                            <span className="font-mono font-semibold">
                              {numeric} ({pct}%)
                            </span>
                          </div>
                        );
                      }}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                <Pie data={respuestasPieData} dataKey="value" nameKey="name" innerRadius={55}>
                  <Cell fill="var(--color-correctas)" />
                  <Cell fill="var(--color-incorrectas)" />
                </Pie>
              </PieChart>
            </ChartContainer>
          </section>
        </div>

        <section className="space-y-2 rounded-lg border border-border/60 bg-background p-4">
          <h3 className="font-semibold text-base">Distribucion de puntajes</h3>
          <ChartContainer config={histogramConfig} className="h-[260px] w-full">
            <BarChart data={histogramData}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="rango" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => `Rango de puntaje ${value}%`}
                    formatter={(value, name) => {
                      const numeric = typeof value === "number" ? value : Number(value ?? 0);
                      const label =
                        name === "personal"
                          ? "Tus intentos en este rango"
                          : "Intentos de otros en este rango";
                      return (
                        <div className="flex w-full items-center justify-between gap-2">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-mono font-semibold">{numeric}</span>
                        </div>
                      );
                    }}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="personal" fill="var(--color-personal)" radius={[8, 8, 0, 0]} />
              <Bar dataKey="cohorte" fill="var(--color-cohorte)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </section>
      </TabsContent>
    </Tabs>
  );
}
