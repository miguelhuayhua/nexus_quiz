"use client"

import { Cell, Label, Pie, PieChart } from "recharts"

import { ChartContainer, type ChartConfig } from "@/components/ui/chart"

const resultadoChartConfig = {
  progreso: {
    label: "Progreso",
    color: "var(--primary)",
  },
  restante: {
    label: "Restante",
    color: "var(--muted)",
  },
} satisfies ChartConfig

export function ResultadoPie({ porcentaje, puntos, total }: { porcentaje: number, puntos?: number, total?: number }) {
  const safe = Math.max(0, Math.min(100, Math.round(porcentaje)))

  const dataBackground = [{ value: 100 }]
  const dataProgress = [
    { name: "progreso", key: "progreso", value: safe },
    { name: "restante", key: "restante", value: 100 - safe },
  ]

  return (
    <div className="flex items-center justify-center">
      <ChartContainer config={resultadoChartConfig} className="h-[220px] w-[220px]">
        <PieChart width={220} height={220}>
          <Pie
            data={dataBackground}
            dataKey="value"
            cx="50%"
            cy="50%"
            innerRadius={85}
            outerRadius={105}
            strokeWidth={0}
            startAngle={90}
            endAngle={-270}
            isAnimationActive={false}
          >
            <Cell fill="var(--muted)" opacity={0.22} />
          </Pie>

          <Pie
            data={dataProgress}
            dataKey="value"
            cx="50%"
            cy="50%"
            innerRadius={85}
            outerRadius={105}
            strokeWidth={0}
            startAngle={90}
            endAngle={-270}
            cornerRadius={8}
            paddingAngle={0}
            isAnimationActive
            animationDuration={700}
            animationEasing="ease-out"
          >
            {dataProgress.map((entry) => (
              <Cell key={entry.key} fill={`var(--color-${entry.key})`} />
            ))}

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
                        y={(viewBox.cy || 0) - 10}
                        className="fill-foreground text-4xl font-bold"
                      >
                        {safe}%
                      </tspan>
                      {puntos !== undefined && total !== undefined && (
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 22}
                          className="fill-muted-foreground text-sm font-semibold"
                        >
                          {puntos} / {total} pts
                        </tspan>
                      )}
                    </text>
                  )
                }
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>
    </div>
  )
}
