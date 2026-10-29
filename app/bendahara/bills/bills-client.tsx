"use client";

import { useCallback, useEffect, useState } from "react";
import ResponsiveSelect from "@/app/components/responsive-select";

import DataFilter, {
  type DataFilterField,
  type DataFilterValue,
} from "@/app/components/data-filter";

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

type YearOption = {
  value: string;
  label: string;
};

type PageSize = 10 | 25 | 50;

type SearchResponse = {
  data: BillRow[];
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
  name: string;
  month: string[];
  year: string[];
};

const initialFilters: Filters = {
  name: "",
  month: [],
  year: [],
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

function formatAmount(amount: number | string | null) {
  if (amount === null || amount === undefined) {
    return "—";
  }

  return Number(amount).toLocaleString("id-ID");
}

export default function BillsClient() {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);

  const [bills, setBills] = useState<BillRow[]>([]);
  const [years, setYears] = useState<YearOption[]>([]);

  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchBills = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/bills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...filters,
          page,
          pageSize,
        }),
      });

      const result = (await response.json()) as SearchResponse;

      if (!response.ok) {
        throw new Error(
          result.message ?? "Gagal mengambil data tagihan."
        );
      }

      setBills(result.data);
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
    void fetchBills();
  }, [fetchBills]);

  const filterFields: DataFilterField[] = [
    {
      key: "name",
      label: "Nama",
      type: "text",
      placeholder: "Cari nama pegawai...",
    },
    {
      key: "month",
      label: "Bulan",
      type: "select",
      multiple: true,
      options: monthNames.map((name, index) => ({
        value: String(index + 1),
        label: name,
      })),
    },
    {
      key: "year",
      label: "Tahun",
      type: "select",
      multiple: true,
      options: years,
    },
  ];

  function handleFilterChange(
    key: string,
    value: DataFilterValue
  ) {
    setFilters((current) => {
      if (key === "name") {
        return {
          ...current,
          name: typeof value === "string" ? value : "",
        };
      }

      if (key === "month" && Array.isArray(value)) {
        return { ...current, month: value };
      }

      if (key === "year" && Array.isArray(value)) {
        return { ...current, year: value };
      }

      return current;
    });

    setPage(1);
  }

  function handleReset() {
    setFilters(initialFilters);
    setPage(1);
  }

  function handlePageSizeChange(value: string) {
    const nextPageSize = Number(value);

    if (
      nextPageSize === 10 ||
      nextPageSize === 25 ||
      nextPageSize === 50
    ) {
      setPageSize(nextPageSize);
      setPage(1);
    }
  }

  // Maksimal lima nomor halaman, dengan halaman aktif di tengah
  // jika masih memungkinkan.
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
      length: Math.max(0, visiblePageEnd - visiblePageStart + 1),
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
          <h1>Data Tagihan</h1>
          <p>
            Lihat data tagihan pegawai berdasarkan periode
            dan jenis kas.
          </p>
        </div>
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
              onClick={() => void fetchBills()}
            >
              Coba Lagi
            </button>
          </div>
        )}

        {!error && loading && (
          <div className="empty-state">
            <p>Memuat data tagihan...</p>
          </div>
        )}

        {!error && !loading && bills.length === 0 && (
          <div className="empty-state">
            <h3>
              {pagination.totalItems === 0
                ? "Belum ada data tagihan"
                : "Tidak ada data"}
            </h3>

            <p>
              {pagination.totalItems === 0
                ? "Data tagihan yang tersedia akan ditampilkan di sini."
                : "Tidak ada data tagihan yang sesuai dengan filter."}
            </p>
          </div>
        )}

        {!error && !loading && bills.length > 0 && (
          <>
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
                    <th className="text-right">
                      Tagihan Paguyuban
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {bills.map((bill) => (
                    <tr
                      key={`${bill.user_id}-${bill.period_id}`}
                    >
                      <td>{bill.name}</td>
                      <td>{bill.position_name ?? "—"}</td>
                      <td>
                        {monthNames[bill.month - 1] ?? "—"}{" "}
                        {bill.year}
                      </td>
                      <td className="text-right">
                        {formatAmount(bill.cash_amount)}
                      </td>
                      <td className="text-right">
                        {formatAmount(bill.pgb_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="table-footer">
              <span className="table-info">
                Menampilkan {firstItem}–{lastItem} dari{" "}
                {pagination.totalItems} data tagihan
              </span>

              <div className="pagination">
                <div className="page-size-control">
                  <span>Data per halaman</span>

                  <div className="page-size-select">
                    <ResponsiveSelect
                      id="bills-page-size"
                      name="bills-page-size"
                      label="data per halaman"
                      value={[String(pageSize)]}
                      options={PAGE_SIZE_OPTIONS.map((size) => ({
                        value: String(size),
                        label: String(size),
                      }))}
                      onChange={(values) => {
                        const selected = Number(values[0]);

                        if (
                          selected === 10 ||
                          selected === 25 ||
                          selected === 50
                        ) {
                          setPageSize(selected);
                          setPage(1);
                        }
                      }}
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
                          pageNumber === page ? "active" : ""
                        }`}
                        disabled={pageNumber === page}
                        onClick={() => setPage(pageNumber)}
                        aria-current={
                          pageNumber === page ? "page" : undefined
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
    </>
  );
}