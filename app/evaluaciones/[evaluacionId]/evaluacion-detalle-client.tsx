"use client"

import React from "react"
import Link from "next/link"
import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs"
import { ColumnDef } from "@tanstack/react-table"
import { ChartArea, Info, Table } from "lucide-react"

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { DataTable } from "@/components/data-table/data-table"
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDataTable } from "@/hooks/use-data-table"
import { formatDateTime } from "@/lib/utils"
import { Charts } from "./(.charts)/charts"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export type IntentoRow = {
  id: string
  numero: number
  estado: string
  iniciadoEn: string
  enviadoEn?: string | null
  venceEn?: string | null
  tiempoRestante: number
  puntaje: number
  respondidas: number
  correctas: number
  incorrectas: number
}

export type EvaluacionCharts = {
  distribution: { x: string; y: number }[]
  topScores: { x: string; y: number }[]
  scoreTrend: { x: string; y: number }[]
  timeByAttempt: { x: string; y: number }[]
  cohortDistribution: { x: string; y: number }[]
  cohortTopScores: { x: string; y: number }[]
  cohortComparison: { x: string; y: number }[]
  cohortTimeComparison: { x: string; y: number }[]
}

export type RespuestasChart = { x: string; y: number }[]

export type RespuestaResumenItem = {
  id: string
  index: number
  enunciado: string
  respondida: boolean
  correcta: boolean
  respuesta?: string
  correctaValor?: string
}

type EvaluacionInfo = {
  titulo: string
  descripcion?: string | null
  tipo: "SIMULACRO" | "OFICIAL"
  estado: string
  gestion: number
  tiempoSegundos: number
  notaMin: number
  notaMax: number
  cursoTitulo: string
  esOficial: boolean
  areas?: unknown
  capitulos?: unknown
}

type ActionInfo = {
  label: string
  href: string
  disabled: boolean
}

type Alerts = {
  bloqueado: boolean
  mensajeBloqueo: string
  mensajeFinal: string
  showFinal: boolean
}

const statusLabel: Record<string, { label: string; className: string }> = {
  EN_PROGRESO: {
    label: "En progreso",
    className: "text-amber-600 dark:text-amber-400",
  },
  ENVIADO: {
    label: "Enviado",
    className: "text-emerald-600 dark:text-emerald-400",
  },
  EXPIRADO: {
    label: "Expirado",
    className: "text-rose-600 dark:text-rose-400",
  },
  ANULADO: {
    label: "Anulado",
    className: "text-slate-500 dark:text-slate-400",
  },
}

const formatSeconds = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0 min"
  const minutes = Math.max(1, Math.round(seconds / 60))
  return `${minutes} min`
}

const formatTimer = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "00:00"
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safeSeconds / 60)
    .toString()
    .padStart(2, "0")
  const remaining = (safeSeconds % 60).toString().padStart(2, "0")
  return `${minutes}:${remaining}`
}

function getMetaList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const name =
            "nombre" in item && typeof item.nombre === "string"
              ? item.nombre
              : "titulo" in item && typeof item.titulo === "string"
                ? item.titulo
                : "label" in item && typeof item.label === "string"
                  ? item.label
                  : null;
          return name ?? JSON.stringify(item);
        }
        return String(item);
      });
  }
  if (typeof value === "string") return [value];
  return [JSON.stringify(value)];
}

export default function EvaluacionDetalleClient({
  intentos,
  charts,
  info,
  action,
  alerts,
  respuestas,
  respuestasChart,
}: {
  intentos: IntentoRow[]
  charts: EvaluacionCharts
  info: EvaluacionInfo
  action?: ActionInfo
  alerts?: Alerts
  respuestas: RespuestaResumenItem[]
  respuestasChart: RespuestasChart
}) {
  const [now, setNow] = React.useState(() => Date.now())
  const resolvedAction: ActionInfo = action ?? {
    label: "Ir a evaluación",
    href: "#",
    disabled: true,
  }
  const resolvedAlerts: Alerts = alerts ?? {
    bloqueado: false,
    mensajeBloqueo: "",
    mensajeFinal: "",
    showFinal: false,
  }
  const isContinuar = resolvedAction.label.toLowerCase().includes("continuar")
  const [search] = useQueryState("intento", parseAsString.withDefault(""))
  const [estadoOptions] = useQueryState(
    "estado",
    parseAsArrayOf(parseAsString).withDefault([])
  )

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => window.clearInterval(interval)
  }, [])

  const filteredIntentos = React.useMemo(() => {
    return intentos.filter((intento) => {
      const matchesSearch =
        search === "" ||
        intento.id.toLowerCase().includes(search.toLowerCase())
      const matchesEstado =
        estadoOptions.length === 0 || estadoOptions.includes(intento.estado)
      return matchesSearch && matchesEstado
    })
  }, [intentos, search, estadoOptions])

  const columns = React.useMemo<ColumnDef<IntentoRow>[]>(() => {
    return [
      {
        id: "intento",
        accessorFn: (row) => row.id,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Intento" />
        ),
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="font-medium">Intento {row.original.numero}</p>
            <p className="text-xs text-muted-foreground">ID: {row.original.id}</p>
          </div>
        ),
        meta: {
          label: "Intento",
          placeholder: "Buscar intento...",
          variant: "text",
        },
        enableColumnFilter: true,
      },
      {
        id: "estado",
        accessorFn: (row) => row.estado,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Estado" />
        ),
        cell: ({ row }) => {
          const status = statusLabel[row.original.estado] ?? {
            label: row.original.estado,
            className: "text-muted-foreground",
          }
          return (
            <div className={`flex items-center gap-2 text-sm ${status.className}`}>
              <span className="h-2 w-2 rounded-full bg-current" />
              <span>{status.label}</span>
            </div>
          )
        },
        meta: {
          label: "Estado",
          variant: "multiSelect",
          options: [
            { label: "En progreso", value: "EN_PROGRESO" },
            { label: "Enviado", value: "ENVIADO" },
            { label: "Expirado", value: "EXPIRADO" },
            { label: "Anulado", value: "ANULADO" },
          ],
        },
        enableColumnFilter: true,
      },
      {
        id: "inicio",
        accessorFn: (row) => row.iniciadoEn,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Inicio" />
        ),
        cell: ({ row }) => <Badge variant={'outline'}>{formatDateTime(new Date(row.original.iniciadoEn))}</Badge>,
      },
      {
        id: "envio",
        accessorFn: (row) => row.enviadoEn ?? "",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Envío" />
        ),
        cell: ({ row }) => <Badge variant='outline'>{row.original.enviadoEn
          ? formatDateTime(new Date(row.original.enviadoEn))
          : "-"}</Badge>,
      },
      {
        id: "tiempo",
        accessorFn: (row) => row.tiempoRestante,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Tiempo restante" />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.estado === "EN_PROGRESO" ? (
              (() => {
                const startedAt = new Date(row.original.iniciadoEn).getTime()
                const endAt = startedAt + info.tiempoSegundos * 1000
                const remaining = Math.max(0, Math.floor((endAt - now) / 1000))
                return remaining > 0 ? (
                  formatTimer(remaining)
                ) : (
                  <Badge variant="outline">Finalizado</Badge>
                )
              })()
            ) : row.original.estado === "ENVIADO" || row.original.estado === "EXPIRADO" ? (
              <Badge variant="outline">Finalizado</Badge>
            ) : (
              formatTimer(row.original.tiempoRestante)
            )}
          </span>
        ),
      },
      {
        id: "respondidas",
        accessorFn: (row) => row.respondidas,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Respondidas" />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.respondidas}/{respuestas.length}
          </span>
        ),
      },
      {
        id: "correctas",
        accessorFn: (row) => row.correctas,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Correctas" />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-emerald-600 dark:text-emerald-400">
            {row.original.correctas}
          </span>
        ),
      },
      {
        id: "incorrectas",
        accessorFn: (row) => row.incorrectas,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Incorrectas" />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-rose-600 dark:text-rose-400">
            {row.original.incorrectas}
          </span>
        ),
      },
      {
        id: "puntaje",
        accessorFn: (row) => row.puntaje,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Puntaje" />
        ),
        cell: ({ row }) => (
          <span className="text-sm font-medium text-foreground">
            {row.original.puntaje}%
          </span>
        ),
      },
    ]
  }, [info.tiempoSegundos, now, respuestas.length])

  const { table } = useDataTable({
    data: filteredIntentos,
    columns,
    pageCount: Math.ceil(filteredIntentos.length / 10),
    initialState: { pagination: { pageSize: 10, pageIndex: 0 } },
    getRowId: (row) => row.id,
    enableSorting: true,
  })

  return (
    <Tabs defaultValue="info" className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsList className="bg-muted/40 dark:bg-slate-950/50 p-1">
          <TabsTrigger value="info" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:border data-[state=active]:border-border dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-white">
            <Info />
            Información
          </TabsTrigger>

          <TabsTrigger value="intentos" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:border data-[state=active]:border-border dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-white">
            <Table />
            Intentos
          </TabsTrigger>

          <TabsTrigger value="charts" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:border data-[state=active]:border-border dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-white">
            <ChartArea />
            Gráficos
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="info">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr] mt-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                {info.esOficial ? "Solo un intento" : "Simulacro con múltiples intentos"}
              </Badge>
              <Badge variant="secondary">{info.tipo}</Badge>
            </div>
            <h3 className="mt-3 text-lg font-semibold text-foreground">{info.titulo}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{info.cursoTitulo}</p>
            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-md border border-border/50 bg-background/40 px-3 py-2">
                <span>Gestión</span>
                <span className="font-medium text-foreground">{info.gestion}</span>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border/50 bg-background/40 px-3 py-2">
                <span>Nro preguntas</span>
                <span className="font-medium text-foreground">{respuestas.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border/50 bg-background/40 px-3 py-2">
                <span>Tiempo</span>
                <span className="font-medium text-foreground">
                  {formatSeconds(info.tiempoSegundos)}
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-md border border-border/50 bg-background/40 px-3 py-2">
                <span >Áreas</span>
                <div className="flex flex-wrap gap-1">
                  {getMetaList(info.areas).map((area, i) => (
                    <Badge key={i} variant="outline">
                      {area}
                    </Badge>
                  ))}
                  {getMetaList(info.areas).length === 0 && <span className="text-foreground">-</span>}
                </div>
              </div>
              <div className="flex flex-col gap-1 rounded-md border border-border/50 bg-background/40 px-3 py-2">
                <span >Capítulos / Temas</span>
                <div className="flex flex-wrap gap-1">
                  {getMetaList(info.capitulos).map((cap, i) => (
                    <Badge key={i} variant="outline">
                      {cap}
                    </Badge>
                  ))}
                  {getMetaList(info.capitulos).length === 0 && <span className="text-foreground">-</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border/50 bg-card p-4">
            <div className="flex flex-col gap-3 text-sm text-muted-foreground">
              {resolvedAction.disabled ? (
                <Button disabled>{resolvedAction.label}</Button>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger render={<Button />}>
                    {resolvedAction.label}
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader className="text-center">
                      <AlertDialogTitle className="text-center">
                        {isContinuar ? "¿Continuar evaluación?" : "¿Iniciar evaluación?"}
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-center">
                        {info.descripcion?.trim()
                          ? info.descripcion
                          : "Estás a punto de iniciar la evaluación."}
                      </AlertDialogDescription>
                      <ul className="mt-3 list-disc space-y-1 pl-5 text-left text-sm text-muted-foreground">
                        <li>
                          Tipo:{" "}
                          <span className="font-medium text-foreground">
                            {info.tipo}
                          </span>
                        </li>
                        <li>
                          {isContinuar
                            ? "Continuar recuperará tu estado guardado."
                            : "Al iniciar se registrará tu intento."}
                        </li>
                      </ul>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="sm:justify-center">
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction render={<Link href={resolvedAction.href} />}>
                        Continuar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              {resolvedAlerts.bloqueado && (
                <div className="rounded-md border border-amber-200/60 bg-amber-50/40 p-3 text-xs text-amber-700 dark:text-amber-200">
                  {resolvedAlerts.mensajeBloqueo}
                </div>
              )}
              {resolvedAlerts.showFinal && (
                <p className="text-xs text-muted-foreground">
                  {resolvedAlerts.mensajeFinal}
                </p>
              )}
              <div className="rounded-md border border-border/50 bg-background/40 p-3 text-sm text-muted-foreground">
                {info.tipo === "SIMULACRO"
                  ? "Simulacro: Varios intentos disponibles."
                  : "Oficial: 1 intento disponible."}
              </div>
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="intentos">
        <DataTable table={table}>
          <DataTableToolbar table={table} />
        </DataTable>
      </TabsContent>

      <TabsContent value="charts">
        <Charts
          distribution={charts.distribution}
          topScores={charts.topScores}
          scoreTrend={charts.scoreTrend}
          timeByAttempt={charts.timeByAttempt}
          cohortDistribution={charts.cohortDistribution}
          cohortTopScores={charts.cohortTopScores}
          cohortComparison={charts.cohortComparison}
          cohortTimeComparison={charts.cohortTimeComparison}
          tipo={info.tipo}
        />
      </TabsContent>
    </Tabs>
  )
}
