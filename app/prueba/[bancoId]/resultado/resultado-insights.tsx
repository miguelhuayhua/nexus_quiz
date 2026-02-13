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
  puntos: number;
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
  preguntaStats,
  ranking,
  comparativo,
  respuestasGlobales,
}: {
  preguntaStats: PreguntaStat[];
  ranking: RankingRow[];
  comparativo: ComparativoResumen;
  respuestasGlobales?: {
    bien: number;
    mal: number;
    sinResponder: number;
  };
}) {
  const useMinutesScale = React.useMemo(
    () => Math.max(comparativo.yo.tiempo, comparativo.otros.tiempoPromedio) >= 120,
    [comparativo],
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
    const bien = respuestasGlobales?.bien ?? preguntaStats.reduce((acc, item) => acc + item.bien, 0);
    const mal = respuestasGlobales?.mal ?? preguntaStats.reduce((acc, item) => acc + item.mal, 0);
    const noRespondidas = Math.max(0, respuestasGlobales?.sinResponder ?? 0);
    return [
      { name: "bien", value: bien, fill: "var(--color-bien)" },
      { name: "mal", value: mal, fill: "var(--color-mal)" },
      { name: "noRespondidas", value: noRespondidas, fill: "var(--color-noRespondidas)" },
    ];
  }, [preguntaStats, respuestasGlobales]);

  const dificultadData = React.useMemo(
    () =>
      [...preguntaStats]
        .sort((a, b) => {
          if (b.mal !== a.mal) return b.mal - a.mal;
          return b.porcentajeError - a.porcentajeError;
        })
        .slice(0, 10)
        .map((item, idx) => ({
          label: `P${idx + 1}`,
          enunciado: item.enunciado,
          bien: item.bien,
          mal: item.mal,
          porcentajeError: item.porcentajeError,
        })),
    [preguntaStats],
  );

  const rankingData = React.useMemo(
    () =>
      ranking.slice(0, 12).map((item) => ({
        estudiante: item.nombre.split(" ")[0] ?? item.nombre,
        puntos: item.puntos,
        intentos: item.intentos,
      })),
    [ranking],
  );

  const comparativoData = React.useMemo(
    () => [
      {
        metrica: "Puntos",
        yo: comparativo.yo.puntaje,
        otros: Number(comparativo.otros.puntajePromedio.toFixed(1)),
      },
      {
        metrica: "Acierto %",
        yo: comparativo.yo.porcentaje,
        otros: Number(comparativo.otros.porcentajePromedio.toFixed(1)),
      },
      {
        metrica: useMinutesScale ? "Tiempo (min)" : "Tiempo (s)",
        yo: useMinutesScale
          ? Number((comparativo.yo.tiempo / 60).toFixed(1))
          : comparativo.yo.tiempo,
        otros: useMinutesScale
          ? Number((comparativo.otros.tiempoPromedio / 60).toFixed(1))
          : Number(comparativo.otros.tiempoPromedio.toFixed(1)),
      },
    ],
    [comparativo, useMinutesScale],
  );

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="min-w-0 space-y-2 rounded-lg border p-3 lg:col-span-3">
        <h4 className="font-medium text-sm">Tu resultado vs promedio de los demás</h4>
        <p className="text-muted-foreground text-xs">
          Escala de tiempo: {useMinutesScale ? "minutos (min)" : "segundos (s)"}.
        </p>
        <ChartContainer config={comparativoConfig} className="h-[240px] w-full">
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
      </section>

      <section className="min-w-0 space-y-2 rounded-lg border p-3">
        <h4 className="font-medium text-sm">Respuestas globales</h4>
        <ChartContainer config={respuestasConfig} className="mx-auto h-[300px] w-full">
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
                          {respuestasPieData.reduce((acc, curr) => acc + curr.value, 0).toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 20}
                          className="fill-muted-foreground text-xs"
                        >
                          Preguntas
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
              {respuestasPieData.map((item) => (
                <Cell fill={item.fill} key={item.name} />
              ))}
            </Pie>
            <ChartLegend content={<ChartLegendContent nameKey="name" />} className="mt-4 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center" />
          </PieChart>
        </ChartContainer>
      </section>

      <section className="min-w-0 space-y-2 rounded-lg border p-3 lg:col-span-2">
        <h4 className="font-medium text-sm">Top preguntas más difíciles</h4>
        <p className="text-muted-foreground text-xs">
          Las 10 preguntas con más fallos entre todos los estudiantes.
        </p>
        <ChartContainer config={dificultadConfig} className="h-[350px] w-full">
          <BarChart data={dificultadData} layout="vertical" accessibilityLayer margin={{ left: 0 }}>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} />
            <YAxis
              dataKey="label"
              type="category"
              tickLine={false}
              axisLine={false}
              width={30}
              tick={{ fontSize: 11 }}
            />
            <ChartTooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const data = payload[0]?.payload as {
                  label: string;
                  enunciado: string;
                  bien: number;
                  mal: number;
                  porcentajeError: number;
                };
                return (
                  <div className="max-w-xs rounded-lg border bg-background p-3 shadow-md">
                    <p className="mb-2 text-xs font-medium leading-snug">{data.enunciado}</p>
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
      </section>

      <section className="min-w-0 space-y-2 rounded-lg border p-3 lg:col-span-3">
        <h4 className="font-medium text-sm">Top estudiantes: puntos e intentos</h4>
        <ChartContainer config={rankingConfig} className="h-[240px] w-full">
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
      </section>
    </div>
  );
}
