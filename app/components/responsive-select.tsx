
"use client";

import { useEffect, useRef, useState } from "react";

type SelectOption = {
  value: string;
  label: string;
};

type ResponsiveSelectProps = {
  id: string;
  name: string;
  value: string[];
  options: SelectOption[];
  label?: string;
  disabled?: boolean;
  multiple?: boolean;
  onChange?: (value: string[]) => void;
  clearable?: boolean;
  onClear?: () => void;
  placeholder?: string;
};

export default function ResponsiveSelect({
  id,
  name,
  value,
  options,
  label,
  disabled = false,
  multiple = false,
  onChange,
  clearable = false,
  onClear,
  placeholder,
}: ResponsiveSelectProps) {
  const [selectedValues, setSelectedValues] =
    useState<string[]>(value);

  const [isOpen, setIsOpen] = useState(false);

  const selectRef = useRef<HTMLDivElement>(null);

  const selectedLabels = options
    .filter((option) => selectedValues.includes(option.value))
    .map((option) => option.label);

  const displayLabel =
    selectedLabels.join(", ") ||
    placeholder ||
    `Pilih ${label ?? "opsi"}`;

  useEffect(() => {
    setSelectedValues(value);
  }, [value]);

  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
    }
  }, [disabled]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectRef.current &&
        !selectRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  function handleSelect(nextValue: string) {
    if (multiple) {
      const nextValues = selectedValues.includes(nextValue)
        ? selectedValues.filter((item) => item !== nextValue)
        : [...selectedValues, nextValue];

      setSelectedValues(nextValues);
      onChange?.(nextValues);
      return;
    }

    const nextValues = nextValue === "" ? [] : [nextValue];

    setSelectedValues(nextValues);
    setIsOpen(false);
    onChange?.(nextValues);
  }

  function handleClear(
    event: React.MouseEvent<HTMLButtonElement>
  ) {
    event.stopPropagation();

    setSelectedValues([]);
    setIsOpen(false);

    if (onClear) {
      onClear();
    } else {
      onChange?.([]);
    }
  }

  function renderOptions() {
    return options.map((option) => {
      const isSelected = selectedValues.includes(option.value);

      return (
        <button
          key={option.value}
          type="button"
          className={`responsive-select-option ${
            isSelected ? "selected" : ""
          }`}
          role="option"
          aria-selected={isSelected}
          onClick={() => handleSelect(option.value)}
        >
          <span>{option.label}</span>

          <span
            className={
              multiple
                ? "responsive-select-check"
                : "responsive-select-radio"
            }
            aria-hidden="true"
          >
            {isSelected ? "✓" : ""}
          </span>
        </button>
      );
    });
  }

  return (
    <div
      ref={selectRef}
      className={`responsive-select ${
        isOpen ? "open" : ""
      } ${
        clearable && selectedValues.length > 0
          ? "has-clear"
          : ""
      }`}
    >
      {selectedValues.map((selectedValue) => (
        <input
          key={selectedValue}
          type="hidden"
          name={name}
          value={selectedValue}
        />
      ))}

      <button
        type="button"
        className="responsive-select-trigger"
        onClick={() =>
          !disabled && setIsOpen((current) => !current)
        }
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{displayLabel}</span>

        <span
          className="responsive-select-chevron"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6 9L12 15L18 9"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {clearable && selectedValues.length > 0 && (
        <button
          type="button"
          className="responsive-select-clear"
          onClick={handleClear}
          aria-label={`Hapus pilihan ${label ?? ""}`}
          title="Hapus pilihan"
        >
          ×
        </button>
      )}

      {isOpen && (
        <div
          className="responsive-select-dropdown"
          role="listbox"
          aria-label={`Pilih ${label ?? "opsi"}`}
          aria-multiselectable={multiple}
        >
          {renderOptions()}
        </div>
      )}

      {isOpen && (
        <div
          className="responsive-select-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsOpen(false);
            }
          }}
        >
          <div
            className="responsive-select-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${id}-sheet-title`}
          >
            <div className="responsive-select-handle" />

            <div
              id={`${id}-sheet-title`}
              className="responsive-select-sheet-title"
            >
              Pilih {label ?? "opsi"}
            </div>

            <div
              className="responsive-select-options"
              role="listbox"
              aria-multiselectable={multiple}
            >
              {renderOptions()}
            </div>

            {multiple && (
              <div className="responsive-select-sheet-footer">
                <button
                  type="button"
                  className="secondary-button responsive-select-done"
                  onClick={() => setIsOpen(false)}
                >
                  Pilih
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
