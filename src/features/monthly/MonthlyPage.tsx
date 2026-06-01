"use client";
import { addMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, FileDown, Repeat, Trash2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Transactions } from './Transactions';
import { Toast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { Transaction } from '@/types/finance';
import { MONTHLY_STORAGE_KEY, adjustDueDateToMonth } from '@/types/finance';

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function MonthlyPage() {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [transactionsByMonth, setTransactionsByMonth] = useState<Record<string, Transaction[]>>({});
  const [notice, setNotice] = useState<null | { message: string; type: 'success' | 'info' | 'danger' }>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmReplicateNext, setConfirmReplicateNext] = useState(false);
  const [confirmReplicatePrev, setConfirmReplicatePrev] = useState(false);
  const printRef = useRef<HTMLDivElement | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const now = useClock();

  const key = useMemo(() => format(currentMonth, 'yyyy-MM'), [currentMonth]);
  const transactions = transactionsByMonth[key] ?? [];

  useEffect(() => {
    const api = (typeof window !== 'undefined' ? (window as any).api : null);
    if (api?.monthly) {
      (async () => {
        const currentKey = format(new Date(), 'yyyy-MM');
        const data = await api.monthly.get(currentKey);
        setTransactionsByMonth({ [currentKey]: data });
        setHydrated(true);
      })();
      return;
    }
    try {
      const raw = localStorage.getItem(MONTHLY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, Transaction[]>;
        setTransactionsByMonth(parsed);
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const api = (typeof window !== 'undefined' ? (window as any).api : null);
    if (!api?.monthly) {
      try { localStorage.setItem(MONTHLY_STORAGE_KEY, JSON.stringify(transactionsByMonth)); } catch {}
    }
  }, [transactionsByMonth, hydrated]);

  useEffect(() => {
    const api = (typeof window !== 'undefined' ? (window as any).api : null);
    if (!api?.monthly) return;
    (async () => {
      const data = await api.monthly.get(key);
      setTransactionsByMonth(prev => ({ ...prev, [key]: data }));
    })();
  }, [key]);

  const totalIncome = useMemo(
    () => transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
    [transactions]
  );
  const totalExpenseAll = useMemo(
    () => transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
    [transactions]
  );
  const totalExpensePaid = useMemo(
    () => transactions.filter(t => t.type === 'expense' && (t.paid ?? false)).reduce((sum, t) => sum + t.amount, 0),
    [transactions]
  );
  const balance = useMemo(() => totalIncome - totalExpensePaid, [totalIncome, totalExpensePaid]);
  const projectedBalance = useMemo(() => totalIncome - totalExpenseAll, [totalIncome, totalExpenseAll]);

  function moveMonth(diff: number) {
    setCurrentMonth(prev => addMonths(prev, diff));
  }

  async function upsertSingle(monthKey: string, tx: Transaction) {
    const api = (typeof window !== 'undefined' ? (window as any).api : null);
    if (api?.monthly) {
      const list = await api.monthly.upsert(monthKey, tx);
      setTransactionsByMonth(prev => ({ ...prev, [monthKey]: list }));
    } else {
      setTransactionsByMonth(prev => {
        const list = prev[monthKey] ? [...prev[monthKey]] : [];
        const idx = list.findIndex(i => i.id === tx.id);
        if (idx >= 0) list[idx] = tx; else list.push(tx);
        return { ...prev, [monthKey]: list };
      });
    }
  }

  async function upsert(tx: Transaction, isNew: boolean) {
    // Se é nova despesa recorrente, propaga para os próximos 24 meses
    if (isNew && tx.recurring && tx.recurringId) {
      for (let i = 1; i <= 24; i++) {
        const futureMonth = addMonths(currentMonth, i);
        const futureKey = format(futureMonth, 'yyyy-MM');
        const futureDueDate = tx.dueDate
          ? adjustDueDateToMonth(tx.dueDate, futureKey)
          : undefined;
        const futureTx: Transaction = {
          ...tx,
          id: crypto.randomUUID(),
          dueDate: futureDueDate,
          paid: false,
        };
        await upsertSingle(futureKey, futureTx);
      }
    }
    await upsertSingle(key, tx);
  }

  async function remove(id: string) {
    const api = (typeof window !== 'undefined' ? (window as any).api : null);
    if (api?.monthly) {
      const list = await api.monthly.remove(key, id);
      setTransactionsByMonth(prev => ({ ...prev, [key]: list }));
    } else {
      setTransactionsByMonth(prev => {
        const list = (prev[key] ?? []).filter(t => t.id !== id);
        return { ...prev, [key]: list };
      });
    }
  }

  async function togglePaid(id: string) {
    const api = (typeof window !== 'undefined' ? (window as any).api : null);
    if (api?.monthly) {
      const list = await api.monthly.togglePaid(key, id);
      setTransactionsByMonth(prev => ({ ...prev, [key]: list }));
    } else {
      setTransactionsByMonth(prev => {
        const list = (prev[key] ?? []).map(t =>
          t.id === id ? { ...t, paid: !(t.paid ?? false) } : t
        );
        return { ...prev, [key]: list };
      });
    }
  }

  async function cancelRecurrence(recurringId: string) {
    const api = (typeof window !== 'undefined' ? (window as any).api : null);
    if (api?.monthly) {
      await api.monthly.cancelRecurrence(key, recurringId);
    }
    // Remove do mês SEGUINTE em diante (mês atual mantém a despesa)
    setTransactionsByMonth(prev => {
      const updated = { ...prev };
      for (const monthKey of Object.keys(updated)) {
        if (monthKey > key) {
          updated[monthKey] = (updated[monthKey] ?? []).filter(
            t => t.recurringId !== recurringId
          );
        }
      }
      return updated;
    });
    notify('Recorrência cancelada. A despesa some a partir do próximo mês.', 'info');
  }

  function handleReplicateNextClick() {
    const nextKey = format(addMonths(currentMonth, 1), 'yyyy-MM');
    const nextList = transactionsByMonth[nextKey] ?? [];
    if (nextList.length > 0) setConfirmReplicateNext(true);
    else doReplicate(1);
  }

  function handleReplicatePrevClick() {
    const prevKey = format(addMonths(currentMonth, -1), 'yyyy-MM');
    const prevList = transactionsByMonth[prevKey] ?? [];
    if (prevList.length > 0) setConfirmReplicatePrev(true);
    else doReplicate(-1);
  }

  async function doReplicate(direction: 1 | -1) {
    const targetMonth = addMonths(currentMonth, direction);
    const targetKey = format(targetMonth, 'yyyy-MM');
    const api = (typeof window !== 'undefined' ? (window as any).api : null);
    if (api?.monthly) {
      await api.monthly.replicate(key, targetKey);
      const data = await api.monthly.get(targetKey);
      setTransactionsByMonth(prev => ({ ...prev, [targetKey]: data }));
    } else {
      const cloned = transactions.map(t => ({
        ...t,
        id: crypto.randomUUID(),
        paid: t.type === 'expense' ? false : undefined,
        dueDate: t.dueDate ? adjustDueDateToMonth(t.dueDate, targetKey) : undefined,
      }));
      setTransactionsByMonth(prev => ({ ...prev, [targetKey]: cloned }));
    }
    const label = format(targetMonth, "LLLL 'de' yyyy", { locale: ptBR });
    notify(`Dados replicados para ${label}.`, 'success');
  }

  async function exportToPdf() {
    const node = printRef.current;
    if (!node) return;
    node.classList.add('print-safe');
    await new Promise(r => requestAnimationFrame(() => r(undefined)));
    const canvas = await html2canvas(node, {
      scale: 2, backgroundColor: '#0B1220', useCORS: true,
    }).finally(() => node.classList.remove('print-safe'));
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let position = 0;
    let heightLeft = imgHeight;
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;
    while (heightLeft > -1) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
    }
    pdf.save(`controle-financeiro-${key}.pdf`);
    notify('PDF exportado com sucesso.', 'success');
  }

  async function clearCurrentMonth() {
    const api = (typeof window !== 'undefined' ? (window as any).api : null);
    if (api?.monthly) await api.monthly.clear(key);
    setTransactionsByMonth(prev => ({ ...prev, [key]: [] }));
    notify('Dados do mês foram limpos.', 'info');
  }

  function notify(message: string, type: 'success' | 'info' | 'danger' = 'success') {
    setNotice({ message, type });
    window.setTimeout(() => setNotice(null), 2500);
  }

  const clockStr = now
    ? (() => {
        const s = format(now, "EEEE, dd 'de' MMM · HH:mm:ss", { locale: ptBR });
        return s.charAt(0).toUpperCase() + s.slice(1);
      })()
    : null;

  return (
    <>
      <div ref={printRef} className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <button className="btn-outline" onClick={() => moveMonth(-1)} aria-label="Mês anterior">
                <ArrowLeft className="size-4" />
              </button>
              <h1 className="text-2xl font-semibold">
                {format(currentMonth, "LLLL 'de' yyyy", { locale: ptBR })}
              </h1>
              <button className="btn-outline" onClick={() => moveMonth(1)} aria-label="Próximo mês">
                <ArrowRight className="size-4" />
              </button>
            </div>
            {clockStr && (
              <p className="text-xs text-muted pl-1">{clockStr}</p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button className="btn-outline" onClick={handleReplicatePrevClick} title="Replicar para o mês anterior">
              <ArrowLeft className="size-4" /><Repeat className="size-4" /> Mês anterior
            </button>
            <button className="btn-outline" onClick={handleReplicateNextClick} title="Replicar para o próximo mês">
              <Repeat className="size-4" /><ArrowRight className="size-4" /> Próximo mês
            </button>
            <button
              className="btn-outline text-danger border-danger/40 hover:bg-danger/10"
              onClick={() => setConfirmClear(true)}
            >
              <Trash2 className="size-4" /> Limpar mês
            </button>
            <button className="btn-primary" onClick={exportToPdf}>
              <FileDown className="size-4" /> Exportar PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4 md:p-5">
            <p className="text-sm text-muted">Receitas</p>
            <p className="mt-1 text-2xl font-semibold text-success">
              {totalIncome.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
          <div className="card p-4 md:p-5">
            <p className="text-sm text-muted">Despesas</p>
            <p className="mt-1 text-2xl font-semibold text-danger">
              {totalExpenseAll.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
          <div className="card p-4 md:p-5">
            <p className="text-sm text-muted">Saldo (pagas)</p>
            <p className={`mt-1 text-2xl font-semibold ${balance >= 0 ? 'text-success' : 'text-danger'}`}>
              {balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
          <div className="card p-4 md:p-5">
            <p className="text-sm text-muted">Saldo previsto</p>
            <p className={`mt-1 text-2xl font-semibold ${projectedBalance >= 0 ? 'text-success' : 'text-danger'}`}>
              {projectedBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        </div>

        <Transactions
          items={transactions}
          onUpsert={upsert}
          onRemove={remove}
          onTogglePaid={togglePaid}
          onCancelRecurrence={cancelRecurrence}
        />
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="Limpar mês"
        message={`Tem certeza que deseja apagar todos os lançamentos de ${format(currentMonth, "LLLL 'de' yyyy", { locale: ptBR })}? Essa ação não pode ser desfeita.`}
        confirmLabel="Limpar"
        onConfirm={() => { setConfirmClear(false); clearCurrentMonth(); }}
        onCancel={() => setConfirmClear(false)}
      />

      <ConfirmDialog
        open={confirmReplicateNext}
        title="Replicar para próximo mês"
        message="O próximo mês já possui lançamentos. Deseja substituí-los pelos do mês atual?"
        confirmLabel="Substituir"
        danger={false}
        onConfirm={() => { setConfirmReplicateNext(false); doReplicate(1); }}
        onCancel={() => setConfirmReplicateNext(false)}
      />

      <ConfirmDialog
        open={confirmReplicatePrev}
        title="Replicar para mês anterior"
        message="O mês anterior já possui lançamentos. Deseja substituí-los pelos do mês atual?"
        confirmLabel="Substituir"
        danger={false}
        onConfirm={() => { setConfirmReplicatePrev(false); doReplicate(-1); }}
        onCancel={() => setConfirmReplicatePrev(false)}
      />

      {notice && <Toast message={notice.message} type={notice.type} />}
    </>
  );
}
