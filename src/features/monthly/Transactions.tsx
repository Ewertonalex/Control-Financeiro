"use client";
import { Check, Edit3, Plus, RefreshCw, Trash2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { Transaction } from '@/types/finance';
import { formatCurrencyInput, parseCurrencyInput } from '@/types/finance';

export function Transactions({
  items,
  onUpsert,
  onRemove,
  onTogglePaid,
  onCancelRecurrence,
}: {
  items: Transaction[];
  onUpsert: (item: Transaction, isNew: boolean) => void;
  onRemove: (id: string) => void;
  onTogglePaid: (id: string) => void;
  onCancelRecurrence: (recurringId: string) => void;
}) {
  const incomes = items.filter(i => i.type === 'income');
  const expenses = items.filter(i => i.type === 'expense');

  const [modalOpen, setModalOpen] = useState<false | 'income' | 'expense'>(false);
  const [formTitle, setFormTitle] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formRecurring, setFormRecurring] = useState(false);
  const [formErrors, setFormErrors] = useState<{ title?: string; amount?: string }>({});
  const [editing, setEditing] = useState<Transaction | null>(null);

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingCancelRecurringId, setPendingCancelRecurringId] = useState<string | null>(null);

  function edit(item: Transaction) {
    setEditing(item);
    setFormTitle(item.title);
    setFormAmount(formatCurrencyInput(item.amount));
    setFormDueDate(item.dueDate ?? '');
    setFormRecurring(item.recurring ?? false);
    setFormErrors({});
    setModalOpen(item.type);
  }

  function openModal(type: 'income' | 'expense') {
    setFormTitle('');
    setFormAmount('');
    setFormDueDate('');
    setFormRecurring(false);
    setFormErrors({});
    setEditing(null);
    setModalOpen(type);
  }

  function validate(): boolean {
    const errors: { title?: string; amount?: string } = {};
    if (!formTitle.trim()) errors.title = 'Informe uma descrição.';
    const amount = parseCurrencyInput(formAmount);
    if (!formAmount.trim()) {
      errors.amount = 'Informe o valor.';
    } else if (!Number.isFinite(amount) || amount <= 0) {
      errors.amount = 'Valor inválido. Ex.: 1.200,50';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function submitModal() {
    if (!modalOpen) return;
    if (!validate()) return;
    const title = formTitle.trim();
    const amount = parseCurrencyInput(formAmount);
    const isNew = !editing;

    if (editing) {
      onUpsert({ ...editing, title, amount, dueDate: formDueDate || undefined, recurring: editing.recurring }, false);
    } else {
      const recurringId = formRecurring ? crypto.randomUUID() : undefined;
      onUpsert({
        id: crypto.randomUUID(),
        title,
        amount,
        type: modalOpen,
        paid: modalOpen === 'expense' ? false : undefined,
        dueDate: formDueDate || undefined,
        recurring: formRecurring || undefined,
        recurringId,
      }, isNew);
    }
    setModalOpen(false);
    setEditing(null);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') submitModal();
    if (e.key === 'Escape') setModalOpen(false);
  }

  const pendingItem = pendingDeleteId ? items.find(i => i.id === pendingDeleteId) : null;

  function formatDueDate(dueDate: string) {
    try {
      return format(parseISO(dueDate), "dd/MM", { locale: ptBR });
    } catch { return dueDate; }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Receitas */}
      <div>
        <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
          <h2 className="text-lg font-medium">Receitas</h2>
          <button className="btn-primary" onClick={() => openModal('income')}>
            <Plus className="size-4" /> Adicionar receita
          </button>
        </div>
        <div className="card p-4">
          <ul className="divide-y divide-white/10">
            {incomes.length === 0 && (
              <li className="py-6 text-sm text-muted text-center">Nenhuma receita adicionada</li>
            )}
            {incomes.map(item => (
              <li key={item.id} className="py-3 flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-success">
                    {item.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="btn-outline" onClick={() => edit(item)} aria-label="Editar">
                    <Edit3 className="size-4" />
                  </button>
                  <button
                    className="btn-outline text-danger border-danger/30 hover:bg-danger/10"
                    onClick={() => setPendingDeleteId(item.id)}
                    aria-label="Excluir"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Despesas */}
      <div>
        <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
          <h2 className="text-lg font-medium">Despesas</h2>
          <button className="btn-primary" onClick={() => openModal('expense')}>
            <Plus className="size-4" /> Adicionar despesa
          </button>
        </div>
        <div className="card p-4">
          <ul className="divide-y divide-white/10">
            {expenses.length === 0 && (
              <li className="py-6 text-sm text-muted text-center">Nenhuma despesa adicionada</li>
            )}
            {expenses.map(item => (
              <li key={item.id} className="py-3 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium flex items-center gap-2 flex-wrap">
                    {item.paid ? <Check className="size-4 text-success shrink-0" /> : null}
                    <span>{item.title}</span>
                    {item.recurring && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary shrink-0">
                        <RefreshCw className="size-3" /> Recorrente
                      </span>
                    )}
                  </p>
                  <div className="flex items-center gap-3 flex-wrap mt-0.5">
                    <p className={`text-sm ${item.paid ? 'text-muted line-through' : 'text-danger'}`}>
                      {item.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                    {item.dueDate && (
                      <span className="text-xs text-muted">
                        Vence: <span className="text-warning">{formatDueDate(item.dueDate)}</span>
                      </span>
                    )}
                    {item.recurring && item.recurringId && (
                      <button
                        className="text-xs text-muted hover:text-danger underline underline-offset-2 transition-colors"
                        onClick={() => setPendingCancelRecurringId(item.recurringId!)}
                        title="Cancelar recorrência a partir deste mês"
                      >
                        Cancelar recorrência
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    className="btn-outline"
                    onClick={() => onTogglePaid(item.id)}
                    aria-label={item.paid ? 'Cancelar pagamento' : 'Marcar como pago'}
                    title={item.paid ? 'Cancelar pagamento' : 'Marcar como pago'}
                  >
                    {item.paid ? <XCircle className="size-4" /> : <Check className="size-4" />}
                  </button>
                  <button className="btn-outline" onClick={() => edit(item)} aria-label="Editar">
                    <Edit3 className="size-4" />
                  </button>
                  <button
                    className="btn-outline text-danger border-danger/30 hover:bg-danger/10"
                    onClick={() => setPendingDeleteId(item.id)}
                    aria-label="Excluir"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Modal adicionar/editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setModalOpen(false)} />
          <div className="relative z-10 card w-full max-w-md p-6" onKeyDown={handleKeyDown}>
            <h3 className="text-lg font-semibold mb-4">
              {editing
                ? (modalOpen === 'income' ? 'Editar receita' : 'Editar despesa')
                : (modalOpen === 'income' ? 'Adicionar receita' : 'Adicionar despesa')}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted">Descrição</label>
                <input
                  autoFocus
                  className={`mt-1 w-full rounded-lg bg-black/20 border px-3 py-2 outline-none focus:ring-2 focus:ring-white/20 ${formErrors.title ? 'border-danger' : 'border-white/10'}`}
                  placeholder="Ex.: Salário, Aluguel"
                  value={formTitle}
                  onChange={e => { setFormTitle(e.target.value); setFormErrors(p => ({ ...p, title: undefined })); }}
                />
                {formErrors.title && <p className="mt-1 text-xs text-danger">{formErrors.title}</p>}
              </div>
              <div>
                <label className="text-sm text-muted">Valor</label>
                <input
                  className={`mt-1 w-full rounded-lg bg-black/20 border px-3 py-2 outline-none focus:ring-2 focus:ring-white/20 ${formErrors.amount ? 'border-danger' : 'border-white/10'}`}
                  placeholder="Ex.: 1.200,50"
                  inputMode="decimal"
                  value={formAmount}
                  onChange={e => { setFormAmount(e.target.value); setFormErrors(p => ({ ...p, amount: undefined })); }}
                />
                {formErrors.amount && <p className="mt-1 text-xs text-danger">{formErrors.amount}</p>}
              </div>

              {/* Data de vencimento (somente para despesas) */}
              {modalOpen === 'expense' && (
                <div>
                  <label className="text-sm text-muted">Data de vencimento <span className="text-muted/60">(opcional)</span></label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-white/20"
                    value={formDueDate}
                    onChange={e => setFormDueDate(e.target.value)}
                  />
                </div>
              )}

              {/* Recorrente (somente para novas despesas) */}
              {modalOpen === 'expense' && !editing && (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/5">
                  <input
                    type="checkbox"
                    id="recurring-check"
                    className="size-4 accent-primary cursor-pointer"
                    checked={formRecurring}
                    onChange={e => setFormRecurring(e.target.checked)}
                  />
                  <label htmlFor="recurring-check" className="text-sm cursor-pointer flex-1">
                    <span className="font-medium">Despesa recorrente</span>
                    <span className="block text-xs text-muted mt-0.5">
                      Será adicionada automaticamente nos próximos 24 meses
                    </span>
                  </label>
                  <RefreshCw className="size-4 text-primary shrink-0" />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button className="btn-outline" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button className="btn-primary" onClick={submitModal}>Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm excluir */}
      <ConfirmDialog
        open={!!pendingDeleteId}
        title="Excluir lançamento"
        message={`Deseja excluir "${pendingItem?.title}"? Essa ação não pode ser desfeita.`}
        onConfirm={() => { onRemove(pendingDeleteId!); setPendingDeleteId(null); }}
        onCancel={() => setPendingDeleteId(null)}
      />

      {/* Confirm cancelar recorrência */}
      <ConfirmDialog
        open={!!pendingCancelRecurringId}
        title="Cancelar recorrência"
        message="Deseja cancelar a recorrência? A despesa do mês atual é mantida, mas some a partir do mês seguinte. Os meses anteriores não são afetados."
        confirmLabel="Cancelar recorrência"
        danger={true}
        onConfirm={() => { onCancelRecurrence(pendingCancelRecurringId!); setPendingCancelRecurringId(null); }}
        onCancel={() => setPendingCancelRecurringId(null)}
      />
    </div>
  );
}
