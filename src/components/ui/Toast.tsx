"use client";
import { CheckCircle2, Info, XCircle } from 'lucide-react';

export type ToastType = 'success' | 'info' | 'danger';

export function Toast({ message, type }: { message: string; type: ToastType }) {
  return (
    <div className="fixed right-6 bottom-6 z-50">
      <div className="card px-4 py-3 flex items-center gap-3 shadow-lg">
        {type === 'success' && <CheckCircle2 className="size-5 text-success shrink-0" />}
        {type === 'info' && <Info className="size-5 text-primary shrink-0" />}
        {type === 'danger' && <XCircle className="size-5 text-danger shrink-0" />}
        <span className="text-sm">{message}</span>
      </div>
    </div>
  );
}
