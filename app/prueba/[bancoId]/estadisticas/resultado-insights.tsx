"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
  Label,
} from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const respuestasConfig = {
  bien: { label: "Bien", color: "#16a34a" },
  mal: { label: "Mal", color: "#dc2626" },
  noRespondidas: { label: "No respondidas", color: "#94a3b8" },
} satisfies ChartConfig;

const dificultadConfig = {
  bien: { label: "Correctas", color: "#16a34a" },
  mal: { label: "Incorrectas", color: "#dc2626" },
} satisfies ChartConfig;

const rankingConfig = {
  puntos: { label: "Puntos", color: "#2563eb" },
  intentos: { label: "Intentos", color: "#f59e0b" },
} satisfies ChartConfig;

const comparativoConfig = {
  yo: { label: "Tu resultado", color: "#0ea5e9" },
  otros: { label: "Promedio demás", color: "#94a3b8" },
} satisfies ChartConfig;

type PreguntaStat = {
  preguntaId: string;
  codigo: string;
  enunciado: string;
  bien: number;
  mal: number;
  totalIntentos: number;
  porcentajeAcierto: number;
  porcentajeError: number;
};

type RankingRow = {
  estudianteId: string;
  nombre: string;
  intentos: number;
};

type ComparativoResumen = {
  yo: {
    puntaje: number;
    porcentaje: number;
    tiempo: number;
  };
  otros: {
    puntajePromedio: number;
    porcentajePromedio: number;
    tiempoPromedio: number;
  };
};

export function ResultadoInsights({
  preguntaStats = [],
  ranking = [],
  comparativo,
  respuestasGlobales,
}: {
  preguntaStats?: PreguntaStat[];
  ranking?: RankingRow[];
  comparativo?: ComparativoResumen;
  respuestasGlobales?: {
    bien: number;
    mal: number;
    sinResponder: number;
  };
}) {
  const yoTiempo = comparativo?.yo?.tiempo ?? 0;
  const otrosTiempo = comparativo?.otros?.tiempoPromedio ?? 0;

  const useMinutesScale = React.useMemo(
    () => Math.max(yoTiempo, otrosTiempo) >= 120,
    [yoTiempo, otrosTiempo],
  );

  const formatMetricValue = React.useCallback(
    (metric: string, value: number) => {
      if (metric.startsWith("Tiempo")) {
        if (useMinutesScale) return `${value.toFixed(1)} min`;
        return `${Math.round(value)} s`;
      }
      if (metric.includes("%")) return `${value.toFixed(1)}%`;
      return Number.isInteger(value) ? String(value) : value.toFixed(1);
    },
    [useMinutesScale],
  );

  const respuestasPieData = React.useMemo(() => {
    const bien = respuestasGlobales?.bien ?? preguntaStats.reduce((acc, item) => acc + (item.bien || 0), 0);
    const mal = respuestasGlobales?.mal ?? preguntaStats.reduce((acc, item) => acc + (item.mal || 0), 0);
    const noRespondidas = Math.max(0, respuestasGlobales?.sinResponder ?? 0);
    const total = bien + mal + noRespondidas;

    if (total === 0) {
      return [
        { name: "sinDatos", value: 1, fill: "#e2e8f0" }
      ];
    }

    return [
      { name: "bien", value: bien, fill: "var(--color-bien)" },
      { name: "mal", value: mal, fill: "var(--color-mal)" },
      { name: "noRespondidas", value: noRespondidas, fill: "var(--color-noRespondidas)" },
    ].filter((item) => item.value > 0);
  }, [preguntaStats, respuestasGlobales]);

  const dificultadData = React.useMemo(
    () =>
      [...(preguntaStats || [])]
        .sort((a, b) => {
          if (b.mal !== a.mal) return b.mal - a.mal;
          return b.porcentajeError - a.porcentajeError;
        })
        .slice(0, 10)
        .map((item, idx) => ({
          label: `P${idx + 1}`,
          codigo: item.codigo,
          enunciado: item.enunciado,
          bien: item.bien,
          mal: item.mal,
          porcentajeError: item.porcentajeError,
        })),
    [preguntaStats],
  );

  const rankingData = React.useMemo(
    () =>
      (ranking || []).slice(0, 12).map((item) => ({
        estudiante: item.nombre ? (item.nombre.split(" ")[0] ?? item.nombre) : "Estudiante",
        intentos: item.intentos || 0,
      })),
    [ranking],
  );

  const comparativoData = React.useMemo(
    () => [
      {
        metrica: "Puntos",
        yo: comparativo?.yo?.puntaje ?? 0,
        otros: Number((comparativo?.otros?.puntajePromedio ?? 0).toFixed(1)),
      },
      {
        metrica: "Acierto %",
        yo: comparativo?.yo?.porcentaje ?? 0,
        otros: Number((comparativo?.otros?.porcentajePromedio ?? 0).toFixed(1)),
      },
      {
        metrica: useMinutesScale ? "Tiempo (min)" : "Tiempo (s)",
        yo: useMinutesScale
          ? Number(((comparativo?.yo?.tiempo ?? 0) / 60).toFixed(1))
          : (comparativo?.yo?.tiempo ?? 0),
        otros: useMinutesScale
          ? Number(((comparativo?.otros?.tiempoPromedio ?? 0) / 60).toFixed(1))
          : Number((comparativo?.otros?.tiempoPromedio ?? 0).toFixed(1)),
      },
    ],
    [comparativo, useMinutesScale],
  );

  return (
    <div className="grid gap-4 max-w-5xl mx-auto grid-cols-1 lg:grid-cols-3">
      {/* Card 1: Comparativo */}
      <Card className="col-span-1 lg:col-span-3 min-w-0">
        <CardHeader>
          <CardTitle>Tu resultado vs promedio de los demás</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0">
          <ChartContainer config={comparativoConfig} className="h-80 w-full aspect-auto min-w-0">
            <BarChart data={comparativoData} accessibilityLayer>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="metrica" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name, item) => {
                      const numeric = typeof value === "number" ? value : Number(value ?? 0);
                      const metric = String((item?.payload as { metrica?: string } | undefined)?.metrica ?? "");
                      const label = name === "yo" ? "Tu resultado" : "Promedio demás";
                      return (
                        <div className="flex w-full items-center justify-between gap-2">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-mono font-semibold">
                            {formatMetricValue(metric, numeric)}
                          </span>
                        </div>
                      );
                    }}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="yo" fill="var(--color-yo)" radius={6} />
              <Bar dataKey="otros" fill="var(--color-otros)" radius={6} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Card 2: Respuestas globales */}
      <Card className="col-span-1 min-w-0">
        <CardHeader>
          <CardTitle>Respuestas globales</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0">
          <ChartContainer config={respuestasConfig} className="h-[300px] w-full aspect-auto min-w-0">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
              <Pie data={respuestasPieData} dataKey="value" nameKey="name" innerRadius={60}>
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="central"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground text-3xl font-bold"
                          >
                            {preguntaStats.length.toLocaleString()}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 20}
                            className="fill-muted-foreground text-xs"
                          >
                            Preguntas
                          </tspan>
                        </text>
                      );
                    }
                  }}
                />
                {respuestasPieData.map((item) => (
                  <Cell fill={item.fill} key={item.name} />
                ))}
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="name" />} />
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Card 3: Top preguntas más difíciles */}
      <Card className="col-span-1 lg:col-span-2 min-w-0">
        <CardHeader>
          <CardTitle>Top preguntas más difíciles</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0">
          <ChartContainer config={dificultadConfig} className="h-[350px] w-full aspect-auto min-w-0">
            <BarChart data={dificultadData} layout="vertical" accessibilityLayer margin={{ left: 0 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} />
              <YAxis
                dataKey="label"
                type="category"
                tickLine={false}
                axisLine={false}
                width={35}
                tick={{ fontSize: 11 }}
              />
              <ChartTooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0]?.payload as {
                    label: string;
                    codigo?: string;
                    enunciado: string;
                    bien: number;
                    mal: number;
                    porcentajeError: number;
                  };
                  return (
                    <div className="max-w-xs rounded-lg border bg-background p-3 shadow-md">
                      <p className="mb-2 text-xs font-medium leading-snug">
                        {data.codigo ? <span className="font-bold block mb-1">{data.codigo}</span> : null}
                        {data.enunciado}
                      </p>
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-emerald-600">Correctas: {data.bien}</span>
                        <span className="text-destructive">Incorrectas: {data.mal}</span>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-destructive">Error: {data.porcentajeError}%</p>
                    </div>
                  );
                }}
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="bien" stackId="a" fill="var(--color-bien)" radius={[0, 0, 0, 0]} barSize={12} />
              <Bar dataKey="mal" stackId="a" fill="var(--color-mal)" radius={[0, 4, 4, 0]} barSize={12} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Card 4: Top estudiantes */}
      <Card className="col-span-1 lg:col-span-3 min-w-0">
        <CardHeader>
          <CardTitle>Top estudiantes: puntos e intentos</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0">
          <ChartContainer config={rankingConfig} className="h-[240px] w-full aspect-auto min-w-0">
            <LineChart data={rankingData} accessibilityLayer>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="estudiante" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Line
                dataKey="puntos"
                type="monotone"
                stroke="var(--color-puntos)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                dataKey="intentos"
                type="monotone"
                stroke="var(--color-intentos)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}


