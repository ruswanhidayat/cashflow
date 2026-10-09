
"use client";

import { useCallback, useEffect, useState } from "react";

import {
  TableColumnFilterRow,
  TableFilterToolbar,
  type TableFilterConfig,
  type TableFilterOption,
} from "@/app/components/table-column-filters";

const PAGE_SIZE = 10;

const MONTHS = [
  "Januari", "Februari", "Maret", "April",
  "Mei", "Juni", "Juli", "Agustus",
  "September", "Oktober", "November", "Desember",
];

type BillRow = {
  user_id: number;
  name: string;
  position_name: string | null;
  period_id: number;
  year: number;
  month: number;
  cash_amount: number | string | null;
  pgb_amount: number | string | null;
};

type ApiResponse = {
  data: BillRow[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  options: {
    positions: TableFilterOption[];
    periods: TableFilterOption[];
  };
};

type BillsTableProps = {
  initialError?: string;
};

function formatAmount(amount: number | string | null) {
  if (amount === null || amount === undefined) {
    return "—";
  }

  return Number(amount).toLocaleString("id-ID");
}

export default function BillsTable({
  initialError,
}: BillsTableProps) {
  const [filters, setFilters] = useState({
    name: "",
    position: "",
    period: "",
  });

  const [page, setPage] = useState(1);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(initialError ?? "");

  const loadData = useCallback(async (
    nextFilters: typeof filters,
    nextPage: number
  ) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/bills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...nextFilters,
          page: nextPage,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload.message ?? "Gagal mengambil data tagihan."
        );
      }

      setResult(payload as ApiResponse);
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
  }, []);

  useEffect(() => {
    void loadData(filters, 1);
  }, [loadData]);

  function changeFilter(key: string, value: string) {
    const nextFilters = {
      ...filters,
      [key]: value,
    };

    setFilters(nextFilters);
    setPage(1);
    void loadData(nextFilters, 1);
  }

  function resetFilters() {
    const emptyFilters = {
      name: "",
      position: "",
      period: "",
    };

    setFilters(emptyFilters);
    setPage(1);
    void loadData(emptyFilters, 1);
  }

  function goToPage(nextPage: number) {
    if (
      !result ||
      nextPage < 1 ||
      nextPage > result.pagination.totalPages
    ) {
      return;
    }

    void loadData(filters, nextPage);
  }

  const filterConfigs: TableFilterConfig[] = [
    {
      key: "name",
      type: "text",
      placeholder: "Cari nama...",
    },
    {
      key: "position",
      type: "select",
      placeholder: "Semua posisi",
      options: result?.options.positions ?? [],
    },
    {
      key: "period",
      type: "select",
      placeholder: "Semua periode",
      options: result?.options.periods ?? [],
    },
  ];

  const hasActiveFilters = Object.values(filters).some(
    (value) => value !== ""
  );

  const bills = result?.data ?? [];
  const pagination = result?.pagination;

  const startItem =
    bills.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;

  const endItem = Math.min(
    (page - 1) * PAGE_SIZE + bills.length,
    pagination?.totalItems ?? 0
  );

  return (
    <div className="card">
      <TableFilterToolbar
        hasActiveFilters={hasActiveFilters}
        onReset={resetFilters}
      />

      {error && (
        <div className="empty-state" role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="filter-button"
            onClick={() => void loadData(filters, page)}
          >
            Coba Lagi
          </button>
        </div>
      )}

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th rowSpan={2}>Nama</th>
              <th rowSpan={2}>Posisi</th>
              <th rowSpan={2}>Periode</th>
              <th colSpan={2} className="text-center">
                Tagihan
              </th>
            </tr>
            <tr>
              <th className="text-right">Tagihan Kas</th>
              <th className="text-right">Tagihan Paguyuban</th>
            </tr>
            <TableColumnFilterRow
              filters={filterConfigs}
              values={filters}
              onChange={changeFilter}
              columnCount={5}
            />
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center">
                  Memuat data...
                </td>
              </tr>
            ) : bills.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center">
                  {hasActiveFilters
                    ? "Tidak ada data yang sesuai dengan filter."
                    : "Belum ada data tagihan."}
                </td>
              </tr>
            ) : (
              bills.map((bill) => (
                <tr
                  key={`${bill.user_id}-${bill.period_id}`}
                >
                  <td>{bill.name}</td>
                  <td>{bill.position_name ?? "—"}</td>
                  <td>
                    {MONTHS[bill.month - 1]} {bill.year}
                  </td>
                  <td className="text-right">
                    {formatAmount(bill.cash_amount)}
                  </td>
                  <td className="text-right">
                    {formatAmount(bill.pgb_amount)}
                  </td>
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
              onClick={() => goToPage(page - 1)}
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
              onClick={() => goToPage(page + 1)}
            >
              Berikutnya
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
