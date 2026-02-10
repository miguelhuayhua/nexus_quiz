"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
  y: {
    label: "Intentos",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

const topScoresConfig = {
  y: {
    label: "Puntaje",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

const scoreTrendConfig = {
  y: {
    label: "Puntaje",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig

const timeConfig = {
  y: {
    label: "Minutos",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig

const comparisonConfig = {
  y: {
    label: "Puntaje",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig

const timeComparisonConfig = {
  y: {
    label: "Minutos",
    color: "var(--chart-6)",
  },
} satisfies ChartConfig

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
          <Card>
            <CardHeader>
              <CardTitle>Distribución de puntajes (cohorte)</CardTitle>
              <CardDescription>
                Comparación de resultados entre estudiantes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cohortDistribution.length > 0 ? (
                <ChartContainer config={distributionConfig}>
                  <BarChart data={cohortDistribution} accessibilityLayer>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="x" tickLine={false} axisLine={false} />
                    <YAxis hide />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="dashed" />}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="y" radius={[10, 10, 10, 10]} fill="var(--chart-1)" />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex h-[280px] items-center justify-center">
                  <p className="text-muted-foreground">
                    No hay datos suficientes para la distribución.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="text-sm text-muted-foreground">
              Distribución basada en estudiantes con intento finalizado.
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top puntajes (cohorte)</CardTitle>
              <CardDescription>
                Ranking de los mejores resultados.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cohortTopScores.length > 0 ? (
                <ChartContainer config={topScoresConfig}>
                  <BarChart data={cohortTopScores} accessibilityLayer>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="x" tickLine={false} axisLine={false} />
                    <YAxis hide />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="dashed" />}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="y" radius={[10, 10, 10, 10]} fill="var(--chart-2)" />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex h-[280px] items-center justify-center">
                  <p className="text-muted-foreground">
                    No hay resultados suficientes para el ranking.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="text-sm text-muted-foreground mt-auto">
              Comparación entre estudiantes con intento oficial.
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tu puntaje vs promedio</CardTitle>
              <CardDescription>
                Comparación directa con el promedio del grupo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cohortComparison.length > 0 ? (
                <ChartContainer config={comparisonConfig}>
                  <BarChart data={cohortComparison} accessibilityLayer>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="x" tickLine={false} axisLine={false} />
                    <YAxis hide />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="dashed" />}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="y" radius={[10, 10, 10, 10]} fill="var(--chart-5)" />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex h-[280px] items-center justify-center">
                  <p className="text-muted-foreground">
                    No hay datos suficientes para comparar.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="text-sm text-muted-foreground">
              Puntaje del estudiante vs promedio del curso.
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tu tiempo vs promedio</CardTitle>
              <CardDescription>
                Tiempo empleado comparado con el grupo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cohortTimeComparison.length > 0 ? (
                <ChartContainer config={timeComparisonConfig}>
                  <BarChart data={cohortTimeComparison} accessibilityLayer>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="x" tickLine={false} axisLine={false} />
                    <YAxis hide />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="dashed" />}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="y" radius={[10, 10, 10, 10]} fill="var(--chart-6)" />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex h-[280px] items-center justify-center">
                  <p className="text-muted-foreground">
                    No hay datos suficientes para tiempos.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="text-sm text-muted-foreground">
              Tiempo del estudiante vs promedio del curso.
            </CardFooter>
          </Card>
        </>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Distribución de puntajes</CardTitle>
              <CardDescription>
                Rangos de puntaje estimado por intento.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {distribution.length > 0 ? (
                <ChartContainer config={distributionConfig}>
                  <BarChart data={distribution} accessibilityLayer>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="x" tickLine={false} axisLine={false} />
                    <YAxis hide />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="dashed" />}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="y" radius={[10, 10, 10, 10]} fill="var(--chart-1)" />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex h-[280px] items-center justify-center">
                  <p className="text-muted-foreground">
                    No hay datos suficientes para la distribución.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="text-sm text-muted-foreground">
              Se agrupan los intentos por rango de puntaje calculado.
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mejores puntajes</CardTitle>
              <CardDescription>
                Top de intentos con puntaje más alto.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topScores.length > 0 ? (
                <ChartContainer config={topScoresConfig}>
                  <BarChart data={topScores} accessibilityLayer>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="x" tickLine={false} axisLine={false} />
                    <YAxis hide />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="dashed" />}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="y" radius={[10, 10, 10, 10]} fill="var(--chart-2)" />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex h-[280px] items-center justify-center">
                  <p className="text-muted-foreground">
                    No hay intentos suficientes para el ranking.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="text-sm text-muted-foreground mt-auto">
              Basado en el puntaje estimado de cada intento.
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Evolución de puntaje</CardTitle>
              <CardDescription>
                Comparación de resultados entre intentos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {scoreTrend.length > 0 ? (
                <ChartContainer config={scoreTrendConfig}>
                  <BarChart data={scoreTrend} accessibilityLayer>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="x" tickLine={false} axisLine={false} />
                    <YAxis hide />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="dashed" />}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="y" radius={[10, 10, 10, 10]} fill="var(--chart-3)" />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex h-[280px] items-center justify-center">
                  <p className="text-muted-foreground">
                    No hay intentos suficientes para comparar.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="text-sm text-muted-foreground">
              Visualiza la mejora entre intentos del simulacro.
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tiempo por intento</CardTitle>
              <CardDescription>
                Minutos utilizados en cada intento.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {timeByAttempt.length > 0 ? (
                <ChartContainer config={timeConfig}>
                  <BarChart data={timeByAttempt} accessibilityLayer>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="x" tickLine={false} axisLine={false} />
                    <YAxis hide />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="dashed" />}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="y" radius={[10, 10, 10, 10]} fill="var(--chart-4)" />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex h-[280px] items-center justify-center">
                  <p className="text-muted-foreground">
                    No hay intentos suficientes para tiempos.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="text-sm text-muted-foreground">
              Duración estimada por intento del simulacro.
            </CardFooter>
          </Card>
        </>
      )}
    </div>
  )
}
