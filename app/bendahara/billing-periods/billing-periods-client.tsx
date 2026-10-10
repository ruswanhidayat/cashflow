"use client";

import { useCallback, useEffect, useState } from "react";

import DataFilter, {
  type DataFilterField,
} from "@/app/components/data-filter";
import GeneratePeriodButton from "./generate-period-button";
import GenerateBillsButton from "./generate-bills-button";

type BillingPeriod = {
  id: number;
  year: number;
  month: number;
  start_date: string;
  end_date: string;
  status: string;
  bill_generation_status: string;
};

type YearOption = {
  value: string;
  label: string;
};

type SearchResponse = {
  data: BillingPeriod[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  options: {
    years: YearOption[];
  };
  message?: string;
};

type Filters = {
  year: string;
  month: string;
  status: string;
};

const initialFilters: Filters = {
  year: "",
  month: "",
  status: "",
};

const monthNames = [
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

const statusOptions = [
  { value: "", label: "Semua status" },
  { value: "DRAFT", label: "Draft" },
  { value: "OPEN", label: "Open" },
  { value: "CLOSED", label: "Closed" },
];

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export default function BillingPeriodsClient() {
  const [filters, setFilters] =
    useState<Filters>(initialFilters);

  const [page, setPage] = useState(1);

  const [periods, setPeriods] =
    useState<BillingPeriod[]>([]);

  const [years, setYears] = useState<YearOption[]>([]);

  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPeriods = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/billing-periods/search",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...filters,
            page,
          }),
        }
      );

      const result =
        (await response.json()) as SearchResponse;

      if (!response.ok) {
        throw new Error(
          result.message ??
            "Gagal mengambil data billing period."
        );
      }

      setPeriods(result.data);
      setYears(result.options.years);
      setPagination(result.pagination);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat mengambil data."
      );
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    void fetchPeriods();
  }, [fetchPeriods]);

  const filterFields: DataFilterField[] = [
    {
      key: "year",
      label: "Tahun",
      type: "select",
      options: [
        { value: "", label: "Semua tahun" },
        ...years,
      ],
    },
    {
      key: "month",
      label: "Bulan",
      type: "select",
      options: [
        { value: "", label: "Semua bulan" },
        ...monthNames.map((name, index) => ({
          value: String(index + 1),
          label: name,
        })),
      ],
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: statusOptions,
    },
  ];

  function handleFilterChange(
    key: string,
    value: string
  ) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));

    setPage(1);
  }

  function handleReset() {
    setFilters(initialFilters);
    setPage(1);
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Billing Period</h1>
          <p>Kelola periode tagihan.</p>
        </div>

        <GeneratePeriodButton />
      </div>

      <div className="card">
        <DataFilter
          fields={filterFields}
          values={filters}
          onChange={handleFilterChange}
          onReset={handleReset}
        />

        {error && (
          <div className="empty-state">
            <h3>Gagal memuat data</h3>
            <p>{error}</p>
            <button
              type="button"
              className="secondary-button"
              onClick={() => void fetchPeriods()}
            >
              Coba Lagi
            </button>
          </div>
        )}

        {!error && loading && (
          <div className="empty-state">
            <p>Memuat billing period...</p>
          </div>
        )}

        {!error && !loading && periods.length === 0 && (
          <div className="empty-state">
            <h3>
              {pagination.totalItems === 0
                ? "Belum ada billing period"
                : "Tidak ada data"}
            </h3>

            <p>
              {pagination.totalItems === 0
                ? "Billing period yang sudah dibuat akan ditampilkan di sini."
                : "Tidak ada billing period yang sesuai dengan filter."}
            </p>
          </div>
        )}

        {!error && !loading && periods.length > 0 && (
          <>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Aksi</th>
                    <th>Tahun</th>
                    <th>Bulan</th>
                    <th>Mulai</th>
                    <th>Selesai</th>
                    <th>Status</th>
                    <th>Bills</th>
                  </tr>
                </thead>

                <tbody>
                  {periods.map((period) => (
                    <tr key={period.id}>
                      <td>
                        <GenerateBillsButton
                          periodId={period.id}
                          periodStatus={period.status}
                          billGenerationStatus={
                            period.bill_generation_status
                          }
                        />
                      </td>

                      <td>{period.year}</td>
                      <td>
                        {monthNames[period.month - 1] ??
                          period.month}
                      </td>

                      <td>{formatDate(period.start_date)}</td>
                      <td>{formatDate(period.end_date)}</td>

                      <td>
                        <span
                          className={`status-badge status-${period.status.toLowerCase()}`}
                        >
                          {period.status}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`status-badge status-${period.bill_generation_status.toLowerCase()}`}
                        >
                          {period.bill_generation_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="table-footer">
              <span className="table-info">
                Menampilkan{" "}
                {(pagination.page - 1) *
                  pagination.pageSize +
                  1}
                –
                {Math.min(
                  pagination.page * pagination.pageSize,
                  pagination.totalItems
                )}{" "}
                dari {pagination.totalItems} data
              </span>

              {pagination.totalPages > 1 && (
                <div className="pagination">
                  <button
                    type="button"
                    className="pagination-button"
                    disabled={page <= 1}
                    onClick={() =>
                      setPage((current) => current - 1)
                    }
                  >
                    Sebelumnya
                  </button>

                  {Array.from(
                    { length: pagination.totalPages },
                    (_, index) => index + 1
                  ).map((pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      className={`pagination-button ${
                        pageNumber === pagination.page
                          ? "active"
                          : ""
                      }`}
                      disabled={pageNumber === pagination.page}
                      onClick={() => setPage(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  ))}

                  <button
                    type="button"
                    className="pagination-button"
                    disabled={page >= pagination.totalPages}
                    onClick={() =>
                      setPage((current) => current + 1)
                    }
                  >
                    Berikutnya
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}