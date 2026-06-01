export type Transaction = {
  id: string;
  type: 'income' | 'expense';
  title: string;
  amount: number;
  paid?: boolean;
  dueDate?: string;      // yyyy-MM-dd — data de vencimento (opcional)
  recurring?: boolean;   // despesa recorrente (fixa todo mês)
  recurringId?: string;  // ID compartilhado entre todas as instâncias recorrentes
};

export type Card = {
  id: string;
  name: string;
  bank: string;
  color: string;
};

export type Purchase = {
  id: string;
  cardId: string;
  title: string;
  startMonthKey: string;
  totalInstallments: number;
  currentInstallmentAtStart: number;
  installmentAmount: number;
};

export const MONTHLY_STORAGE_KEY = 'controle-financeiro:v1';
export const CARDS_STORAGE_KEY = 'ccards:v1';

export function formatCurrencyInput(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function parseCurrencyInput(value: string): number {
  return Number(value.replace(/\./g, '').replace(',', '.'));
}

/** Ajusta a data de vencimento para o mês alvo, mantendo o mesmo dia (ou último dia do mês) */
export function adjustDueDateToMonth(dueDate: string, targetMonthKey: string): string {
  const day = parseInt(dueDate.split('-')[2]);
  const [yr, mo] = targetMonthKey.split('-').map(Number);
  const lastDay = new Date(yr, mo, 0).getDate();
  const adjustedDay = Math.min(day, lastDay);
  return `${targetMonthKey}-${String(adjustedDay).padStart(2, '0')}`;
}
