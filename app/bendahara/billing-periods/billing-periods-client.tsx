"use client";

import { useCallback, useEffect, useState } from "react";

import DataFilter, {
  type DataFilterField,
  type DataFilterValue,
} from "@/app/components/data-filter";
import ResponsiveSelect from "@/app/components/responsive-select";
import GeneratePeriodButton from "./generate-period-button";
import GenerateBillsButton from "./generate-bills-button";
import Notification from "@/app/components/notification";

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
  year: string[];
  month: string[];
  status: string;
};

type PageSize = 10 | 25 | 50;

const initialFilters: Filters = {
  year: [],
  month: [],
  status: "",
};

const PAGE_SIZE_OPTIONS: PageSize[] = [10, 25, 50];
const MAX_VISIBLE_PAGES = 5;

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

  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);

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
            pageSize,
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
  }, [filters, page, pageSize]);

  useEffect(() => {
    void fetchPeriods();
  }, [fetchPeriods]);

  const filterFields: DataFilterField[] = [
    {
      key: "year",
      label: "Tahun",
      type: "select",
      placeholder: "Pilih tahun",
      options: years,
      multiple: true,
    },
    {
      key: "month",
      label: "Bulan",
      type: "select",
      placeholder: "Pilih bulan",
      options: monthNames.map((name, index) => ({
        value: String(index + 1),
        label: name,
      })),
      multiple: true,
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      placeholder: "Pilih status",
      options: statusOptions,
    },
  ];

  function handleFilterChange(
    key: string,
    value: DataFilterValue
  ) {
    setFilters((current) => {
      if (key === "year" || key === "month") {
        return {
          ...current,
          [key]: Array.isArray(value)
            ? value
            : value
              ? [value]
              : [],
        };
      }

      if (key === "status") {
        return {
          ...current,
          status: Array.isArray(value)
            ? value[0] ?? ""
            : value,
        };
      }

      return current;
    });

    setPage(1);
  }

  function handleReset() {
    setFilters(initialFilters);
    setPage(1);
  }

  function handlePageSizeChange(values: string[]) {
    const selected = Number(values[0]);

    if (
      selected === 10 ||
      selected === 25 ||
      selected === 50
    ) {
      setPageSize(selected);
      setPage(1);
    }
  }

  // Tampilkan maksimal lima nomor halaman.
  const visiblePageStart = Math.max(
    1,
    Math.min(
      page - Math.floor(MAX_VISIBLE_PAGES / 2),
      pagination.totalPages - MAX_VISIBLE_PAGES + 1
    )
  );

  const visiblePageEnd = Math.min(
    pagination.totalPages,
    visiblePageStart + MAX_VISIBLE_PAGES - 1
  );

  const visiblePages = Array.from(
    {
      length: Math.max(
        0,
        visiblePageEnd - visiblePageStart + 1
      ),
    },
    (_, index) => visiblePageStart + index
  );

  const firstItem =
    pagination.totalItems === 0
      ? 0
      : (pagination.page - 1) * pagination.pageSize + 1;

  const lastItem = Math.min(
    pagination.page * pagination.pageSize,
    pagination.totalItems
  );

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
                    <th className="billing-period-action-column">
                      Aksi
                    </th>
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
                      <td className="billing-period-action-column">
                        <GenerateBillsButton
                          periodId={period.id}
                          periodStatus={period.status}
                          billGenerationStatus={
                            period.bill_generation_status
                          }
                          onGenerated={fetchPeriods}
                          onNotify={(type, message) => {
                            setNotification({
                              type,
                              message,
                            });
                          }}
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
                Menampilkan {firstItem}–{lastItem} dari{" "}
                {pagination.totalItems} data
              </span>

              <div className="pagination">
                <div className="page-size-control">
                  <span>Data per halaman</span>

                  <div className="page-size-select">
                    <ResponsiveSelect
                      id="billing-period-page-size"
                      name="billing-period-page-size"
                      label="data per halaman"
                      value={[String(pageSize)]}
                      options={PAGE_SIZE_OPTIONS.map((size) => ({
                        value: String(size),
                        label: String(size),
                      }))}
                      onChange={handlePageSizeChange}
                    />
                  </div>
                </div>

                {pagination.totalPages > 1 && (
                  <>
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

                    {visiblePages.map((pageNumber) => (
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
                        aria-current={
                          pageNumber === pagination.page
                            ? "page"
                            : undefined
                        }
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
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <Notification
        open={notification !== null}
        type={notification?.type}
        message={notification?.message || ""}
        onClose={() => setNotification(null)}
      />
    </>
  );
}