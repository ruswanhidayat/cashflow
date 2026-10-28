"use client";

import { useRef, useState } from "react";

import ConfirmDialog from "@/app/components/confirm-dialog";

type NotificationType = "success" | "error";

type GenerateBillsButtonProps = {
  periodId: number;
  periodStatus: string;
  billGenerationStatus: string;
  onGenerated: () => Promise<void>;
  onNotify: (
    type: NotificationType,
    message: string
  ) => void;
};

export default function GenerateBillsButton({
  periodId,
  periodStatus,
  billGenerationStatus,
  onGenerated,
  onNotify,
}: GenerateBillsButtonProps) {
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const requestInProgress = useRef(false);

  const canGenerate =
    periodStatus === "OPEN" &&
    (
      billGenerationStatus === "NOT_GENERATED" ||
      billGenerationStatus === "PARTIAL"
    );

  if (periodStatus === "CLOSED") {
    return (
      <span className="generate-bills-completed">
        ✓
      </span>
    );
  }

  if (!canGenerate) {
    return (
      <span className="generate-bills-disabled">
        —
      </span>
    );
  }

  function handleGenerateClick() {
    if (requestInProgress.current) {
      return;
    }

    setConfirmOpen(true);
  }

  async function handleGenerate() {
    if (requestInProgress.current) {
      return;
    }

    requestInProgress.current = true;
    setConfirmOpen(false);
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
        onNotify(
          "error",
          data.message ||
            "Gagal melakukan generate bills."
        );

        return;
      }

      onNotify(
        "success",
        data.message ||
          "Bills berhasil di-generate."
      );

      await onGenerated();
    } catch (error) {
      console.error("Generate bills error:", error);

      onNotify(
        "error",
        "Terjadi kesalahan saat melakukan generate bills."
      );
    } finally {
      requestInProgress.current = false;
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="generate-bills-button"
        onClick={handleGenerateClick}
        disabled={loading}
      >
        {loading
          ? "Generating..."
          : billGenerationStatus === "PARTIAL"
            ? "Generate Lagi"
            : "Generate Bills"}
      </button>

      <ConfirmDialog
        open={confirmOpen}
        title={
          billGenerationStatus === "PARTIAL"
            ? "Generate Ulang Bills"
            : "Generate Bills"
        }
        message={
          billGenerationStatus === "PARTIAL"
            ? "Generate ulang bills untuk billing period ini?"
            : "Generate bills untuk billing period ini?"
        }
        confirmText="Generate"
        loading={loading}
        onConfirm={handleGenerate}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}