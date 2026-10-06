"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import ConfirmDialog from "@/app/components/confirm-dialog";
import Notification from "@/app/components/notification";

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
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

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
    setConfirmOpen(true);
  }

  async function handleGenerate() {
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
        setNotification({
          type: "error",
          message:
            data.message ||
            "Gagal melakukan generate bills.",
        });

        return;
      }

      setNotification({
        type: "success",
        message:
          data.message ||
          "Bills berhasil di-generate.",
      });

      router.refresh();
    } catch (error) {
      console.error(
        "Generate bills error:",
        error
      );

      setNotification({
        type: "error",
        message:
          "Terjadi kesalahan saat melakukan generate bills.",
      });
    } finally {
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

      <Notification
        open={notification !== null}
        type={notification?.type}
        message={notification?.message || ""}
        onClose={() => setNotification(null)}
      />
    </>
  );
}