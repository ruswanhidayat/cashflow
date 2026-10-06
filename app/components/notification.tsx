"use client";

import { useEffect } from "react";

type NotificationType =
  | "success"
  | "error"
  | "warning"
  | "info";

type NotificationProps = {
  open: boolean;
  type?: NotificationType;
  message: string;
  onClose: () => void;
};

export default function Notification({
  open,
  type = "info",
  message,
  onClose,
}: NotificationProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => {
      clearTimeout(timer);
    };
  }, [open, message, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className={`notification notification-${type}`}
      role="alert"
    >
      <div className="notification-content">
        <span className="notification-icon">
          {type === "success" && "✓"}
          {type === "error" && "!"}
          {type === "warning" && "!"}
          {type === "info" && "i"}
        </span>

        <span className="notification-message">
          {message}
        </span>
      </div>

      <button
        type="button"
        className="notification-close"
        onClick={onClose}
        aria-label="Tutup notifikasi"
      >
        ×
      </button>
    </div>
  );
}