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
    BarChart,
    Bar,
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
import { FlashCardsType } from "./page"

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


    return (

        <ChartContainer
            config={radarConfig}
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
    },
    incorrectas: {
        label: "Incorrectas",
    },
} satisfies ChartConfig

export function ActivityLineChart({ data }: ActivityLineChartProps) {

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
                        Tu actividad en los últimos 30 días.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex  items-center justify-center">
                        <p className="text-muted-foreground text-sm">
                            Aún no hay actividad registrada.
                        </p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card  >
            <CardHeader >
                <CardTitle>Actividad Reciente</CardTitle>
                <CardDescription>
                    Respuestas en los últimos 30 días
                </CardDescription>
                <div className="flex pt-6">
                    <div className="flex flex-1 flex-col justify-center gap-1 text-center">
                        <span className="text-muted-foreground ">
                            {lineConfig["correctas"].label}
                        </span>
                        <span className="text-2xl text-secondary">
                            {total["correctas"].toLocaleString()}
                        </span>
                    </div>
                    <div className="flex flex-1 flex-col justify-center gap-1  text-center">
                        <span className="text-muted-foreground ">
                            {lineConfig["incorrectas"].label}
                        </span>
                        <span className="text-2xl text-primary">
                            {total["incorrectas"].toLocaleString()}
                        </span>
                    </div>
                </div>
            </CardHeader>
            <CardContent >
                <ChartContainer
                    config={lineConfig}
                >
                    <LineChart
                        accessibilityLayer
                        data={data}
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
                                    className="w-40"
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
                            dataKey={"correctas"}
                            type="monotone"
                            stroke={`var(--color-secondary)`}
                            strokeWidth={2}
                            label='Correctas'
                            dot={false}
                        />
                        <Line
                            dataKey={"incorrectas"}
                            type="monotone"
                            label='Incorrectas'
                            stroke={`var(--color-primary)`}
                            strokeWidth={2}
                            dot={false}
                        />
                    </LineChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}


const chartConfig = {
    dia: {
        label: "Día ",
    },
    actividad: {
        label: "Nro. Cards",
        color: "var(--color-chart-1)",
    }
} satisfies ChartConfig

export function FlashCardsActivity({ data }: { data: FlashCardsType }) {

    return (

        <ChartContainer
            config={chartConfig}
        >
            <BarChart
                accessibilityLayer
                data={data}

            >
                <CartesianGrid vertical={false} />
                <XAxis
                    dataKey="dia"

                />
                <ChartTooltip
                    content={
                        <ChartTooltipContent
                            nameKey="actividad"
                            labelFormatter={(value) => {
                                return value
                            }}
                        />
                    }
                />
                <Bar fill="var(--secondary)"
                    radius={[10, 10, 0, 0]}
                    dataKey={"actividad"} />
            </BarChart>
        </ChartContainer>
    )
}

