"use client";
import { Check, Edit3, Plus, Trash2, XCircle } from 'lucide-react';
import { useState } from 'react';

type Transaction = {
  id: string;
  type: 'income' | 'expense';
  title: string;
  amount: number;
  paid?: boolean;
};

export function Transactions({
  items,
  onUpsert,
  onRemove,
  onTogglePaid,
}: {
  items: Transaction[];
  onUpsert: (item: Transaction) => void;
  onRemove: (id: string) => void;
  onTogglePaid: (id: string) => void;
}) {
  const incomes = items.filter(i => i.type === 'income');
  const expenses = items.filter(i => i.type === 'expense');

  const [modalOpen, setModalOpen] = useState<false | 'income' | 'expense'>(false);
  const [formTitle, setFormTitle] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [editing, setEditing] = useState<Transaction | null>(null);

  function edit(item: Transaction) {
    setEditing(item);
    setFormTitle(item.title);
    setFormAmount(String(item.amount));
    setModalOpen(item.type);
  }

  function openModal(type: 'income' | 'expense') {
    setFormTitle('');
    setFormAmount('');
    setEditing(null);
    setModalOpen(type);
  }

  function submitModal() {
    if (!modalOpen) return;
    const title = formTitle.trim();
    if (!title) return;
    const amount = Number(formAmount.replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) return;
    if (editing) {
      onUpsert({ ...editing, title, amount });
    } else {
      onUpsert({ id: crypto.randomUUID(), title, amount, type: modalOpen, paid: modalOpen === 'expense' ? false : undefined });
    }
    setModalOpen(false);
    setEditing(null);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  <p className="text-sm text-success">{item.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="btn-outline" onClick={() => edit(item)} aria-label="Editar"><Edit3 className="size-4" /></button>
                  <button className="btn-outline" onClick={() => onRemove(item.id)} aria-label="Excluir"><Trash2 className="size-4" /></button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
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
              <li key={item.id} className="py-3 flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium flex items-center gap-2">
                    {item.paid ? <span className="text-success"><Check className="size-4" /></span> : null}
                    {item.title}
                  </p>
                  <p className={"text-sm " + (item.paid ? 'text-muted line-through' : 'text-danger')}>
                    {item.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="btn-outline"
                    onClick={() => onTogglePaid(item.id)}
                    aria-label={item.paid ? 'Cancelar pagamento' : 'Marcar como pago'}
                    title={item.paid ? 'Cancelar pagamento' : 'Marcar como pago'}
                  >
                    {item.paid ? <XCircle className="size-4" /> : <Check className="size-4" />}
                  </button>
                  <button className="btn-outline" onClick={() => edit(item)} aria-label="Editar"><Edit3 className="size-4" /></button>
                  <button className="btn-outline" onClick={() => onRemove(item.id)} aria-label="Excluir"><Trash2 className="size-4" /></button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setModalOpen(false)} />
          <div className="relative z-10 card w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">
              {editing
                ? (modalOpen === 'income' ? 'Editar receita' : 'Editar despesa')
                : (modalOpen === 'income' ? 'Adicionar receita' : 'Adicionar despesa')}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted">Descrição</label>
                <input
                  className="mt-1 w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-white/20"
                  placeholder="Ex.: Salário, Aluguel"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-muted">Valor</label>
                <input
                  className="mt-1 w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-white/20"
                  placeholder="Ex.: 1.200,50"
                  inputMode="decimal"
                  value={formAmount}
                  onChange={e => setFormAmount(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button className="btn-outline" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button className="btn-primary" onClick={submitModal}>Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


