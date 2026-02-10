import type { Column } from "@tanstack/react-table";

import { dataTableConfig } from "@/config/data-table";
import type { FilterOperator, FilterVariant } from "@/types/data-table";

export function getCommonPinningStyles<TData>(params: {
  column: Column<TData, unknown>;
}): React.CSSProperties {
  const { column } = params;
  const isPinned = column.getIsPinned();

  if (!isPinned) return {};

  const isLastLeftPinnedColumn =
    isPinned === "left" && column.getIsLastColumn("left");
  const isFirstRightPinnedColumn =
    isPinned === "right" && column.getIsFirstColumn("right");

  return {
    position: "sticky",
    left: isPinned === "left" ? `${column.getStart("left")}px` : undefined,
    right:
      isPinned === "right" ? `${column.getAfter("right")}px` : undefined,
    zIndex: 20,
    background: "var(--color-card)",
    boxShadow: isLastLeftPinnedColumn
      ? "2px 0 0 var(--color-border)"
      : isFirstRightPinnedColumn
        ? "-2px 0 0 var(--color-border)"
        : undefined,
  };
}

export function getDefaultFilterOperator(
  variant: FilterVariant,
): FilterOperator {
  switch (variant) {
    case "text":
      return "iLike";
    case "number":
    case "range":
      return "eq";
    case "date":
    case "dateRange":
      return "eq";
    case "boolean":
      return "eq";
    case "select":
      return "eq";
    case "multiSelect":
      return "inArray";
    default:
      return "eq";
  }
}

export function getFilterOperators(variant: FilterVariant) {
  switch (variant) {
    case "text":
      return dataTableConfig.textOperators;
    case "number":
    case "range":
      return dataTableConfig.numericOperators;
    case "date":
    case "dateRange":
      return dataTableConfig.dateOperators;
    case "boolean":
      return dataTableConfig.booleanOperators;
    case "select":
      return dataTableConfig.selectOperators;
    case "multiSelect":
      return dataTableConfig.multiSelectOperators;
    default:
      return dataTableConfig.textOperators;
  }
}
