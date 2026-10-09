"use client";

import { useEffect, useState } from "react";
import ResponsiveSelect from "@/app/components/responsive-select";

export type TableFilterOption = {
  label: string;
  value: string;
};

export type TableFilterConfig = {
  key: string;
  type: "text" | "select";
  placeholder: string;
  options?: TableFilterOption[];
  /** Key kolom tabel tempat filter ini ditampilkan. */
  columnKey?: string;
};

type TableFilterToolbarProps = {
  hasActiveFilters: boolean;
  onReset: () => void;
};

export function TableFilterToolbar({
  hasActiveFilters,
  onReset,
}: TableFilterToolbarProps) {
  return (
    <div className="table-filter-toolbar">
      <div className="table-filter-toolbar-info" aria-hidden="true" />

      <button
        type="button"
        className="reset-filter-button"
        onClick={onReset}
        disabled={!hasActiveFilters}
      >
        Reset Filter
      </button>
    </div>
  );
}

type TableColumnFilterRowProps = {
  filters: TableFilterConfig[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  columnKeys: string[];
  onReset: () => void;
};

export function TableColumnFilterRow({
  filters,
  values,
  onChange,
  columnKeys,
  onReset,
}: TableColumnFilterRowProps) {
  const [searchValues, setSearchValues] = useState(values);

  useEffect(() => {
    setSearchValues(values);
  }, [values]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    for (const filter of filters) {
      if (filter.type !== "text") continue;

      const localValue = searchValues[filter.key] ?? "";
      const parentValue = values[filter.key] ?? "";

      if (localValue === parentValue) continue;

      const timer = setTimeout(() => {
        onChange(filter.key, localValue);
      }, 300);

      timers.push(timer);
    }

    return () => timers.forEach(clearTimeout);
  }, [searchValues, values, filters, onChange]);

  function updateFilter(key: string, value: string) {
    setSearchValues((previous) => ({ ...previous, [key]: value }));
  }

  function clearFilter(key: string) {
    setSearchValues((previous) => ({ ...previous, [key]: "" }));
    onChange(key, "");
  }

  const filterByColumn = new Map(
    filters.map((filter) => [filter.columnKey ?? filter.key, filter]),
  );

  return (
    <tr className="table-column-filters">
      <td className="table-column-filter-reset-cell">
        <button
          type="button"
          className="table-column-filter-reset"
          onClick={onReset}
          disabled={!Object.values(values).some((value) => value !== "")}
          aria-label="Reset semua filter"
          title="Reset semua filter"
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M3.5 11a8.5 8.5 0 1 1 2.2 5.7M3.5 4.5V11h6.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </td>

      {columnKeys.map((columnKey) => {
        const filter = filterByColumn.get(columnKey);

        if (!filter) {
          return <td key={`filter-empty-${columnKey}`} />;
        }

        const value = searchValues[filter.key] ?? "";

        return (
          <td key={filter.key}>
            <div className="table-column-filter-control">
              {filter.type === "text" ? (
                <input
                  type="text"
                  value={value}
                  placeholder={filter.placeholder}
                  onChange={(event) =>
                    updateFilter(filter.key, event.target.value)
                  }
                  aria-label={`Filter ${filter.placeholder}`}
                  className="table-column-filter-input"
                />
              ) : (
                <ResponsiveSelect
                  id={`table-filter-${filter.key}`}
                  name={`table-filter-${filter.key}`}
                  value={value}
                  options={[
                    { value: "", label: filter.placeholder },
                    ...(filter.options ?? []).filter(
                      (option) => option.value !== "",
                    ),
                  ]}
                  onChange={(nextValue) => {
                    updateFilter(filter.key, nextValue);
                    onChange(filter.key, nextValue);
                  }}
                  clearable={value !== ""}
                  onClear={() => clearFilter(filter.key)}
                />
              )}

              {filter.type === "text" && value !== "" && (
                <button
                  type="button"
                  className="table-column-filter-clear"
                  onClick={() => clearFilter(filter.key)}
                  aria-label={`Hapus filter ${filter.placeholder}`}
                  title="Hapus filter"
                >
                  ×
                </button>
              )}
            </div>
          </td>
        );
      })}
    </tr>
  );
}
