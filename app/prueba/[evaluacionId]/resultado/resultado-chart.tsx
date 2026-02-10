"use client"
import { PieChart, Pie, Cell, Label } from "recharts"

export function ResultadoPie({ porcentaje, puntos, total }: { porcentaje: number, puntos?: number, total?: number }) {
  const safe = Math.max(0, Math.min(100, Math.round(porcentaje)))

  const dataBackground = [{ value: 100 }]
  const dataProgress = [
    { name: "progreso", value: safe },
    { name: "restante", value: 100 - safe },
  ]

  return (
    <div className="flex items-center justify-center">
      <PieChart width={220} height={220}>
        {/* Capa 1: Fondo Muted */}
        <Pie
          data={dataBackground}
          dataKey="value"
          cx="50%"
          cy="50%"
          innerRadius={85}
          outerRadius={105}
          stroke="none"
          startAngle={90}
          endAngle={-270}
          isAnimationActive={false}
        >
          <Cell fill="var(--muted)" opacity={0.2} />
        </Pie>

        {/* Capa 2: Progreso Primary */}
        <Pie
          data={dataProgress}
          dataKey="value"
          cx="50%"
          cy="50%"
          innerRadius={85}
          outerRadius={105}
          stroke="none"
          startAngle={90}
          endAngle={-270}
          cornerRadius={0}
          paddingAngle={0}
        >
          <Cell key="progreso" fill="var(--primary)" />
          <Cell key="restante" fill="var(--muted)" />

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
    </div>
  )
}
