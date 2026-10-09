"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import {
  TableColumnFilterRow,
  TableFilterToolbar,
  type TableFilterConfig,
  type TableFilterOption,
} from "@/app/components/table-column-filters";

export type DataTableColumn<T> = {
  key: keyof T & string;
  label: string;
  align?: "left" | "center" | "right";
  format?: "text" | "amount" | "period";
};

export type DataTableHeaderCell = {
  label: string;
  colSpan?: number;
  rowSpan?: number;
  align?: "left" | "center" | "right";
};

export type DataTableProps<T> = {
  endpoint: string;
  columns: DataTableColumn<T>[];
  filters?: TableFilterConfig[];
  headerRows?: DataTableHeaderCell[][];
  pageSize?: number;
  rowKeyFields: (keyof T & string)[];
};

type ApiResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  options?: Record<string, TableFilterOption[]>;
};

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function getRowValue<T>(row: T, key: keyof T & string): unknown {
  return (row as Record<string, unknown>)[key];
}

export default function DataTable<T>({
  endpoint,
  columns,
  filters = [],
  headerRows,
  pageSize = 10,
  rowKeyFields,
}: DataTableProps<T>) {
  const initialFilters = useMemo(
    () =>
      Object.fromEntries(
        filters.map((filter) => [filter.key, ""]),
      ) as Record<string, string>,
    [filters],
  );

  const [filterValues, setFilterValues] =
    useState<Record<string, string>>(initialFilters);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<ApiResponse<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(
    async (values: Record<string, string>, requestedPage: number) => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...values,
            page: requestedPage,
          }),
        });

        const payload = (await response.json()) as ApiResponse<T> & {
          message?: string;
        };

        if (!response.ok) {
          throw new Error(payload.message ?? "Gagal mengambil data.");
        }

        setResult(payload);
        setPage(payload.pagination.page);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat mengambil data.",
        );
      } finally {
        setLoading(false);
      }
    },
    [endpoint],
  );

  // Load initial data once per endpoint/filter configuration.
  useEffect(() => {
    setFilterValues(initialFilters);
    setPage(1);
    void loadData(initialFilters, 1);
  }, [loadData, initialFilters]);

  const handleFilterChange = useCallback(
    (key: string, value: string) => {
      const nextValues = { ...filterValues, [key]: value };
      setFilterValues(nextValues);
      setPage(1);
      void loadData(nextValues, 1);
    },
    [filterValues, loadData],
  );

  const handleReset = useCallback(() => {
    setFilterValues(initialFilters);
    setPage(1);
    void loadData(initialFilters, 1);
  }, [initialFilters, loadData]);

  const handlePageChange = (nextPage: number) => {
    if (
      !result ||
      nextPage < 1 ||
      nextPage > result.pagination.totalPages ||
      loading
    ) {
      return;
    }

    void loadData(filterValues, nextPage);
  };

  const activeFilters = Object.values(filterValues).some(
    (value) => value !== "",
  );
  const rows = result?.data ?? [];
  const pagination = result?.pagination;
  const options = result?.options ?? {};

  const resolvedFilters = useMemo(
    () =>
      filters.map((filter) => ({
        ...filter,
        columnKey:
          filter.columnKey ??
          (columns.some((column) => column.key === filter.key)
            ? filter.key
            : filter.key === "position" && columns.some((column) => column.key === "position_name")
              ? "position_name"
              : filter.key === "period" && columns.some((column) => column.key === "month")
                ? "month"
                : filter.key),
        // Supports APIs that return options under plural keys, e.g. positions/periods.
        options:
          options[`${filter.key}s`] ??
          options[filter.key] ??
          filter.options ??
          [],
      })),
    [filters, options, columns],
  );

  const startItem =
    rows.length === 0 ? 0 : (page - 1) * (pagination?.pageSize ?? pageSize) + 1;
  const endItem = Math.min(
    (page - 1) * (pagination?.pageSize ?? pageSize) + rows.length,
    pagination?.totalItems ?? 0,
  );

  function renderCellValue(row: T, column: DataTableColumn<T>): ReactNode {
    const value = getRowValue(row, column.key);

    if (column.format === "amount") {
      return value === null || value === undefined
        ? "—"
        : Number(value).toLocaleString("id-ID");
    }

    if (column.format === "period") {
      const item = row as Record<string, unknown>;
      const month = Number(item.month);
      const year = Number(item.year);

      return month >= 1 && month <= 12
        ? `${MONTHS[month - 1]} ${year}`
        : "—";
    }

    return String(value ?? "—");
  }

  return (
    <div className="card">
      <TableFilterToolbar
        hasActiveFilters={activeFilters}
        onReset={handleReset}
      />

      {error && (
        <div className="empty-state" role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="filter-button"
            onClick={() => void loadData(filterValues, page)}
          >
            Coba Lagi
          </button>
        </div>
      )}

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            {headerRows ? (
              headerRows.map((headerRow, rowIndex) => (
                <tr key={`header-${rowIndex}`}>
                  {rowIndex === 0 && filters.length > 0 && (
                    <th
                      key="table-filter-reset-heading"
                      className="table-column-filter-reset-heading"
                      rowSpan={headerRows.length}
                      aria-label="Reset filter"
                    />
                  )}
                  {headerRow.map((cell, cellIndex) => (
                    <th
                      key={`${rowIndex}-${cellIndex}`}
                      colSpan={cell.colSpan}
                      rowSpan={cell.rowSpan}
                      className={
                        cell.align === "right"
                          ? "text-right"
                          : cell.align === "center"
                            ? "text-center"
                            : undefined
                      }
                    >
                      {cell.label}
                    </th>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                {filters.length > 0 && (
                  <th
                    key="table-filter-reset-heading"
                    className="table-column-filter-reset-heading"
                    aria-label="Reset filter"
                  />
                )}
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={
                      column.align === "right"
                        ? "text-right"
                        : column.align === "center"
                          ? "text-center"
                          : undefined
                    }
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            )}

            {filters.length > 0 && (
              <TableColumnFilterRow
                filters={resolvedFilters}
                values={filterValues}
                onChange={handleFilterChange}
                columnKeys={columns.map((column) => column.key)}
                onReset={handleReset}
              />
            )}
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + (filters.length > 0 ? 1 : 0)} className="text-center">
                  Memuat data...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (filters.length > 0 ? 1 : 0)} className="text-center">
                  {activeFilters
                    ? "Tidak ada data yang sesuai dengan filter."
                    : "Belum ada data."}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const rowKey = rowKeyFields
                  .map((key) => String(getRowValue(row, key) ?? ""))
                  .join("-");

                return (
                  <tr key={rowKey}>
                    {filters.length > 0 && (
                      <td className="table-column-filter-reset-cell" aria-hidden="true" />
                    )}
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={
                          column.align === "right"
                            ? "text-right"
                            : column.align === "center"
                              ? "text-center"
                              : undefined
                        }
                      >
                        {renderCellValue(row, column)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <span className="table-info">
          Menampilkan {startItem}–{endItem} dari{" "}
          {pagination?.totalItems ?? 0} data
        </span>

        {pagination && pagination.totalPages > 1 && (
          <div className="pagination">
            <button
              type="button"
              className={`pagination-button ${page <= 1 ? "disabled" : ""}`}
              disabled={page <= 1 || loading}
              onClick={() => handlePageChange(page - 1)}
            >
              Sebelumnya
            </button>

            <span className="pagination-button active">
              {page} / {pagination.totalPages}
            </span>

            <button
              type="button"
              className={`pagination-button ${
                page >= pagination.totalPages ? "disabled" : ""
              }`}
              disabled={page >= pagination.totalPages || loading}
              onClick={() => handlePageChange(page + 1)}
            >
              Berikutnya
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
