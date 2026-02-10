"use client";

import { BookIcon, RouteIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

type MarketEmptyProps = {
  tipo: "PRUEBA" | "OFICIAL";
  hasQuery: boolean;
  onSwitchTipo: () => void;
  onClearFilters: () => void;
};

export default function MarketEmpty({
  tipo,
  hasQuery,
  onSwitchTipo,
  onClearFilters,
}: MarketEmptyProps) {
  const isPrueba = tipo === "PRUEBA";

  return (
    <Empty className="rounded-xl border border-dashed bg-muted/20">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <RouteIcon />
        </EmptyMedia>
        <EmptyTitle>
          {isPrueba
            ? "No hay pruebas disponibles"
            : "No hay evaluaciones oficiales disponibles"}
        </EmptyTitle>
        <EmptyDescription>
          {hasQuery
            ? "No encontramos resultados con los filtros actuales."
            : "Aun no hay evaluaciones publicadas en esta categoria."}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={onSwitchTipo} size="sm" type="button">
            {isPrueba ? "Ver oficiales" : "Ver pruebas"}
          </Button>
          {hasQuery && (
            <Button onClick={onClearFilters} size="sm" type="button" variant="outline">
              <BookIcon />
              Limpiar filtros
            </Button>
          )}
        </div>
      </EmptyContent>
    </Empty>
  );
}
