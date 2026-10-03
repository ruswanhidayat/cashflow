"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GeneratePeriodButton() {
  const currentYear = new Date().getFullYear();

  const years = [
    currentYear,
    currentYear + 1,
    currentYear + 2,
  ];

  const [isOpen, setIsOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  const handleGenerate = async () => {
    setIsLoading(true);

    try {
      const checkResponse = await fetch(
        "/api/billing-periods/check",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            year: selectedYear,
          }),
        }
      );

      const checkResult = await checkResponse.json();

      if (!checkResponse.ok) {
        alert(
          checkResult.message ??
            "Gagal mengecek billing period."
        );
        return;
      }

      if (checkResult.existingCount === 12) {
        alert(
          `Billing period tahun ${selectedYear} sudah lengkap.`
        );
        setIsOpen(false);
        return;
      }

      if (
        checkResult.existingCount > 0 &&
        checkResult.existingCount < 12
      ) {
        const confirmed = window.confirm(
          `Sebagian billing period tahun ${selectedYear} sudah ada.\n\n` +
            `${checkResult.existingCount} bulan sudah ada dan ` +
            `${checkResult.missingCount} bulan belum ada.\n\n` +
            `Apakah tetap generate bulan yang belum ada?`
        );

        if (!confirmed) {
          return;
        }
      }

      const generateResponse = await fetch(
        "/api/billing-periods/generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            year: selectedYear,
          }),
        }
      );

      const generateResult = await generateResponse.json();

      if (!generateResponse.ok) {
        alert(
          generateResult.message ??
            "Gagal membuat billing period."
        );
        return;
      }

      alert(generateResult.message);

      setIsOpen(false);
      router.refresh();
    } catch (error) {
      console.error(error);

      alert(
        "Terjadi kesalahan saat membuat billing period."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="primary-button"
        onClick={() => setIsOpen(true)}
      >
        Generate Period
      </button>

      {isOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Generate Billing Period</h2>

            <p>
              Pilih tahun yang ingin dibuat.
            </p>

            <select
              value={selectedYear}
              onChange={(event) =>
                setSelectedYear(
                  Number(event.target.value)
                )
              }
              disabled={isLoading}
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
              >
                Batal
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={handleGenerate}
                disabled={isLoading}
              >
                {isLoading
                  ? "Generating..."
                  : "Generate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}