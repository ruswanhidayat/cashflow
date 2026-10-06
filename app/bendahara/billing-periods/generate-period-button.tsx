"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import ConfirmDialog from "@/app/components/confirm-dialog";
import Notification from "@/app/components/notification";
import ResponsiveSelect from "@/app/components/responsive-select";

export default function GeneratePeriodButton() {
  const currentYear = new Date().getFullYear();

  const years = [
    currentYear,
    currentYear + 1,
    currentYear + 2,
  ];

  const [isOpen, setIsOpen] = useState(false);
  const [selectedYear, setSelectedYear] =
    useState(currentYear);

  const [isLoading, setIsLoading] = useState(false);

  const [confirmOpen, setConfirmOpen] =
    useState(false);

  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [existingCount, setExistingCount] =
    useState(0);

  const [missingCount, setMissingCount] =
    useState(0);

  const router = useRouter();

  async function handleGenerate() {
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

      const checkResult =
        await checkResponse.json();

      if (!checkResponse.ok) {
        setNotification({
          type: "error",
          message:
            checkResult.message ??
            "Gagal mengecek billing period.",
        });

        return;
      }

      if (checkResult.existingCount === 12) {
        setNotification({
          type: "error",
          message: `Billing period tahun ${selectedYear} sudah lengkap.`,
        });

        setIsOpen(false);
        return;
      }

      if (
        checkResult.existingCount > 0 &&
        checkResult.existingCount < 12
      ) {
        setExistingCount(
          checkResult.existingCount
        );

        setMissingCount(
          checkResult.missingCount
        );

        setConfirmOpen(true);

        return;
      }

      await generatePeriods();
    } catch (error) {
      console.error(error);

      setNotification({
        type: "error",
        message:
          "Terjadi kesalahan saat membuat billing period.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function generatePeriods() {
    setIsLoading(true);

    try {
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

      const generateResult =
        await generateResponse.json();

      if (!generateResponse.ok) {
        setNotification({
          type: "error",
          message:
            generateResult.message ??
            "Gagal membuat billing period.",
        });

        return;
      }

      setNotification({
        type: "success",
        message:
          generateResult.message ||
          "Billing period berhasil dibuat.",
      });

      setIsOpen(false);
      setConfirmOpen(false);

      router.refresh();
    } catch (error) {
      console.error(error);

      setNotification({
        type: "error",
        message:
          "Terjadi kesalahan saat membuat billing period.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleConfirmGenerate() {
    generatePeriods();
  }

  function handleCancelConfirm() {
    setConfirmOpen(false);
  }

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
        <div
          className="confirm-dialog-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !isLoading
            ) {
              setIsOpen(false);
            }
          }}
        >
          <div
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="generate-period-title"
          >
            <div className="confirm-dialog-content">
              <h2 id="generate-period-title">
                Generate Billing Period
              </h2>

              <p>
                Pilih tahun yang ingin dibuat.
              </p>

              <ResponsiveSelect
                id="year"
                name="period-year"
                value={String(selectedYear)}
                options={years.map((year) => ({
                  value: String(year),
                  label: String(year),
                }))}
                disabled={isLoading}
              />
            </div>

            <div className="confirm-dialog-actions">
              <button
                type="button"
                className="secondary-button"
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

      <ConfirmDialog
        open={confirmOpen}
        title="Generate Billing Period"
        message={
          `Sebagian billing period tahun ${selectedYear} sudah ada.\n\n` +
          `${existingCount} bulan sudah ada dan ` +
          `${missingCount} bulan belum ada.\n\n` +
          `Apakah tetap generate bulan yang belum ada?`
        }
        confirmText="Generate"
        loading={isLoading}
        onConfirm={handleConfirmGenerate}
        onCancel={handleCancelConfirm}
      />

      <Notification
        open={notification !== null}
        type={notification?.type}
        message={notification?.message || ""}
        onClose={() => setNotification(null)}
      />
    </>
  );
}