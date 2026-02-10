"use client";

import Link from "next/link";
import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Clock3Icon, SearchIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MarketEmpty from "@/components/market-empty";
import { cn } from "@/lib/utils";
import type { MarketData } from "./page";

export default function MarketClient({
  evaluaciones,
  pagination,
}: {
  evaluaciones: MarketData["evaluaciones"];
  pagination: MarketData["pagination"];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = React.useState(pagination.q);
  const activeTipo = searchParams.get("tipo") ?? "PRUEBA";

  const buildPageHref = React.useCallback(
    (nextPage: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(nextPage));
      return `${pathname}?${params.toString()}`;
    },
    [pathname, searchParams],
  );

  const updateParams = React.useCallback(
    (updates: Record<string, string | null>, resetPage = false) => {
      const current = searchParams.toString();
      const params = new URLSearchParams(current);

      if (resetPage) {
        params.set("page", "1");
      }

      Object.entries(updates).forEach(([key, value]) => {
        if (!value) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      const next = params.toString();
      if (next === current) return;

      router.replace(`${pathname}?${next}`);
    },
    [pathname, router, searchParams],
  );

  React.useEffect(() => {
    if (query === pagination.q) return;

    const timeout = setTimeout(() => {
      updateParams({ q: query || null }, true);
    }, 250);
    return () => clearTimeout(timeout);
  }, [query, pagination.q, updateParams]);

  React.useEffect(() => {
    if (pagination.q !== query) {
      setQuery(pagination.q);
    }
  }, [pagination.q, query]);

  React.useEffect(() => {
    if (!searchParams.get("tipo")) {
      updateParams({ tipo: "PRUEBA" }, true);
    }
  }, [searchParams, updateParams]);

  const pageItems = React.useMemo(() => {
    const total = pagination.totalPages;
    const current = pagination.page;

    if (total <= 7) {
      return Array.from({ length: total }, (_, index) => index + 1);
    }

    const items: Array<number | "ellipsis"> = [1];
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    if (start > 2) {
      items.push("ellipsis");
    }

    for (let page = start; page <= end; page += 1) {
      items.push(page);
    }

    if (end < total - 1) {
      items.push("ellipsis");
    }

    items.push(total);
    return items;
  }, [pagination.page, pagination.totalPages]);

  const hasEvaluaciones = evaluaciones.length > 0;
  const showPagination = hasEvaluaciones && pagination.totalPages > 1;
  const hasQuery = query.trim().length > 0;

  return (
    <main className="mx-auto w-full space-y-4 p-6">
      <div className="flex flex-col items-center space-y-4">
        <Tabs
          onValueChange={(value) => updateParams({ tipo: value }, true)}
          value={activeTipo}
        >
          <TabsList className="mx-auto">
            <TabsTrigger value="PRUEBA">Pruebas</TabsTrigger>
            <TabsTrigger value="OFICIAL">Oficiales</TabsTrigger>
          </TabsList>
        </Tabs>

        <InputGroup className="mx-auto max-w-md">
          <InputGroupInput
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar evaluación..."
            type="search"
            value={query}
          />
          <InputGroupAddon>
            <SearchIcon aria-hidden="true" />
          </InputGroupAddon>
        </InputGroup>
      </div>

      {hasEvaluaciones ? (
        <ItemGroup>
          {evaluaciones.map((item, index) => (
            <div key={item.id}>
              <Item className="relative" size="sm" variant="outline">
                <Badge
                  className="absolute right-3 top-3 z-10"
                  variant={"success"}
                >
                  {item.tipo === "OFICIAL"
                    ? `USD ${item.precio.toFixed(2)}`
                    : "Gratis"}
                </Badge>

                <ItemContent>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">Gestión {item.gestion}</Badge>
                  </div>

                  <ItemTitle>
                    <Link href={`/market/${item.id}`}>{item.titulo}</Link>
                  </ItemTitle>

                  <ItemDescription>
                    {item.descripcion?.trim() ||
                      "Descripción no disponible por el momento."}
                  </ItemDescription>

                  <div className="flex items-center gap-2">
                    <Badge className="gap-1" variant="outline">
                      <Clock3Icon className="size-3.5" />
                      {Math.ceil(item.tiempo_segundos / 60)} min
                    </Badge>
                    <Badge variant="outline">
                      {item.temasCount} tema{item.temasCount === 1 ? "" : "s"}
                    </Badge>
                    <Badge variant="outline">
                      {item.preguntasCount} pregunta
                      {item.preguntasCount === 1 ? "" : "s"}
                    </Badge>
                    <Badge variant="outline">
                      Nota: <span className="text-destructive">{item.nota_min}</span> -{" "}
                      <span className="text-success">{item.nota_max}</span>
                    </Badge>
                  </div>
                </ItemContent>

                <ItemActions>
                  <Button
                    render={<Link href={`/market/${item.id}`} />}
                    size="sm"
                    variant="default"
                  >
                    Ver evaluación
                  </Button>
                </ItemActions>
              </Item>

              {index < evaluaciones.length - 1 && <ItemSeparator className="mx-4" />}
            </div>
          ))}
        </ItemGroup>
      ) : (
        <MarketEmpty
          hasQuery={hasQuery}
          onClearFilters={() => updateParams({ q: null }, true)}
          onSwitchTipo={() =>
            updateParams(
              { tipo: activeTipo === "PRUEBA" ? "OFICIAL" : "PRUEBA" },
              true,
            )
          }
          tipo={activeTipo === "OFICIAL" ? "OFICIAL" : "PRUEBA"}
        />
      )}

      {showPagination && (
        <div className="flex w-full justify-center pt-2">
          <Pagination className="mt-0 w-auto">
            <PaginationContent className="justify-center">
              <PaginationItem>
                <PaginationPrevious
                  className={cn(pagination.page <= 1 && "pointer-events-none opacity-50")}
                  render={<Link href={buildPageHref(Math.max(1, pagination.page - 1))} />}
                />
              </PaginationItem>

              {pageItems.map((item, index) =>
                item === "ellipsis" ? (
                  <PaginationItem key={`ellipsis-${index}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={item}>
                    <PaginationLink
                      isActive={item === pagination.page}
                      render={<Link href={buildPageHref(item)} />}
                    >
                      {item}
                    </PaginationLink>
                  </PaginationItem>
                ),
              )}

              <PaginationItem>
                <PaginationNext
                  className={cn(
                    pagination.page >= pagination.totalPages &&
                      "pointer-events-none opacity-50",
                  )}
                  render={
                    <Link
                      href={buildPageHref(
                        Math.min(pagination.totalPages, pagination.page + 1),
                      )}
                    />
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </main>
  );
}
