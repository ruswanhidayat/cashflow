
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
  key: string;
  label: string;
  align?: "left" | "center" | "right";
  render?: (row: T) => ReactNode;
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
  getRowKey: (row: T) => string | number;
  filters?: TableFilterConfig[];
  headerRows?: DataTableHeaderCell[][];
  pageSize?: number;
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

export default function DataTable<T>({
  endpoint,
  columns,
  getRowKey,
  filters = [],
  headerRows,
  pageSize = 10,
}: DataTableProps<T>) {
  const initialFilters = useMemo(
    () =>
      Object.fromEntries(
        filters.map((filter) => [filter.key, ""])
      ) as Record<string, string>,
    [filters]
  );

  const [filterValues, setFilterValues] =
    useState<Record<string, string>>(initialFilters);

  const [page, setPage] = useState(1);
  const [result, setResult] = useState<ApiResponse<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(
    async (
      values: Record<string, string>,
      requestedPage: number
    ) => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...values,
            page: requestedPage,
          }),
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(
            payload.message ?? "Gagal mengambil data."
          );
        }

        setResult(payload as ApiResponse<T>);
        setPage(payload.pagination.page);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat mengambil data."
        );
      } finally {
        setLoading(false);
      }
    },
    [endpoint]
  );

  useEffect(() => {
    void loadData(initialFilters, 1);
  }, [loadData, initialFilters]);

  const handleFilterChange = useCallback(
    (key: string, value: string) => {
      const nextValues = {
        ...filterValues,
        [key]: value,
      };

      setFilterValues(nextValues);
      setPage(1);
      void loadData(nextValues, 1);
    },
    [filterValues, loadData]
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
      nextPage > result.pagination.totalPages
    ) {
      return;
    }

    void loadData(filterValues, nextPage);
  };

  const activeFilters = Object.values(filterValues).some(
    (value) => value !== ""
  );

  const rows = result?.data ?? [];
  const pagination = result?.pagination;
  const options = result?.options ?? {};

  const resolvedFilters = useMemo(
    () =>
      filters.map((filter) => ({
        ...filter,
        options: options[filter.key] ?? filter.options ?? [],
      })),
    [filters, options]
  );

  const startItem =
    rows.length === 0 ? 0 : (page - 1) * pageSize + 1;

  const endItem = Math.min(
    (page - 1) * pageSize + rows.length,
    pagination?.totalItems ?? 0
  );

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
                columnCount={columns.length}
              />
            )}
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="text-center">
                  Memuat data...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center">
                  {activeFilters
                    ? "Tidak ada data yang sesuai dengan filter."
                    : "Belum ada data."}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={getRowKey(row)}>
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
                      {column.render
                        ? column.render(row)
                        : String(
                        (row as unknown as Record<string, unknown>)[
                            column.key
                        ] ?? "—"
                        )}
                    </td>
                  ))}
                </tr>
              ))
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
              className={`pagination-button ${
                page <= 1 ? "disabled" : ""
              }`}
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
              disabled={
                page >= pagination.totalPages || loading
              }
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
