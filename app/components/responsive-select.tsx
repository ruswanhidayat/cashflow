"use client";

import { useEffect, useState } from "react";

type SelectOption = {
  value: string;
  label: string;
};

type ResponsiveSelectProps = {
  id: string;
  name: string;
  value: string;
  options: SelectOption[];
};

export default function ResponsiveSelect({
  id,
  name,
  value,
  options,
}: ResponsiveSelectProps) {
  const [selectedValue, setSelectedValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption =
    options.find((option) => option.value === selectedValue) ??
    options[0];

  useEffect(() => {
    setSelectedValue(value);
  }, [value]);

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

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  function handleSelect(nextValue: string) {
    setSelectedValue(nextValue);
    setIsOpen(false);
  }

  return (
    <>
      <input
        type="hidden"
        name={name}
        value={selectedValue}
      />

      {/* Desktop */}
      <select
        id={id}
        className="responsive-select-native"
        value={selectedValue}
        onChange={(event) =>
          setSelectedValue(event.target.value)
        }
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>

      {/* Mobile */}
      <button
        type="button"
        className="responsive-select-trigger"
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span>{selectedOption.label}</span>

        <span
          className="responsive-select-chevron"
          aria-hidden="true"
        >
          ⌄
        </span>
      </button>

      {isOpen && (
        <div
          className="responsive-select-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
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
              Pilih {id === "month"
                ? "bulan"
                : id === "year"
                  ? "tahun"
                  : "status"}
            </div>

            <div className="responsive-select-options">
              {options.map((option) => {
                const isSelected =
                  option.value === selectedValue;

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
                      handleSelect(option.value)
                    }
                  >
                    <span>
                      {option.label}
                    </span>

                    <span
                      className="responsive-select-radio"
                      aria-hidden="true"
                    >
                      {isSelected ? "✓" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}