
"use client";

import { useEffect, useState } from "react";

export type TableFilterOption = {
  label: string;
  value: string;
};

export type TableFilterConfig = {
  key: string;
  type: "text" | "select";
  placeholder: string;
  options?: TableFilterOption[];
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
      <div className="table-filter-toolbar-info">
        <span>Filter data</span>
      </div>

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
  columnCount: number;
};

export function TableColumnFilterRow({
  filters,
  values,
  onChange,
  columnCount,
}: TableColumnFilterRowProps) {
  const [searchValues, setSearchValues] = useState(values);

  useEffect(() => {
    setSearchValues(values);
  }, [values]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    for (const filter of filters) {
      if (filter.type !== "text") {
        continue;
      }

      const localValue = searchValues[filter.key] ?? "";
      const parentValue = values[filter.key] ?? "";

      if (localValue === parentValue) {
        continue;
      }

      const timer = setTimeout(() => {
        onChange(filter.key, localValue);
      }, 300);

      timers.push(timer);
    }

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [searchValues, values, filters, onChange]);

  function updateFilter(key: string, value: string) {
    setSearchValues((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function clearFilter(key: string) {
    setSearchValues((previous) => ({
      ...previous,
      [key]: "",
    }));

    onChange(key, "");
  }

  const filterByKey = new Map(
    filters.map((filter) => [filter.key, filter])
  );

  // Urutan filter mengikuti kolom Nama, Posisi, dan Periode.
  const columnKeys = ["name", "position", "period"];

  return (
    <tr className="table-column-filters">
      {Array.from({ length: columnCount }, (_, index) => {
        const key = columnKeys[index];
        const filter = key
          ? filterByKey.get(key)
          : undefined;

        if (!filter) {
          return <td key={`filter-empty-${index}`} />;
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
                <select
                  value={value}
                  onChange={(event) => {
                    updateFilter(filter.key, event.target.value);
                    onChange(filter.key, event.target.value);
                  }}
                  aria-label={`Filter ${filter.placeholder}`}
                  className="table-column-filter-select"
                >
                  <option value="">
                    {filter.placeholder}
                  </option>

                  {(filter.options ?? []).map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              )}

              {value !== "" && (
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
