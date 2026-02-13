"use client"

import * as React from "react"
import {
    PolarAngleAxis,
    PolarGrid,
    Radar,
    RadarChart,
    CartesianGrid,
    Line,
    LineChart,
    XAxis,
} from "recharts"

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart"

// ─── Radar Chart ────────────────────────────────────────────────────────

interface RadarDataPoint {
    area: string
    puntos: number
}

interface AreaRadarChartProps {
    data: RadarDataPoint[]
}

const radarConfig = {
    puntos: {
        label: "Puntos",
        color: "var(--primary)",
    },
} satisfies ChartConfig

export function AreaRadarChart({ data }: AreaRadarChartProps) {
    if (!data.length) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Progreso por Area</CardTitle>
                    <CardDescription>
                        Tu rendimiento en cada area del banco de preguntas.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[300px] items-center justify-center">
                        <p className="text-muted-foreground text-sm">
                            Aun no hay datos para mostrar. ¡Empieza un banqueo!
                        </p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Progreso por Area</CardTitle>
                <CardDescription>
                    Tu rendimiento en cada area del banco de preguntas.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer
                    config={radarConfig}
                    className="mx-auto aspect-square h-[300px] w-full"
                >
                    <RadarChart data={data}>
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent />}
                        />
                        <PolarAngleAxis dataKey="area" tick={{ fontSize: 11 }} />
                        <PolarGrid
                            className="fill-primary/10 stroke-primary/20"
                            gridType="polygon"
                        />
                        <Radar
                            dataKey="puntos"
                            fill="var(--color-puntos)"
                            fillOpacity={0.5}
                            stroke="var(--color-puntos)"
                            strokeWidth={2}
                            dot={{
                                r: 4,
                                fill: "var(--color-puntos)",
                                fillOpacity: 1,
                            }}
                        />
                    </RadarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}

// ─── Interactive Line Chart ─────────────────────────────────────────────

interface LineDataPoint {
    date: string
    correctas: number
    incorrectas: number
}

interface ActivityLineChartProps {
    data: LineDataPoint[]
}

const lineConfig = {
    views: {
        label: "Respuestas",
    },
    correctas: {
        label: "Correctas",
        color: "var(--success)",
    },
    incorrectas: {
        label: "Incorrectas",
        color: "var(--destructive)",
    },
} satisfies ChartConfig

export function ActivityLineChart({ data }: ActivityLineChartProps) {
    const [activeChart, setActiveChart] =
        React.useState<"correctas" | "incorrectas">("correctas")

    const total = React.useMemo(
        () => ({
            correctas: data.reduce((acc, curr) => acc + curr.correctas, 0),
            incorrectas: data.reduce((acc, curr) => acc + curr.incorrectas, 0),
        }),
        [data]
    )

    if (!data.length) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Actividad Reciente</CardTitle>
                    <CardDescription>
                        Tu actividad en los ultimos 30 dias.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[250px] items-center justify-center">
                        <p className="text-muted-foreground text-sm">
                            Aun no hay actividad registrada.
                        </p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="py-4 sm:py-0">
            <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
                <div className="flex flex-1 flex-col justify-center gap-1 px-6 pb-3 sm:pb-0">
                    <CardTitle>Actividad Reciente</CardTitle>
                    <CardDescription>
                        Respuestas en los ultimos 30 dias
                    </CardDescription>
                </div>
                <div className="flex">
                    {(["correctas", "incorrectas"] as const).map((key) => (
                        <button
                            key={key}
                            type="button"
                            data-active={activeChart === key}
                            className="data-[active=true]:bg-muted/50 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
                            onClick={() => setActiveChart(key)}
                        >
                            <span className="text-muted-foreground text-xs">
                                {lineConfig[key].label}
                            </span>
                            <span className="text-lg leading-none font-bold sm:text-3xl">
                                {total[key].toLocaleString()}
                            </span>
                        </button>
                    ))}
                </div>
            </CardHeader>
            <CardContent className="px-2 sm:p-6">
                <ChartContainer
                    config={lineConfig}
                    className="aspect-auto h-[250px] w-full"
                >
                    <LineChart
                        accessibilityLayer
                        data={data}
                        margin={{ left: 12, right: 12 }}
                    >
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            minTickGap={32}
                            tickFormatter={(value) => {
                                const date = new Date(value)
                                return date.toLocaleDateString("es-ES", {
                                    month: "short",
                                    day: "numeric",
                                })
                            }}
                        />
                        <ChartTooltip
                            content={
                                <ChartTooltipContent
                                    className="w-[150px]"
                                    nameKey="views"
                                    labelFormatter={(value) => {
                                        return new Date(value as string).toLocaleDateString("es-ES", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                        })
                                    }}
                                />
                            }
                        />
                        <Line
                            dataKey={activeChart}
                            type="monotone"
                            stroke={`var(--color-${activeChart})`}
                            strokeWidth={2}
                            dot={false}
                        />
                    </LineChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}
