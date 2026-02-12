"use client"

import React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
  ItemDescription,
} from "@/components/ui/item"
import { Input } from "@/components/ui/input"
import { Calendar, Clock, History } from "lucide-react"

export type EvaluacionListItem = {
  id: string
  cursoTitulo: string
  evaluacion: {
    id: string
    titulo: string
    tipo: string
    gestion: number
    tiempoSegundos: number
    intentos: number
  }
}



export default function EvaluacionesListClient({ items }: { items: EvaluacionListItem[] }) {
  const [query, setQuery] = React.useState("")

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) =>
      item.evaluacion.titulo.toLowerCase().includes(q)
    )
  }, [items, query])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Input
          placeholder="Buscar evaluación..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="max-w-sm"
        />
        <span className="text-xs text-muted-foreground">
          {filtered.length} resultado(s)
        </span>
      </div>

      <ItemGroup className="rounded-xl border bg-card text-card-foreground shadow-sm">
        {filtered.map((item, index) => (
          <div key={item.id}>
            <Item size="sm" className="px-5 py-4">
              <ItemContent className="gap-2">
                <div className="flex flex-col gap-1">
                  <Link href={`/dashboard/evaluaciones/${item.evaluacion.id}`}>
                    <ItemTitle className="text-base font-semibold leading-tight line-clamp-2">
                      {item.evaluacion.titulo}
                    </ItemTitle>
                  </Link>
                  <ItemDescription className="line-clamp-1 text-xs">
                    Curso: {item.cursoTitulo}
                  </ItemDescription>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                  <Badge variant="outline" >
                    {item.evaluacion.tipo}
                  </Badge>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
                    <span>{item.evaluacion.gestion}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />
                    <span>{Math.max(1, Math.round(item.evaluacion.tiempoSegundos / 60))} min</span>
                  </div>
                  {item.evaluacion.tipo === "SIMULACRO" && (
                    <div className="flex items-center gap-1.5">
                      <History className="h-3.5 w-3.5 text-muted-foreground/70" />
                      <span>{item.evaluacion.intentos} intentos</span>
                    </div>
                  )}
                </div>
              </ItemContent>
              <ItemActions>
                <Button
                  size="sm"
                  render={<Link href={`/dashboard/evaluaciones/${item.evaluacion.id}`} />}
                >
                  Ver detalle
                </Button>
              </ItemActions>
            </Item>
            {index < filtered.length - 1 && <ItemSeparator className="mx-4" />}
          </div>
        ))}
      </ItemGroup>
    </div>
  )
}

