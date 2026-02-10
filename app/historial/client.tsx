"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";
import * as React from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDataTable } from "@/hooks/use-data-table";
import { formatDateTime } from "@/lib/utils";

export type HistorialIntentoRow = {
  id: string;
  numero: number;
  estado: string;
  iniciadoEn: string;
  enviadoEn: string | null;
  venceEn: string;
  evaluacionId: string;
  evaluacionTitulo: string;
  evaluacionTipo: string;
  gestion: number;
  respondidas: number;
  totalPreguntas: number;
  correctas: number;
  incorrectas: number;
  precision: number;
  puntaje: number;
  puntajePorcentaje: number;
};

function getEstadoBadgeVariant(estado: string) {
  if (estado === "ENVIADO") return "success";
  if (estado === "EN_PROGRESO") return "secondary";
  if (estado === "EXPIRADO") return "destructive";
  return "outline";
}

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
    label: "Otros ",
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

function buildHistogram(
  personalScores: number[],
  cohortScores: number[],
): HistBin[] {
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
  const [evaluacionFilter] = useQueryState("evaluacion", parseAsString.withDefault(""));
  const [estadoFilter] = useQueryState(
    "estado",
    parseAsArrayOf(parseAsString).withDefault([]),
  );
  const [tipoFilter] = useQueryState(
    "tipo",
    parseAsArrayOf(parseAsString).withDefault([]),
  );

  const filteredIntentos = React.useMemo(() => {
    return intentos.filter((item) => {
      const matchesSearch =
        evaluacionFilter === "" ||
        item.evaluacionTitulo.toLowerCase().includes(evaluacionFilter.toLowerCase());
      const matchesEstado =
        estadoFilter.length === 0 || estadoFilter.includes(item.estado);
      const matchesTipo =
        tipoFilter.length === 0 || tipoFilter.includes(item.evaluacionTipo);

      return matchesSearch && matchesEstado && matchesTipo;
    });
  }, [intentos, evaluacionFilter, estadoFilter, tipoFilter]);

  const resultadosRows = React.useMemo(() => filteredIntentos, [filteredIntentos]);

  const personalPuntajesPorcentaje = React.useMemo(
    () => resultadosRows.map((row) => row.puntajePorcentaje),
    [resultadosRows],
  );

  const intentosColumns = React.useMemo<ColumnDef<HistorialIntentoRow>[]>(
    () => [
      {
        id: "evaluacion",
        accessorFn: (row) => row.evaluacionTitulo,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Evaluacion" />
        ),
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="font-medium">{row.original.evaluacionTitulo}</p>
            <p className="text-muted-foreground text-xs">
              {row.original.evaluacionTipo} - Gestion {row.original.gestion}
            </p>
          </div>
        ),
        meta: {
          label: "Evaluacion",
          placeholder: "Buscar evaluacion...",
          variant: "text",
        },
        enableColumnFilter: true,
      },
      {
        id: "tipo",
        accessorFn: (row) => row.evaluacionTipo,
        header: ({ column }) => <DataTableColumnHeader column={column} label="Tipo" />,
        cell: ({ row }) => <Badge variant="outline">{row.original.evaluacionTipo}</Badge>,
        meta: {
          label: "Tipo",
          variant: "multiSelect",
          options: [
            { label: "PRUEBA", value: "PRUEBA" },
            { label: "OFICIAL", value: "OFICIAL" },
          ],
        },
        enableColumnFilter: true,
      },
      {
        id: "estado",
        accessorFn: (row) => row.estado,
        header: ({ column }) => <DataTableColumnHeader column={column} label="Estado" />,
        cell: ({ row }) => (
          <Badge variant={getEstadoBadgeVariant(row.original.estado)}>
            {row.original.estado}
          </Badge>
        ),
        meta: {
          label: "Estado",
          variant: "multiSelect",
          options: [
            { label: "EN_PROGRESO", value: "EN_PROGRESO" },
            { label: "ENVIADO", value: "ENVIADO" },
            { label: "EXPIRADO", value: "EXPIRADO" },
            { label: "ANULADO", value: "ANULADO" },
          ],
        },
        enableColumnFilter: true,
      },
      {
        id: "iniciado",
        accessorFn: (row) => row.iniciadoEn,
        header: ({ column }) => <DataTableColumnHeader column={column} label="Inicio" />,
        cell: ({ row }) => (
          <span className="text-sm">{formatDateTime(new Date(row.original.iniciadoEn))}</span>
        ),
        meta: {
          label: "Inicio",
        },
      },
      {
        id: "enviado",
        accessorFn: (row) => row.enviadoEn ?? "",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Envio" />,
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.enviadoEn
              ? formatDateTime(new Date(row.original.enviadoEn))
              : "-"}
          </span>
        ),
        meta: {
          label: "Envio",
        },
      },
      {
        id: "respondidas",
        accessorFn: (row) => row.respondidas,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Respondidas" />
        ),
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.respondidas}/{row.original.totalPreguntas}
          </span>
        ),
        meta: {
          label: "Respondidas",
        },
      },
      {
        id: "correctas",
        accessorFn: (row) => row.correctas,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Correctas" />
        ),
        cell: ({ row }) => (
          <span className="font-medium text-emerald-600 text-sm dark:text-emerald-400">
            {row.original.correctas}
          </span>
        ),
        meta: {
          label: "Correctas",
        },
      },
      {
        id: "incorrectas",
        accessorFn: (row) => row.incorrectas,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Incorrectas" />
        ),
        cell: ({ row }) => (
          <span className="font-medium text-rose-600 text-sm dark:text-rose-400">
            {row.original.incorrectas}
          </span>
        ),
        meta: {
          label: "Incorrectas",
        },
      },
      {
        id: "precision",
        accessorFn: (row) => row.precision,
        header: ({ column }) => <DataTableColumnHeader column={column} label="Precision" />,
        cell: ({ row }) => <span className="font-medium text-sm">{row.original.precision}%</span>,
        meta: {
          label: "Precision",
        },
      },
      {
        id: "puntaje",
        accessorFn: (row) => row.puntaje,
        header: ({ column }) => <DataTableColumnHeader column={column} label="Puntaje" />,
        cell: ({ row }) => (
          <span className="font-medium text-sm">{row.original.puntaje.toFixed(2)}</span>
        ),
        meta: {
          label: "Puntaje",
        },
      },
    ],
    [],
  );

  const resultadosColumns = React.useMemo<ColumnDef<HistorialIntentoRow>[]>(
    () => [
      {
        id: "evaluacion",
        accessorFn: (row) => row.evaluacionTitulo,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Evaluacion" />
        ),
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="font-medium">{row.original.evaluacionTitulo}</p>
            <p className="text-muted-foreground text-xs">
              Intento #{row.original.numero}
            </p>
          </div>
        ),
        meta: {
          label: "Evaluacion",
          placeholder: "Buscar evaluacion...",
          variant: "text",
        },
        enableColumnFilter: true,
      },
      {
        id: "tipo",
        accessorFn: (row) => row.evaluacionTipo,
        header: ({ column }) => <DataTableColumnHeader column={column} label="Tipo" />,
        cell: ({ row }) => <Badge variant="outline">{row.original.evaluacionTipo}</Badge>,
        meta: {
          label: "Tipo",
          variant: "multiSelect",
          options: [
            { label: "PRUEBA", value: "PRUEBA" },
            { label: "OFICIAL", value: "OFICIAL" },
          ],
        },
        enableColumnFilter: true,
      },
      {
        id: "estado",
        accessorFn: (row) => row.estado,
        header: ({ column }) => <DataTableColumnHeader column={column} label="Estado" />,
        cell: ({ row }) => (
          <Badge variant={getEstadoBadgeVariant(row.original.estado)}>
            {row.original.estado}
          </Badge>
        ),
        meta: {
          label: "Estado",
        },
      },
      {
        id: "total",
        accessorFn: (row) => row.totalPreguntas,
        header: ({ column }) => <DataTableColumnHeader column={column} label="Total" />,
        cell: ({ row }) => <span className="text-sm">{row.original.totalPreguntas}</span>,
        meta: {
          label: "Total",
        },
      },
      {
        id: "correctas",
        accessorFn: (row) => row.correctas,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Correctas" />
        ),
        cell: ({ row }) => (
          <span className="font-medium text-emerald-600 text-sm dark:text-emerald-400">
            {row.original.correctas}
          </span>
        ),
        meta: {
          label: "Correctas",
        },
      },
      {
        id: "incorrectas",
        accessorFn: (row) => row.incorrectas,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Incorrectas" />
        ),
        cell: ({ row }) => (
          <span className="font-medium text-rose-600 text-sm dark:text-rose-400">
            {row.original.incorrectas}
          </span>
        ),
        meta: {
          label: "Incorrectas",
        },
      },
      {
        id: "precision",
        accessorFn: (row) => row.precision,
        header: ({ column }) => <DataTableColumnHeader column={column} label="Precision" />,
        cell: ({ row }) => <span className="font-medium text-sm">{row.original.precision}%</span>,
        meta: {
          label: "Precision",
        },
      },
      {
        id: "puntaje",
        accessorFn: (row) => row.puntaje,
        header: ({ column }) => <DataTableColumnHeader column={column} label="Puntaje" />,
        cell: ({ row }) => (
          <span className="font-medium text-sm">{row.original.puntaje.toFixed(2)}</span>
        ),
        meta: {
          label: "Puntaje",
        },
      },
      {
        id: "enviado",
        accessorFn: (row) => row.enviadoEn ?? row.venceEn,
        header: ({ column }) => <DataTableColumnHeader column={column} label="Cierre" />,
        cell: ({ row }) => (
          <span className="text-sm">
            {formatDateTime(new Date(row.original.enviadoEn ?? row.original.venceEn))}
          </span>
        ),
        meta: {
          label: "Cierre",
        },
      },
    ],
    [],
  );

  const precisionByIntento = React.useMemo(
    () =>
      resultadosRows
        .slice()
        .reverse()
        .map((item, index) => ({
          intento: `I${index + 1}`,
          precision: item.precision,
        })),
    [resultadosRows],
  );

  const respuestasPieData = React.useMemo(() => {
    const totalCorrectas = resultadosRows.reduce((acc, item) => acc + item.correctas, 0);
    const totalIncorrectas = resultadosRows.reduce((acc, item) => acc + item.incorrectas, 0);
    return [
      { name: "correctas", value: totalCorrectas, fill: "var(--color-correctas)" },
      { name: "incorrectas", value: totalIncorrectas, fill: "var(--color-incorrectas)" },
    ];
  }, [resultadosRows]);

  const histogramData = React.useMemo(
    () => buildHistogram(personalPuntajesPorcentaje, cohortPuntajesPorcentaje),
    [personalPuntajesPorcentaje, cohortPuntajesPorcentaje],
  );

  const personalHistogramData = React.useMemo(
    () =>
      histogramData.map((item) => ({
        rango: item.rango,
        personal: item.personal,
      })),
    [histogramData],
  );

  const { table: historialTable } = useDataTable({
    data: filteredIntentos,
    columns: intentosColumns,
    pageCount: Math.ceil(Math.max(filteredIntentos.length, 1) / 8),
    initialState: { pagination: { pageIndex: 0, pageSize: 8 } },
    getRowId: (row) => row.id,
  });

  const { table: resultadosTable } = useDataTable({
    data: resultadosRows,
    columns: resultadosColumns,
    pageCount: Math.ceil(Math.max(resultadosRows.length, 1) / 8),
    initialState: { pagination: { pageIndex: 0, pageSize: 8 } },
    getRowId: (row) => row.id,
  });

  return (
    <Tabs defaultValue="historial" className="w-full">
      <TabsList className="bg-muted/40 p-1">
        <TabsTrigger value="historial">Historial</TabsTrigger>
        <TabsTrigger value="resultados">Resultados</TabsTrigger>
        <TabsTrigger value="graficos">Graficos</TabsTrigger>
      </TabsList>

      <TabsContent value="historial" className="mt-3">
        <DataTable table={historialTable}>
          <DataTableToolbar table={historialTable} />
        </DataTable>
      </TabsContent>

      <TabsContent value="resultados" className="mt-3">
        <DataTable table={resultadosTable}>
          <DataTableToolbar table={resultadosTable} />
        </DataTable>
      </TabsContent>

      <TabsContent value="graficos" className="mt-3 space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Precision por intento</CardTitle>
              <CardDescription>Todos los intentos filtrados</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={precisionChartConfig} className="h-[260px] w-full">
                <BarChart data={precisionByIntento}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="intento" tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    dataKey="precision"
                    fill="var(--color-precision)"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Correctas vs Incorrectas</CardTitle>
              <CardDescription>Acumulado de respuestas</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={resultadosChartConfig} className="h-[260px] w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                  <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                  <Pie data={respuestasPieData} dataKey="value" nameKey="name" innerRadius={55}>
                    <Cell fill="var(--color-correctas)" />
                    <Cell fill="var(--color-incorrectas)" />
                  </Pie>
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Histograma de puntajes personales</CardTitle>
              <CardDescription>Distribucion por rangos porcentuales</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={histogramConfig} className="h-[260px] w-full">
                <BarChart data={personalHistogramData}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="rango" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="personal" fill="var(--color-personal)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mis puntajes vs otros</CardTitle>
              <CardDescription>Comparativa por rangos de porcentaje</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={histogramConfig} className="h-[260px] w-full">
                <BarChart data={histogramData}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="rango" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="personal" fill="var(--color-personal)" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="cohorte" fill="var(--color-cohorte)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}
