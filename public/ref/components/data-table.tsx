import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface Column<T> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string;
  headClassName?: string;
}

export function DataTable<T>({
  rows,
  columns,
  getRowId,
  searchText,
  searchPlaceholder = "Search",
  onRowClick,
  rowActions,
  selectedIds,
  onSelectedChange,
  toolbar,
  bulkActions,
  pageSize = 10,
  empty,
  defaultSort,
}: {
  rows: T[];
  columns: Column<T>[];
  getRowId: (row: T) => string;
  searchText?: (row: T) => string;
  searchPlaceholder?: string;
  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => ReactNode;
  selectedIds?: string[];
  onSelectedChange?: (ids: string[]) => void;
  toolbar?: ReactNode;
  bulkActions?: ReactNode;
  pageSize?: number;
  empty?: ReactNode;
  defaultSort?: { columnId: string; dir: "asc" | "desc" };
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ columnId: string; dir: "asc" | "desc" } | null>(
    defaultSort ?? null,
  );
  const [page, setPage] = useState(0);
  const selectable = Boolean(selectedIds && onSelectedChange);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = rows;
    if (q && searchText) out = out.filter((r) => searchText(r).toLowerCase().includes(q));
    if (sort) {
      const col = columns.find((c) => c.id === sort.columnId);
      if (col?.sortValue) {
        out = [...out].sort((a, b) => {
          const av = col.sortValue!(a);
          const bv = col.sortValue!(b);
          const cmp = typeof av === "number" && typeof bv === "number"
            ? av - bv
            : String(av).localeCompare(String(bv));
          return sort.dir === "asc" ? cmp : -cmp;
        });
      }
    }
    return out;
  }, [rows, query, searchText, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(current * pageSize, current * pageSize + pageSize);
  const pageIds = pageRows.map(getRowId);
  const allSelected = selectable && pageIds.length > 0 && pageIds.every((id) => selectedIds!.includes(id));

  function toggleSort(columnId: string) {
    setSort((s) =>
      s?.columnId === columnId
        ? { columnId, dir: s.dir === "asc" ? "desc" : "asc" }
        : { columnId, dir: "asc" },
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {searchText ? (
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder={searchPlaceholder}
              className="h-8 pl-8 text-sm"
              aria-label={searchPlaceholder}
            />
          </div>
        ) : null}
        {toolbar}
      </div>

      {selectable && selectedIds!.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
          <span className="text-muted-foreground">{selectedIds!.length} selected</span>
          <div className="ml-auto flex items-center gap-2">{bulkActions}</div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {selectable ? (
                <TableHead className="h-9 w-9">
                  <Checkbox
                    checked={allSelected}
                    aria-label="Select all rows on this page"
                    onCheckedChange={(v) => {
                      const next = new Set(selectedIds);
                      if (v) pageIds.forEach((id) => next.add(id));
                      else pageIds.forEach((id) => next.delete(id));
                      onSelectedChange!([...next]);
                    }}
                  />
                </TableHead>
              ) : null}
              {columns.map((col) => (
                <TableHead
                  key={col.id}
                  className={cn("h-9 whitespace-nowrap text-xs", col.headClassName)}
                >
                  {col.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.id)}
                      className="inline-flex items-center gap-1 rounded-sm text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {col.header}
                      {sort?.columnId === col.id ? (
                        sort.dir === "asc" ? (
                          <ArrowUp className="size-3" />
                        ) : (
                          <ArrowDown className="size-3" />
                        )
                      ) : (
                        <ChevronsUpDown className="size-3 opacity-50" />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </TableHead>
              ))}
              {rowActions ? <TableHead className="h-9 w-10" /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  {empty ?? "No results."}
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((row) => {
                const id = getRowId(row);
                return (
                  <TableRow
                    key={id}
                    data-state={selectable && selectedIds!.includes(id) ? "selected" : undefined}
                    className={cn(onRowClick && "cursor-pointer")}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {selectable ? (
                      <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds!.includes(id)}
                          aria-label="Select row"
                          onCheckedChange={(v) => {
                            const next = new Set(selectedIds);
                            if (v) next.add(id);
                            else next.delete(id);
                            onSelectedChange!([...next]);
                          }}
                        />
                      </TableCell>
                    ) : null}
                    {columns.map((col) => (
                      <TableCell key={col.id} className={cn("py-2 text-sm", col.className)}>
                        {col.cell(row)}
                      </TableCell>
                    ))}
                    {rowActions ? (
                      <TableCell className="py-2 text-right" onClick={(e) => e.stopPropagation()}>
                        {rowActions(row)}
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {filtered.length} {filtered.length === 1 ? "row" : "rows"}
        </span>
        {pageCount > 1 ? (
          <div className="flex items-center gap-2">
            <span>
              Page {current + 1} of {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              disabled={current === 0}
              onClick={() => setPage(current - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              disabled={current >= pageCount - 1}
              onClick={() => setPage(current + 1)}
            >
              Next
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
