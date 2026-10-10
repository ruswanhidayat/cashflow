"use client";

import { useEffect, useRef, useState } from "react";

type SelectOption = {
  value: string;
  label: string;
};

type ResponsiveSelectProps = {
  id: string;
  name: string;
  value: string;
  options: SelectOption[];
  label?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
  clearable?: boolean;
  onClear?: () => void;
};

export default function ResponsiveSelect({
  id,
  name,
  value,
  options,
  label,
  disabled = false,
  onChange,
  clearable = false,
  onClear,
}: ResponsiveSelectProps) {
  const [selectedValue, setSelectedValue] =
    useState(value);

  const [isOpen, setIsOpen] = useState(false);

  const selectRef = useRef<HTMLDivElement>(null);

  const selectedOption =
    options.find(
      (option) =>
        option.value === selectedValue
    ) ?? options[0];

  useEffect(() => {
    setSelectedValue(value);
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

    const handleKeyDown = (
      event: KeyboardEvent
    ) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (
      event: MouseEvent
    ) => {
      if (
        selectRef.current &&
        !selectRef.current.contains(
          event.target as Node
        )
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

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

    const originalOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow =
        originalOverflow;
    };
  }, [isOpen]);

  function handleSelect(
    nextValue: string
  ) {
    setSelectedValue(nextValue);
    setIsOpen(false);
    onChange?.(nextValue);
  }

  function handleClear(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    setSelectedValue("");
    setIsOpen(false);
    if (onClear) {
      onClear();
    } else {
      onChange?.("");
    }
  }

  return (
    <div
      ref={selectRef}
      className={`responsive-select ${
        isOpen ? "open" : ""
      } ${clearable && selectedValue ? "has-clear" : ""}`}
    >
      <input
        type="hidden"
        name={name}
        value={selectedValue}
      />

      {/* Trigger */}
      <button
        type="button"
        className="responsive-select-trigger"
        onClick={() =>
          !disabled &&
          setIsOpen((current) => !current)
        }
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>
          {selectedOption.label}
        </span>

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

      {clearable && selectedValue !== "" && (
        <button
          type="button"
          className="responsive-select-clear"
          onClick={handleClear}
          aria-label="Hapus pilihan"
          title="Hapus pilihan"
        >
          ×
        </button>
      )}

      {/* Desktop dropdown */}
      {isOpen && (
        <div
          className="responsive-select-dropdown"
          role="listbox"
          aria-label={`Pilih ${
            label ??
            (id === "month"
              ? "bulan"
              : id === "year"
                ? "tahun"
                : "status")
          }`}
        >
          {options.map((option) => {
            const isSelected =
              option.value ===
              selectedValue;

            return (
              <button
                key={option.value}
                type="button"
                className={`responsive-select-option ${
                  isSelected
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  handleSelect(
                    option.value
                  )
                }
              >
                <span>
                  {option.label}
                </span>

                <span
                  className="responsive-select-check"
                  aria-hidden="true"
                >
                  {isSelected
                    ? "✓"
                    : ""}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Mobile bottom sheet */}
      {isOpen && (
        <div
          className="responsive-select-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
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
              Pilih{" "}
              {label ??
                (id === "month"
                  ? "bulan"
                  : id === "year"
                    ? "tahun"
                    : "status")}
            </div>

            <div className="responsive-select-options">
              {options.map((option) => {
                const isSelected =
                  option.value ===
                  selectedValue;

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`responsive-select-option ${
                      isSelected
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      handleSelect(
                        option.value
                      )
                    }
                  >
                    <span>
                      {option.label}
                    </span>

                    <span
                      className="responsive-select-radio"
                      aria-hidden="true"
                    >
                      {isSelected
                        ? "✓"
                        : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}