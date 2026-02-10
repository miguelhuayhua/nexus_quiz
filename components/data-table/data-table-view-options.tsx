"use client";

import type { Table } from "@tanstack/react-table";
import { Check, ListRestart, Settings2 } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DataTableViewOptionsProps<TData>
  extends React.ComponentProps<typeof PopoverContent> {
  table: Table<TData>;
  disabled?: boolean;
}

export function DataTableViewOptions<TData>({
  table,
  disabled,
  ...props
}: DataTableViewOptionsProps<TData>) {
  const [open, setOpen] = React.useState(false);

  const columns = React.useMemo(
    () =>
      table
        .getAllColumns()
        .filter(
          (column) =>
            typeof column.accessorFn !== "undefined" && column.getCanHide(),
        ),
    [table],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Button
        aria-label="Toggle columns"
        role="combobox"
        variant="outline"
        size="sm"
        disabled={disabled}
        render={<PopoverTrigger />}
      >
        <Settings2 />
        Ver
      </Button>
      <PopoverContent className="w-48 p-0" {...props}>
        <Command>
          <CommandInput placeholder="Buscar columnas..." />
          <CommandList>
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  table.resetSorting();
                }}
              >
                <ListRestart />
                <span>Reset sort</span>
              </CommandItem>
            </CommandGroup>
            <CommandGroup>
              <CommandEmpty>Sin columnas.</CommandEmpty>
              {columns.map((column) => (
                <CommandItem
                  key={column.id}
                  onSelect={() => column.toggleVisibility(!column.getIsVisible())}
                >
                  <span className="truncate">
                    {column.columnDef.meta?.label ?? column.id}
                  </span>
                  <Check
                    className={cn(
                      "ml-auto size-4 shrink-0",
                      column.getIsVisible() ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
