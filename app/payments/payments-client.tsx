"use client";

import { useCallback, useEffect, useState } from "react";

import DataFilter, {
  type DataFilterField,
  type DataFilterValue,
} from "@/app/components/data-filter";

import ResponsiveSelect from "@/app/components/responsive-select";

type PaymentRow = {
  id: number;
  user_id: number;
  user_name: string;
  amount: number | string;
  amount_approved: number | string | null;
  payment_date: string;
  payment_method: string;
  entry_type: string;
  status: string;
  approval_note: string | null;
  created_at: string;
  confirmed_at: string | null;
};

type YearOption = {
  value: string;
  label: string;
};

type PageSize = 10 | 25 | 50;

type SearchResponse = {
  data: PaymentRow[];
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
  status: string;
};

const initialFilters: Filters = {
  name: "",
  month: [],
  year: [],
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
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CANCELLED", label: "Cancelled" },
];

function formatAmount(amount: number | string | null) {
  if (amount === null || amount === undefined) {
    return "—";
  }

  return Number(amount).toLocaleString("id-ID");
}

function formatDate(value: string) {
  if (!value) {
    return "—";
  }

  // payment_date berasal dari kolom DATE.
  // Ambil bagian tanggal agar tidak bergeser akibat zona waktu.
  const [year, month, day] = value.slice(0, 10).split("-");

  if (!year || !month || !day) {
    return "—";
  }

  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day)
  );

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getStatusLabel(status: string) {
  return (
    statusOptions.find((item) => item.value === status)
      ?.label ?? status
  );
}

export default function PaymentsClient({
  role,
}: {
  role: "USER" | "BEND";
}) {
  const [filters, setFilters] =
    useState<Filters>(initialFilters);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);

  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [years, setYears] = useState<YearOption[]>([]);

  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/payments/search",
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
            "Gagal mengambil data pembayaran."
        );
      }

      setPayments(result.data);
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
    void fetchPayments();
  }, [fetchPayments]);

  const filterFields: DataFilterField[] = [
    ...(role === "BEND"
      ? [
          {
            key: "name",
            label: "Nama",
            type: "text" as const,
            placeholder: "Cari nama pegawai...",
          },
        ]
      : []),
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
    {
      key: "status",
      label: "Status",
      type: "select",
      options: statusOptions,
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
          <h1>Data Pembayaran</h1>
          <p>
            {role === "BEND"
              ? "Lihat dan pantau pencatatan pembayaran anggota."
              : "Lihat riwayat pembayaran yang telah kamu catat."}
          </p>
        </div>
      </div>

      <div className="card">
        <DataFilter
          fields={filterFields}
          values={filters}
          onChange={handleFilterChange}
          onReset={handleReset}
          layoutClassName="payments-filter-layout"
        />

        {error && (
          <div className="empty-state">
            <h3>Gagal memuat data</h3>
            <p>{error}</p>

            <button
              type="button"
              className="secondary-button"
              onClick={() => void fetchPayments()}
            >
              Coba Lagi
            </button>
          </div>
        )}

        {!error && loading && (
          <div className="empty-state">
            <p>Memuat data pembayaran...</p>
          </div>
        )}

        {!error && !loading && payments.length === 0 && (
          <div className="empty-state">
            <h3>
              {pagination.totalItems === 0
                ? "Belum ada data pembayaran"
                : "Tidak ada data"}
            </h3>

            <p>
              {pagination.totalItems === 0
                ? "Data pembayaran yang tercatat akan ditampilkan di sini."
                : "Tidak ada pembayaran yang sesuai dengan filter."}
            </p>
          </div>
        )}

        {!error && !loading && payments.length > 0 && (
          <>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    {role === "BEND" && <th>Nama</th>}
                    <th>Tanggal</th>
                    <th className="text-right">Dilaporkan</th>
                    <th className="text-right">Disetujui</th>
                    <th>Metode</th>
                    <th>Jenis</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      {role === "BEND" && (
                        <td>{payment.user_name}</td>
                      )}

                      <td>
                        {formatDate(payment.payment_date)}
                      </td>

                      <td className="text-right">
                        Rp {formatAmount(payment.amount)}
                      </td>

                      <td className="text-right">
                        {payment.amount_approved === null
                          ? "—"
                          : `Rp ${formatAmount(payment.amount_approved)}`}
                      </td>

                      <td>{payment.payment_method}</td>

                      <td>{payment.entry_type}</td>

                      <td>
                        <span
                          className={`status-badge status-${payment.status.toLowerCase()}`}
                        >
                          {getStatusLabel(payment.status)}
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
                {pagination.totalItems} data pembayaran
              </span>

              <div className="pagination">
                <div className="page-size-control">
                  <span>Data per halaman</span>

                  <div className="page-size-select">
                    <ResponsiveSelect
                      id="payments-page-size"
                      name="payments-page-size"
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
    </>
  );
}