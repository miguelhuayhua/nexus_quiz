"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const ratioConfig = {
  bien: { label: "Bien", color: "#16a34a" },
  mal: { label: "Mal", color: "#dc2626" },
} satisfies ChartConfig;

const puntajeConfig = {
  cantidad: { label: "Intentos", color: "#2563eb" },
} satisfies ChartConfig;

const aciertoConfig = {
  cantidad: { label: "Intentos", color: "#f59e0b" },
} satisfies ChartConfig;

type AttemptMetric = {
  puntaje: number;
  acierto: number;
};

type RangeBin = {
  rango: string;
  cantidad: number;
};

const PERCENT_RANGES = [
  { min: 0, max: 20, label: "0-20%" },
  { min: 21, max: 40, label: "21-40%" },
  { min: 41, max: 60, label: "41-60%" },
  { min: 61, max: 80, label: "61-80%" },
  { min: 81, max: 100, label: "81-100%" },
];

function buildScoreHistogram(attempts: AttemptMetric[]): RangeBin[] {
  if (attempts.length === 0) {
    return [
      { rango: "0-4", cantidad: 0 },
      { rango: "5-9", cantidad: 0 },
      { rango: "10-14", cantidad: 0 },
      { rango: "15-19", cantidad: 0 },
      { rango: "20+", cantidad: 0 },
    ];
  }

  const maxScore = Math.max(...attempts.map((item) => item.puntaje));
  const step = Math.max(1, Math.ceil((maxScore + 1) / 5));

  const bins = Array.from({ length: 5 }, (_, index) => {
    const min = index * step;
    const max = index === 4 ? Number.POSITIVE_INFINITY : min + step - 1;
    return {
      min,
      max,
      rango: index === 4 ? `${min}+` : `${min}-${max}`,
      cantidad: 0,
    };
  });

  for (const item of attempts) {
    const bucket = bins.find((bin) => item.puntaje >= bin.min && item.puntaje <= bin.max);
    if (bucket) bucket.cantidad += 1;
  }

  return bins.map((bin) => ({ rango: bin.rango, cantidad: bin.cantidad }));
}

function buildAciertoHistogram(attempts: AttemptMetric[]): RangeBin[] {
  return PERCENT_RANGES.map((range) => {
    const cantidad = attempts.filter(
      (item) => item.acierto >= range.min && item.acierto <= range.max,
    ).length;

    return {
      rango: range.label,
      cantidad,
    };
  });
}

export function BanqueoDetailCharts({
  totalCorrectas,
  totalIncorrectas,
  attemptMetrics,
}: {
  totalCorrectas: number;
  totalIncorrectas: number;
  attemptMetrics: AttemptMetric[];
}) {
  const ratioData = React.useMemo(
    () => [
      { name: "bien", value: totalCorrectas, fill: "var(--color-bien)" },
      { name: "mal", value: totalIncorrectas, fill: "var(--color-mal)" },
    ],
    [totalCorrectas, totalIncorrectas],
  );

  const puntajeHistogram = React.useMemo(
    () => buildScoreHistogram(attemptMetrics),
    [attemptMetrics],
  );

  const aciertoHistogram = React.useMemo(
    () => buildAciertoHistogram(attemptMetrics),
    [attemptMetrics],
  );

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="space-y-2 rounded-lg border p-3">
        <h3 className="font-medium text-sm">Aciertos vs errores</h3>
        <ChartContainer config={ratioConfig} className="h-[220px] w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
            <ChartLegend content={<ChartLegendContent nameKey="name" />} />
            <Pie data={ratioData} dataKey="value" nameKey="name" innerRadius={55}>
              <Cell fill="var(--color-bien)" />
              <Cell fill="var(--color-mal)" />
            </Pie>
          </PieChart>
        </ChartContainer>
      </section>

      <section className="space-y-2 rounded-lg border p-3 lg:col-span-2">
        <h3 className="font-medium text-sm">Histograma de puntaje</h3>
        <ChartContainer config={puntajeConfig} className="h-[220px] w-full">
          <BarChart data={puntajeHistogram} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="rango" tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="cantidad" fill="var(--color-cantidad)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </section>

      <section className="space-y-2 rounded-lg border p-3 lg:col-span-3">
        <h3 className="font-medium text-sm">Histograma de acierto (%)</h3>
        <ChartContainer config={aciertoConfig} className="h-[260px] w-full">
          <BarChart data={aciertoHistogram} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="rango" tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="cantidad" fill="var(--color-cantidad)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </section>
    </div>
  );
}
