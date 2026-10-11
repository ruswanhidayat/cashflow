
"use client";

import { useCallback, useEffect, useState } from "react";

import DataFilter, {
  type DataFilterField,
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
  month: string;
  year: string;
};

const initialFilters: Filters = {
  name: "",
  month: "",
  year: "",
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

function formatAmount(amount: number | string | null) {
  if (amount === null || amount === undefined) {
    return "—";
  }

  return Number(amount).toLocaleString("id-ID");
}

export default function BillsClient() {
  const [filters, setFilters] =
    useState<Filters>(initialFilters);

  const [page, setPage] = useState(1);

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
        }),
      });

      const result =
        (await response.json()) as SearchResponse;

      if (!response.ok) {
        throw new Error(
          result.message ??
            "Gagal mengambil data tagihan."
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
  }, [filters, page]);

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
      options: [
        { value: "", label: "Semua bulan" },
        ...monthNames.map((name, index) => ({
          value: String(index + 1),
          label: name,
        })),
      ],
    },
    {
      key: "year",
      label: "Tahun",
      type: "select",
      options: [
        { value: "", label: "Semua tahun" },
        ...years,
      ],
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
                    <th className="text-right">
                      Tagihan Kas
                    </th>
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
                Menampilkan{" "}
                {(pagination.page - 1) *
                  pagination.pageSize +
                  1}
                –
                {Math.min(
                  pagination.page * pagination.pageSize,
                  pagination.totalItems
                )}{" "}
                dari {pagination.totalItems} data tagihan
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
                      disabled={
                        pageNumber === pagination.page
                      }
                      onClick={() => setPage(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  ))}

                  <button
                    type="button"
                    className="pagination-button"
                    disabled={
                      page >= pagination.totalPages
                    }
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
