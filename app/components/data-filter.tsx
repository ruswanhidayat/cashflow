
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
};

type DataFilterProps = {
  fields: DataFilterField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onReset: () => void;
};

export default function DataFilter({
  fields,
  values,
  onChange,
  onReset,
}: DataFilterProps) {
  const hasActiveFilter = fields.some(
    (field) => (values[field.key] ?? "") !== ""
  );

  if (fields.length === 0) {
    return null;
  }

  return (
    <div className="table-filter data-filter">
      {fields.map((field) => (
        <div className="filter-group" key={field.key}>
          <label htmlFor={`data-filter-${field.key}`}>
            {field.label}
          </label>

          {field.type === "select" ? (
            <ResponsiveSelect
              id={`data-filter-${field.key}`}
              name={field.key}
              label={field.label}
              value={values[field.key] ?? ""}
              options={field.options ?? []}
              onChange={(value) => onChange(field.key, value)}
              clearable
              onClear={() => onChange(field.key, "")}
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
                value={values[field.key] ?? ""}
                onChange={(event) =>
                  onChange(field.key, event.target.value)
                }
              />

              {(values[field.key] ?? "") !== "" && (
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
      ))}

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
