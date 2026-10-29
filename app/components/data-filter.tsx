"use client";

import ResponsiveSelect from "@/app/components/responsive-select";

export type DataFilterOption = {
  value: string;
  label: string;
};

export type DataFilterField = {
  key: string;
  label: string;
  type: "text" | "select";
  placeholder?: string;
  options?: DataFilterOption[];
  multiple?: boolean;
};

export type DataFilterValue = string | string[];

type DataFilterProps = {
  fields: DataFilterField[];
  values: Record<string, DataFilterValue>;
  onChange: (key: string, value: DataFilterValue) => void;
  onReset: () => void;
  layoutClassName?: string;
};

export default function DataFilter({
  fields,
  values,
  onChange,
  onReset,
  layoutClassName = "",
}: DataFilterProps) {
  const hasActiveFilter = fields.some((field) => {
    const value = values[field.key];

    return Array.isArray(value)
      ? value.length > 0
      : (value ?? "") !== "";
  });

  if (fields.length === 0) {
    return null;
  }

  return (
    <div
      className={`table-filter data-filter ${layoutClassName}`.trim()}
    >
      {fields.map((field) => {
        const value = values[field.key];

        return (
          <div className="filter-group" key={field.key}>
            <label htmlFor={`data-filter-${field.key}`}>
              {field.label}
            </label>

            {field.type === "select" ? (
              <ResponsiveSelect
                id={`data-filter-${field.key}`}
                name={field.key}
                label={field.label}
                placeholder={
                  field.placeholder ??
                  `Pilih ${field.label.toLowerCase()}`
                }
                value={
                  Array.isArray(value)
                    ? value
                    : value
                      ? [value]
                      : []
                }
                options={field.options ?? []}
                multiple={field.multiple ?? false}
                onChange={(nextValue) =>
                  onChange(field.key, nextValue)
                }
                clearable
                onClear={() => onChange(field.key, [])}
              />
            ) : (
              <div className="data-filter-input-wrapper">
                <input
                  id={`data-filter-${field.key}`}
                  name={field.key}
                  type="text"
                  className="form-input data-filter-input"
                  placeholder={
                    field.placeholder ??
                    `Cari ${field.label.toLowerCase()}...`
                  }
                  value={
                    typeof value === "string" ? value : ""
                  }
                  autoComplete="off"
                  onChange={(event) =>
                    onChange(field.key, event.target.value)
                  }
                />

                {typeof value === "string" &&
                  value !== "" && (
                    <button
                      type="button"
                      className="data-filter-input-clear"
                      onClick={() => onChange(field.key, "")}
                      aria-label={`Hapus ${field.label}`}
                      title={`Hapus ${field.label}`}
                    >
                      ×
                    </button>
                  )}
              </div>
            )}
          </div>
        );
      })}

      <div className="filter-actions data-filter-actions">
        <button
          type="button"
          className="reset-filter-button"
          onClick={onReset}
          disabled={!hasActiveFilter}
        >
          Reset
        </button>
      </div>
    </div>
  );
}