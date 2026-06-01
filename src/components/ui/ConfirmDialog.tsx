"use client";
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Excluir',
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative z-10 card w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="size-5 text-warning shrink-0" />
          <h3 className="font-semibold">{title}</h3>
        </div>
        <p className="text-sm text-muted">{message}</p>
        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-outline" onClick={onCancel}>Cancelar</button>
          <button
            className={`btn-primary ${danger ? 'bg-danger! hover:bg-danger/90!' : ''}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
