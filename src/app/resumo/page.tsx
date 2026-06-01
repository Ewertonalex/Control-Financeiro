"use client";
import { useEffect, useMemo, useState } from 'react';
import { format, setMonth, setYear, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, ArrowRight, TrendingDown, TrendingUp, Wallet, CalendarDays } from 'lucide-react';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Legend,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { Transaction } from '@/types/finance';
import { MONTHLY_STORAGE_KEY } from '@/types/finance';

ChartJS.register(BarElement, CategoryScale, LinearScale, Legend, Tooltip);

const MONTH_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

const FULL_MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export default function ResumoPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [allData, setAllData] = useState<Record<string, Transaction[]>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MONTHLY_STORAGE_KEY);
      if (raw) setAllData(JSON.parse(raw) as Record<string, Transaction[]>);
    } catch {}
  }, []);

  const monthlyStats = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const key = `${year}-${String(i + 1).padStart(2, '0')}`;
      const txs = allData[key] ?? [];
      const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const balance = income - expense;
      const hasData = txs.length > 0;
      return { key, month: MONTH_NAMES[i], fullMonth: FULL_MONTH_NAMES[i], income, expense, balance, hasData };
    });
  }, [allData, year]);

  const totals = useMemo(() => ({
    income: monthlyStats.reduce((s, m) => s + m.income, 0),
    expense: monthlyStats.reduce((s, m) => s + m.expense, 0),
    balance: monthlyStats.reduce((s, m) => s + m.balance, 0),
    monthsWithData: monthlyStats.filter(m => m.hasData).length,
  }), [monthlyStats]);

  const chartData = useMemo(() => ({
    labels: MONTH_NAMES,
    datasets: [
      {
        label: 'Receitas',
        data: monthlyStats.map(m => m.income),
        backgroundColor: 'rgba(16, 185, 129, 0.7)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Despesas',
        data: monthlyStats.map(m => m.expense),
        backgroundColor: 'rgba(239, 68, 68, 0.7)',
        borderColor: 'rgba(239, 68, 68, 1)',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  }), [monthlyStats]);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button className="btn-outline" onClick={() => setYear(y => y - 1)} aria-label="Ano anterior">
            <ArrowLeft className="size-4" />
          </button>
          <h1 className="text-2xl font-semibold">Resumo {year}</h1>
          <button className="btn-outline" onClick={() => setYear(y => y + 1)} aria-label="Próximo ano">
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 md:p-5">
          <div className="flex items-center gap-2 text-sm text-muted mb-1">
            <TrendingUp className="size-4 text-success" /> Receitas totais
          </div>
          <p className="text-2xl font-semibold text-success">{fmt(totals.income)}</p>
        </div>
        <div className="card p-4 md:p-5">
          <div className="flex items-center gap-2 text-sm text-muted mb-1">
            <TrendingDown className="size-4 text-danger" /> Despesas totais
          </div>
          <p className="text-2xl font-semibold text-danger">{fmt(totals.expense)}</p>
        </div>
        <div className="card p-4 md:p-5">
          <div className="flex items-center gap-2 text-sm text-muted mb-1">
            <Wallet className="size-4 text-primary" /> Saldo no ano
          </div>
          <p className={`text-2xl font-semibold ${totals.balance >= 0 ? 'text-success' : 'text-danger'}`}>
            {fmt(totals.balance)}
          </p>
        </div>
        <div className="card p-4 md:p-5">
          <div className="flex items-center gap-2 text-sm text-muted mb-1">
            <CalendarDays className="size-4 text-primary" /> Meses com dados
          </div>
          <p className="text-2xl font-semibold">{totals.monthsWithData} <span className="text-base text-muted font-normal">/ 12</span></p>
        </div>
      </div>

      {/* Gráfico de barras */}
      <div className="card p-4 md:p-6">
        <p className="text-sm text-muted mb-4">Receitas × Despesas mensais — {year}</p>
        {totals.monthsWithData === 0 ? (
          <p className="text-sm text-muted text-center py-10">Nenhum dado encontrado para {year}.</p>
        ) : (
          <Bar
            data={chartData}
            options={{
              responsive: true,
              plugins: {
                legend: { labels: { color: '#e5e7eb' } },
                tooltip: {
                  callbacks: {
                    label: ctx => ` ${ctx.dataset.label}: ${(ctx.raw as number).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
                  },
                },
              },
              scales: {
                x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: {
                  ticks: {
                    color: '#94a3b8',
                    callback: v => (v as number).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                  },
                  grid: { color: 'rgba(255,255,255,0.05)' },
                },
              },
            }}
          />
        )}
      </div>

      {/* Tabela mensal */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <p className="font-medium">Detalhamento mensal</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-muted">
                <th className="text-left px-4 py-3 font-medium">Mês</th>
                <th className="text-right px-4 py-3 font-medium">Receitas</th>
                <th className="text-right px-4 py-3 font-medium">Despesas</th>
                <th className="text-right px-4 py-3 font-medium">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {monthlyStats.map((m, i) => (
                <tr
                  key={m.key}
                  className={`border-b border-white/5 last:border-0 transition-colors ${m.hasData ? 'hover:bg-white/5' : 'opacity-40'}`}
                >
                  <td className="px-4 py-3 font-medium">{m.fullMonth}</td>
                  <td className="px-4 py-3 text-right text-success">
                    {m.hasData ? fmt(m.income) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-danger">
                    {m.hasData ? fmt(m.expense) : '—'}
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${m.hasData ? (m.balance >= 0 ? 'text-success' : 'text-danger') : ''}`}>
                    {m.hasData ? fmt(m.balance) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/10 font-semibold">
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3 text-right text-success">{fmt(totals.income)}</td>
                <td className="px-4 py-3 text-right text-danger">{fmt(totals.expense)}</td>
                <td className={`px-4 py-3 text-right ${totals.balance >= 0 ? 'text-success' : 'text-danger'}`}>
                  {fmt(totals.balance)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
