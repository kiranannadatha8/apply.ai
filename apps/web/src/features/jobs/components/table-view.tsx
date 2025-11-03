import { useEffect, useMemo, useState } from "react";
import type {
  ColumnDef,
  ColumnSizingState,
  RowSelectionState,
  Column,
  Table,
} from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Download,
  Settings2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  EyeOff,
} from "lucide-react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { BoardFilters, JobListParams } from "../api";
import { useJobListQuery } from "../hooks";
import type { JobRecord, JobStatus } from "../types";
import { useJobUIPrefs } from "@/stores/job-prefs";
import { BOARD_STAGE_CONFIG } from "../board/stage-config";
// Color styles for stage badges (slate theme friendly)
const STAGE_BADGE_STYLES: Record<string, string> = {
  SAVED: "border-slate-700 bg-slate-800/60 text-slate-200",
  APPLIED: "border-blue-700 bg-blue-500/15 text-blue-300",
  INTERVIEW: "border-amber-700 bg-amber-500/15 text-amber-300",
  OFFER: "border-emerald-700 bg-emerald-500/15 text-emerald-300",
  REJECTED: "border-rose-700 bg-rose-500/15 text-rose-300",
};
import {
  Table as ReactTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface JobTableViewProps {
  filters?: BoardFilters;
  stageFilters?: JobStatus[];
  onSelectJob?: (id: string) => void;
  selectedJobId?: string | null;
}

export function JobTableView({
  filters = {},
  stageFilters,
  onSelectJob,
  selectedJobId,
}: JobTableViewProps) {
  const {
    tableColumnVisibility,
    setTableColumnVisibility,
    tableColumnWidths,
    setTableColumnSizing,
    density,
  } = useJobUIPrefs();

  const listParams = useMemo<JobListParams>(() => {
    const params: JobListParams = { limit: 500 };
    if (filters.q) params.q = filters.q;
    if (filters.tags) params.tag = filters.tags;
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
    if (stageFilters && stageFilters.length) {
      params.status = stageFilters.join(",");
    }
    if ("workspaceId" in filters && filters.workspaceId) {
      params.workspaceId = filters.workspaceId;
    }
    return params;
  }, [filters, stageFilters]);

  const { data, isLoading, error } = useJobListQuery(listParams, {
    staleTime: 30_000,
  });
  const jobs = data?.items ?? [];

  const columns = useMemo<ColumnDef<JobRecord>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllRowsSelected()}
            onCheckedChange={(checked) =>
              table.toggleAllRowsSelected(Boolean(checked))
            }
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(checked) => row.toggleSelected(Boolean(checked))}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select job ${row.original.title}`}
          />
        ),
        size: 44,
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: "title",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column as unknown as Column<JobRecord, unknown>}
            title="Title"
          />
        ),
        accessorKey: "title",
        size: 260,
        cell: ({ row }) => (
          <div>
            <div>{toStartCase(row.original.title)}</div>
            <div className="text-slate-400">
              {toStartCase(row.original.companyName)}
            </div>
          </div>
        ),
      },
      {
        id: "status",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column as unknown as Column<JobRecord, unknown>}
            title="Stage"
          />
        ),
        accessorKey: "status",
        size: 140,
        cell: ({ row }) => {
          const status = row.original.status;
          const config = BOARD_STAGE_CONFIG[status] ?? BOARD_STAGE_CONFIG.SAVED;
          const colorClass =
            STAGE_BADGE_STYLES[(status as unknown as string) ?? "SAVED"] ??
            STAGE_BADGE_STYLES.SAVED;
          return (
            <Badge variant="outline" className={colorClass}>
              {toStartCase(config.label)}
            </Badge>
          );
        },
      },
      {
        id: "location",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column as unknown as Column<JobRecord, unknown>}
            title="Location"
          />
        ),
        accessorKey: "location",
        size: 180,
        cell: ({ row }) => toStartCase(row.original.location ?? "Remote"),
      },
      {
        id: "tags",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column as unknown as Column<JobRecord, unknown>}
            title="Tags"
          />
        ),
        accessorFn: (row) => row.tags.join(", ") || "—",
        size: 200,
        cell: ({ row }) => {
          const tags = row.original.tags ?? [];
          if (!tags.length) return "—";
          return (
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {toStartCase(tag)}
                </Badge>
              ))}
            </div>
          );
        },
      },
      {
        id: "source",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column as unknown as Column<JobRecord, unknown>}
            title="Source"
          />
        ),
        accessorKey: "sourceKind",
        size: 140,
        cell: ({ row }) =>
          row.original.sourceKind ? toStartCase(row.original.sourceKind) : "—",
      },
      {
        id: "appliedAt",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column as unknown as Column<JobRecord, unknown>}
            title="Applied"
          />
        ),
        accessorKey: "appliedAt",
        size: 140,
        cell: ({ row }) => {
          if (row.original.status === "SAVED")
            return toStartCase("yet to apply");
          return formatDateOrdinal(row.original.appliedAt);
        },
      },
      {
        id: "updatedAt",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column as unknown as Column<JobRecord, unknown>}
            title="Updated"
          />
        ),
        accessorKey: "updatedAt",
        size: 140,
        cell: ({ row }) => formatDateOrdinal(row.original.updatedAt),
      },
      {
        id: "jobUrl",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column as unknown as Column<JobRecord, unknown>}
            title="Link"
          />
        ),
        accessorKey: "jobUrl",
        size: 120,
        cell: ({ row }) =>
          row.original.jobUrl ? (
            <a
              className="text-blue-500 hover:underline"
              href={row.original.jobUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open
            </a>
          ) : (
            "—"
          ),
      },
    ],
    [],
  );

  const [columnVisibility, setColumnVisibility] = useState(
    () => tableColumnVisibility,
  );
  const [columnSizing, setColumnSizing] =
    useState<ColumnSizingState>(tableColumnWidths);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  useEffect(() => {
    setColumnVisibility(tableColumnVisibility);
  }, [tableColumnVisibility]);

  useEffect(() => {
    setColumnSizing(tableColumnWidths);
  }, [tableColumnWidths]);

  const table = useReactTable({
    data: jobs,
    columns,
    state: {
      columnVisibility,
      columnSizing,
      rowSelection,
    },
    onColumnVisibilityChange: (updater) => {
      setColumnVisibility((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        Object.entries(next).forEach(([key, value]) =>
          setTableColumnVisibility(key, value as boolean),
        );
        return next;
      });
    },
    onColumnSizingChange: (updater) => {
      setColumnSizing((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        setTableColumnSizing(next as Record<string, number>);
        return next;
      });
    },
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 20 },
    },
    columnResizeMode: "onChange",
    enableSorting: true,
    enableRowSelection: true,
  });

  const rows = table.getRowModel().rows;

  const exportCsv = () => {
    const csv = Papa.unparse(
      jobs.map((job) => ({
        Stage: statusLabel(job.status),
        Title: job.title,
        Company: job.companyName,
        Location: job.location ?? "Remote",
        Tags: job.tags.join("; "),
        Source: job.sourceKind ?? "",
        Applied: formatDate(job.appliedAt),
        Updated: formatDate(job.updatedAt),
        Link: job.jobUrl ?? "",
      })),
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "applyai-jobs.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading && !jobs.length) {
    return <TableSkeleton />;
  }

  return (
    <div className="flex h-[calc(100vh-220px)] flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          {jobs.length} jobs · {density === "compact" ? "Compact" : "Comfort"}{" "}
          rows
        </div>
        <div className="flex items-center gap-2">
          <DataTableViewOptions table={table as unknown as Table<JobRecord>} />
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="size-4" /> Export CSV
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <ReactTable>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={() => onSelectJob?.(row.original.id)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={table.getAllLeafColumns().length}>
                  {error ? "Unable to load jobs." : "No results."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </ReactTable>
        <DataTablePagination table={table as unknown as Table<JobRecord>} />
      </div>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return date.toLocaleDateString();
}

function formatDateOrdinal(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (isNaN(date.valueOf())) return "—";
  const day = date.getDate();
  const mod10 = day % 10;
  const mod100 = day % 100;
  const suffix =
    mod10 === 1 && mod100 !== 11
      ? "st"
      : mod10 === 2 && mod100 !== 12
        ? "nd"
        : mod10 === 3 && mod100 !== 13
          ? "rd"
          : "th";
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${day}${suffix} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function toStartCase(input?: string | null): string {
  if (!input) return "—";
  return input.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

function statusLabel(status: JobRecord["status"]) {
  switch (status) {
    case "SAVED":
      return "Saved";
    case "APPLIED":
      return "Applied";
    case "INTERVIEW":
      return "Interview";
    case "OFFER":
      return "Offer";
    case "REJECTED":
      return "Rejected";
    default:
      return status ?? "—";
  }
}

function TableSkeleton() {
  return (
    <div className="flex h-[calc(100vh-220px)] flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="h-4 w-32 animate-pulse rounded bg-slate-800/60" />
        <div className="h-8 w-28 animate-pulse rounded-full bg-slate-800/60" />
      </div>
      <div className="flex-1 overflow-hidden rounded-2xl border border-slate-800">
        <div className="space-y-2 p-4">
          {Array.from({ length: 10 }).map((_, index) => (
            <div
              key={index}
              className="h-12 animate-pulse rounded bg-slate-800/50"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ——— Reference-based helpers (inlined for now) ———
interface DataTablePaginationProps<TData> {
  table: Table<TData>;
}

function DataTablePagination<TData>({
  table,
}: DataTablePaginationProps<TData>) {
  return (
    <div className="flex items-center justify-between px-2 py-2">
      <div className="flex-1 text-sm">
        {table.getFilteredSelectedRowModel().rows.length} of{" "}
        {table.getFilteredRowModel().rows.length} row(s) selected.
      </div>
      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 25, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            className="hidden size-8 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="hidden size-8 lg:flex"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
}

function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={className}>{title}</div>;
  }
  return (
    <div className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <span>{title}</span>
            {column.getIsSorted() === "desc" ? (
              <ArrowDown />
            ) : column.getIsSorted() === "asc" ? (
              <ArrowUp />
            ) : (
              <ChevronsUpDown />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
            <ArrowUp />
            Asc
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
            <ArrowDown />
            Desc
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
            <EyeOff />
            Hide
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function DataTableViewOptions<TData>({ table }: { table: Table<TData> }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto hidden h-8 lg:flex"
        >
          <Settings2 />
          View
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[150px]">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table
          .getAllColumns()
          .filter(
            (column) =>
              typeof column.accessorFn !== "undefined" && column.getCanHide(),
          )
          .map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              className="capitalize"
              checked={column.getIsVisible()}
              onCheckedChange={(value) => column.toggleVisibility(!!value)}
            >
              {column.id}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
