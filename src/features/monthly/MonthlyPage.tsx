"use client";
import { addMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, FileDown, Repeat, Trash2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Transactions } from './Transactions';

type Transaction = {
  id: string;
  type: 'income' | 'expense';
  title: string;
  amount: number;
  paid?: boolean;
};

export function MonthlyPage() {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [transactionsByMonth, setTransactionsByMonth] = useState<Record<string, Transaction[]>>({});
  const [notice, setNotice] = useState<null | { message: string; type: 'success' | 'info' | 'danger' }>(null);
  const printRef = useRef<HTMLDivElement | null>(null);
  const STORAGE_KEY = 'controle-financeiro:v1';
  const [hydrated, setHydrated] = useState(false);

  const key = useMemo(() => format(currentMonth, 'yyyy-MM'), [currentMonth]);
  const transactions = transactionsByMonth[key] ?? [];
  // Persistência: Electron (IPC) ou localStorage
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
      const raw = localStorage.getItem(STORAGE_KEY);
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
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(transactionsByMonth)); } catch {}
    }
  }, [transactionsByMonth, hydrated]);

  // Carregar dados ao mudar de mês no Electron
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

  async function upsert(tx: Transaction) {
    const api = (typeof window !== 'undefined' ? (window as any).api : null);
    if (api?.monthly) {
      const list = await api.monthly.upsert(key, tx);
      setTransactionsByMonth(prev => ({ ...prev, [key]: list }));
    } else {
      setTransactionsByMonth(prev => {
        const list = prev[key] ? [...prev[key]] : [];
        const idx = list.findIndex(i => i.id === tx.id);
        if (idx >= 0) list[idx] = tx; else list.push(tx);
        return { ...prev, [key]: list };
      });
    }
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
        const list = (prev[key] ?? []).map(t => t.id === id ? { ...t, paid: !(t.paid ?? false) } : t);
        return { ...prev, [key]: list };
      });
    }
  }

  async function replicateToNextMonth() {
    const nextKey = format(addMonths(currentMonth, 1), 'yyyy-MM');
    const api = (typeof window !== 'undefined' ? (window as any).api : null);
    if (api?.monthly) {
      await api.monthly.replicate(key, nextKey);
      const data = await api.monthly.get(nextKey);
      setTransactionsByMonth(prev => ({ ...prev, [nextKey]: data }));
    } else {
      setTransactionsByMonth(prev => {
        const nextList = (prev[nextKey] ?? []);
        const cloned = transactions.map(t => ({ ...t, id: crypto.randomUUID() }));
        return { ...prev, [nextKey]: [...nextList, ...cloned] };
      });
    }
    notify(`Dados replicados para ${format(addMonths(currentMonth, 1), "LLLL 'de' yyyy", { locale: ptBR })}.`, 'success');
  }

  async function exportToPdf() {
    const node = printRef.current;
    if (!node) return;
    // aplica estilos seguros durante a captura
    node.classList.add('print-safe');
    // garante reflow antes da captura
    await new Promise(r => requestAnimationFrame(() => r(undefined)));
    const canvas = await html2canvas(node, {
      scale: 2,
      backgroundColor: '#0B1220',
      useCORS: true,
    }).finally(() => {
      node.classList.remove('print-safe');
    });
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
    if (api?.monthly) {
      await api.monthly.clear(key);
    }
    setTransactionsByMonth(prev => ({ ...prev, [key]: [] }));
    notify('Dados do mês atual foram limpos.', 'info');
  }

  function notify(message: string, type: 'success' | 'info' | 'danger' = 'success') {
    setNotice({ message, type });
    window.setTimeout(() => setNotice(null), 2500);
  }

  return (
    <>
      <div ref={printRef} className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
          <div className="flex items-center gap-2 flex-wrap">
          <button className="btn-outline" onClick={replicateToNextMonth}>
            <Repeat className="size-4" /> Replicar para próximo mês
          </button>
          <button
            className="btn-outline text-danger border-danger/40 hover:bg-danger/10"
            onClick={clearCurrentMonth}
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
          <p className="mt-1 text-2xl font-semibold text-success">{totalIncome.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
        </div>
        <div className="card p-4 md:p-5">
          <p className="text-sm text-muted">Despesas</p>
          <p className="mt-1 text-2xl font-semibold text-danger">{totalExpenseAll.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
        </div>
        <div className="card p-4 md:p-5">
          <p className="text-sm text-muted">Saldo (pagas)</p>
          <p className={"mt-1 text-2xl font-semibold " + (balance >= 0 ? 'text-success' : 'text-danger')}>
            {balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
        <div className="card p-4 md:p-5">
          <p className="text-sm text-muted">Saldo previsto</p>
          <p className={"mt-1 text-2xl font-semibold " + (projectedBalance >= 0 ? 'text-success' : 'text-danger')}>
            {projectedBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
      </div>

      <Transactions
        items={transactions}
        onUpsert={upsert}
        onRemove={remove}
        onTogglePaid={togglePaid}
      />

        {/* Botão flutuante removido: adição é feita por coluna via modal */}
      </div>

      {notice && (
        <div className="fixed right-6 bottom-6 z-50">
          <div className="card px-4 py-3 flex items-center gap-3">
            <CheckCircle2 className={"size-5 " + (notice.type === 'danger' ? 'text-danger' : 'text-success')} />
            <span className="text-sm">{notice.message}</span>
          </div>
        </div>
      )}
    </>
  );
}


