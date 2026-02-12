"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

type BarData = { x: string; y: number }
type EvaluacionTipo = "SIMULACRO" | "OFICIAL"

interface Props {
  distribution: BarData[]
  topScores: BarData[]
  scoreTrend: BarData[]
  timeByAttempt: BarData[]
  cohortDistribution: BarData[]
  cohortTopScores: BarData[]
  cohortComparison: BarData[]
  cohortTimeComparison: BarData[]
  tipo: EvaluacionTipo
}

const distributionConfig = {
  y: { label: "Intentos", color: "var(--chart-1)" },
} satisfies ChartConfig

const topScoresConfig = {
  y: { label: "Puntaje", color: "var(--chart-2)" },
} satisfies ChartConfig

const scoreTrendConfig = {
  y: { label: "Puntaje", color: "var(--chart-3)" },
} satisfies ChartConfig

const timeConfig = {
  y: { label: "Minutos", color: "var(--chart-4)" },
} satisfies ChartConfig

const comparisonConfig = {
  y: { label: "Puntaje", color: "var(--chart-5)" },
} satisfies ChartConfig

const timeComparisonConfig = {
  y: { label: "Minutos", color: "var(--chart-6)" },
} satisfies ChartConfig

function ChartSection({
  title,
  description,
  footer,
  children,
}: {
  title: string
  description: string
  footer: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3 rounded-lg border border-border/60 bg-background p-4">
      <header className="space-y-1">
        <h3 className="font-semibold text-base">{title}</h3>
        <p className="text-muted-foreground text-sm">{description}</p>
      </header>
      {children}
      <p className="text-muted-foreground text-sm">{footer}</p>
    </section>
  )
}

function EmptyChartMessage({ message }: { message: string }) {
  return (
    <div className="flex h-[280px] items-center justify-center">
      <p className="text-muted-foreground">{message}</p>
    </div>
  )
}

export function Charts({
  distribution,
  topScores,
  scoreTrend,
  timeByAttempt,
  cohortDistribution,
  cohortTopScores,
  cohortComparison,
  cohortTimeComparison,
  tipo,
}: Props) {
  const isOficial = tipo === "OFICIAL"

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {isOficial ? (
        <>
          <ChartSection
            title="Distribucion de puntajes (cohorte)"
            description="Comparacion de resultados entre estudiantes."
            footer="Distribucion basada en estudiantes con intento finalizado."
          >
            {cohortDistribution.length > 0 ? (
              <ChartContainer config={distributionConfig}>
                <BarChart data={cohortDistribution} accessibilityLayer>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="x" tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dashed" />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="y" radius={[10, 10, 10, 10]} fill="var(--chart-1)" />
                </BarChart>
              </ChartContainer>
            ) : (
              <EmptyChartMessage message="No hay datos suficientes para la distribucion." />
            )}
          </ChartSection>

          <ChartSection
            title="Top puntajes (cohorte)"
            description="Ranking de los mejores resultados."
            footer="Comparacion entre estudiantes con intento oficial."
          >
            {cohortTopScores.length > 0 ? (
              <ChartContainer config={topScoresConfig}>
                <BarChart data={cohortTopScores} accessibilityLayer>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="x" tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dashed" />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="y" radius={[10, 10, 10, 10]} fill="var(--chart-2)" />
                </BarChart>
              </ChartContainer>
            ) : (
              <EmptyChartMessage message="No hay resultados suficientes para el ranking." />
            )}
          </ChartSection>

          <ChartSection
            title="Tu puntaje vs promedio"
            description="Comparacion directa con el promedio del grupo."
            footer="Puntaje del estudiante vs promedio del curso."
          >
            {cohortComparison.length > 0 ? (
              <ChartContainer config={comparisonConfig}>
                <BarChart data={cohortComparison} accessibilityLayer>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="x" tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dashed" />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="y" radius={[10, 10, 10, 10]} fill="var(--chart-5)" />
                </BarChart>
              </ChartContainer>
            ) : (
              <EmptyChartMessage message="No hay datos suficientes para comparar." />
            )}
          </ChartSection>

          <ChartSection
            title="Tu tiempo vs promedio"
            description="Tiempo empleado comparado con el grupo."
            footer="Tiempo del estudiante vs promedio del curso."
          >
            {cohortTimeComparison.length > 0 ? (
              <ChartContainer config={timeComparisonConfig}>
                <BarChart data={cohortTimeComparison} accessibilityLayer>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="x" tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dashed" />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="y" radius={[10, 10, 10, 10]} fill="var(--chart-6)" />
                </BarChart>
              </ChartContainer>
            ) : (
              <EmptyChartMessage message="No hay datos suficientes para tiempos." />
            )}
          </ChartSection>
        </>
      ) : (
        <>
          <ChartSection
            title="Distribucion de puntajes"
            description="Rangos de puntaje estimado por intento."
            footer="Se agrupan los intentos por rango de puntaje calculado."
          >
            {distribution.length > 0 ? (
              <ChartContainer config={distributionConfig}>
                <BarChart data={distribution} accessibilityLayer>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="x" tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dashed" />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="y" radius={[10, 10, 10, 10]} fill="var(--chart-1)" />
                </BarChart>
              </ChartContainer>
            ) : (
              <EmptyChartMessage message="No hay datos suficientes para la distribucion." />
            )}
          </ChartSection>

          <ChartSection
            title="Mejores puntajes"
            description="Top de intentos con puntaje mas alto."
            footer="Basado en el puntaje estimado de cada intento."
          >
            {topScores.length > 0 ? (
              <ChartContainer config={topScoresConfig}>
                <BarChart data={topScores} accessibilityLayer>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="x" tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dashed" />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="y" radius={[10, 10, 10, 10]} fill="var(--chart-2)" />
                </BarChart>
              </ChartContainer>
            ) : (
              <EmptyChartMessage message="No hay intentos suficientes para el ranking." />
            )}
          </ChartSection>

          <ChartSection
            title="Evolucion de puntaje"
            description="Comparacion de resultados entre intentos."
            footer="Visualiza la mejora entre intentos del simulacro."
          >
            {scoreTrend.length > 0 ? (
              <ChartContainer config={scoreTrendConfig}>
                <BarChart data={scoreTrend} accessibilityLayer>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="x" tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dashed" />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="y" radius={[10, 10, 10, 10]} fill="var(--chart-3)" />
                </BarChart>
              </ChartContainer>
            ) : (
              <EmptyChartMessage message="No hay intentos suficientes para comparar." />
            )}
          </ChartSection>

          <ChartSection
            title="Tiempo por intento"
            description="Minutos utilizados en cada intento."
            footer="Duracion estimada por intento del simulacro."
          >
            {timeByAttempt.length > 0 ? (
              <ChartContainer config={timeConfig}>
                <BarChart data={timeByAttempt} accessibilityLayer>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="x" tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dashed" />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="y" radius={[10, 10, 10, 10]} fill="var(--chart-4)" />
                </BarChart>
              </ChartContainer>
            ) : (
              <EmptyChartMessage message="No hay intentos suficientes para tiempos." />
            )}
          </ChartSection>
        </>
      )}
    </div>
  )
}
