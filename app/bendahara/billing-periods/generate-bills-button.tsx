"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type GenerateBillsButtonProps = {
  periodId: number;
  periodStatus: string;
  billGenerationStatus: string;
};

export default function GenerateBillsButton({
  periodId,
  periodStatus,
  billGenerationStatus,
}: GenerateBillsButtonProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const canGenerate =
    periodStatus === "DRAFT" &&
    (
      billGenerationStatus === "NOT_GENERATED" ||
      billGenerationStatus === "PARTIAL"
    );

  if (!canGenerate) {
    return (
      <span className="generate-bills-completed">
        ✓
      </span>
    );
  }

  async function handleGenerate() {
    const confirmed = window.confirm(
      billGenerationStatus === "PARTIAL"
        ? "Generate ulang bills untuk billing period ini?"
        : "Generate bills untuk billing period ini?"
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/billing-periods/${periodId}/generate-bills`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.message ||
            "Gagal melakukan generate bills."
        );
        return;
      }

      alert(
        data.message ||
          "Bills berhasil di-generate."
      );

      router.refresh();
    } catch (error) {
      console.error(
        "Generate bills error:",
        error
      );

      alert(
        "Terjadi kesalahan saat melakukan generate bills."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className="generate-bills-button"
      onClick={handleGenerate}
      disabled={loading}
    >
      {loading
        ? "Generating..."
        : billGenerationStatus === "PARTIAL"
          ? "Generate Lagi"
          : "Generate Bills"}
    </button>
  );
}