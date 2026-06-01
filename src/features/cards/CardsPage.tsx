"use client";
import { useEffect, useMemo, useState } from 'react';
import { addMonths, differenceInCalendarMonths, format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowDownUp, ArrowLeft, ArrowRight, CreditCard, Edit3, Plus, Trash2,
} from 'lucide-react';
import { Chart as ChartJS, LineElement, CategoryScale, LinearScale, PointElement, Legend, Tooltip } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Toast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { Card, Purchase } from '@/types/finance';
import { CARDS_STORAGE_KEY, formatCurrencyInput, parseCurrencyInput } from '@/types/finance';

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Legend, Tooltip);

const BANK_COLORS: Record<string, string> = {
  itau: '#EC7000',
  nubank: '#820AD1',
  bradesco: '#CC092F',
  santander: '#C40000',
  bb: '#FFCC00',
  'banco do brasil': '#FFCC00',
  caixa: '#005CA9',
  inter: '#FF7A00',
  original: '#00A859',
  neon: '#00E6CC',
  c6: '#222222',
  credicard: '#0066CC',
};

const BANK_LOGOS: Record<string, string> = {
  itau: '/banks/itau.svg',
  nubank: '/banks/nubank.svg',
  'banco do brasil': '/banks/bb.svg',
  bb: '/banks/bb.svg',
};

function normalizeBankName(name: string) {
  return name.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim();
}

function bankColorFor(bank: string, fallback = '#7C3AED') {
  const key = normalizeBankName(bank);
  for (const [k, v] of Object.entries(BANK_COLORS)) {
    if (key === k || key.includes(k)) return v;
  }
  return fallback;
}

function bankLogoFor(bank: string): string | null {
  const key = normalizeBankName(bank);
  if (BANK_LOGOS[key]) return BANK_LOGOS[key];
  if (key.includes('itau')) return BANK_LOGOS.itau;
  if (key.includes('nubank')) return BANK_LOGOS.nubank;
  if (key.includes('banco do brasil') || key === 'bb') return BANK_LOGOS['banco do brasil'];
  return null;
}

function monthKey(d: Date) { return format(d, 'yyyy-MM'); }
function keyToDate(k: string) { return parse(k + '-01', 'yyyy-MM-dd', new Date()); }

function computeInstallmentIndex(p: Purchase, currentKey: string) {
  const diff = differenceInCalendarMonths(keyToDate(currentKey), keyToDate(p.startMonthKey));
  return p.currentInstallmentAtStart + diff;
}

export function CardsPage() {
  const [nowMonth, setNowMonth] = useState<Date>(new Date());
  const [cards, setCards] = useState<Card[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [notice, setNotice] = useState<null | { message: string; type: 'success' | 'info' | 'danger' }>(null);
  const [hydrated, setHydrated] = useState(false);
  const [sortDesc, setSortDesc] = useState(true);

  // Card modal
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [cardName, setCardName] = useState('');
  const [cardBank, setCardBank] = useState('');
  const [cardColor, setCardColor] = useState('#7C3AED');
  const [cardColorTouched, setCardColorTouched] = useState(false);
  const [cardErrors, setCardErrors] = useState<{ name?: string; bank?: string }>({});

  // Purchase modal
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [purchaseCardId, setPurchaseCardId] = useState('');
  const [purchaseTitle, setPurchaseTitle] = useState('');
  const [purchaseTotalInstallments, setPurchaseTotalInstallments] = useState('1');
  const [purchaseCurrentInstallment, setPurchaseCurrentInstallment] = useState('1');
  const [purchaseInstallmentAmount, setPurchaseInstallmentAmount] = useState('');
  const [purchaseErrors, setPurchaseErrors] = useState<{ title?: string; amount?: string; card?: string }>({});

  // Confirms
  const [confirmDeleteCardId, setConfirmDeleteCardId] = useState<string | null>(null);
  const [confirmDeletePurchaseId, setConfirmDeletePurchaseId] = useState<string | null>(null);

  useEffect(() => {
    const api = (typeof window !== 'undefined' ? (window as any).api : null);
    if (api?.cards && api?.purchases) {
      (async () => {
        const [cs, ps] = await Promise.all([api.cards.get(), api.purchases.get()]);
        setCards(cs ?? []);
        setPurchases(ps ?? []);
        setHydrated(true);
      })();
      return;
    }
    try {
      const raw = localStorage.getItem(CARDS_STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as { cards: Card[]; purchases: Purchase[] };
        setCards(data.cards ?? []);
        setPurchases(data.purchases ?? []);
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const api = (typeof window !== 'undefined' ? (window as any).api : null);
    if (!api?.cards || !api?.purchases) {
      try { localStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify({ cards, purchases })); } catch {}
    }
  }, [cards, purchases, hydrated]);

  const currentKey = useMemo(() => monthKey(nowMonth), [nowMonth]);

  const activePurchases = useMemo(() => purchases.filter(p => {
    const idx = computeInstallmentIndex(p, currentKey);
    return idx >= 1 && idx <= p.totalInstallments;
  }), [purchases, currentKey]);

  const totalsByCard = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of activePurchases) {
      map.set(p.cardId, (map.get(p.cardId) ?? 0) + p.installmentAmount);
    }
    return map;
  }, [activePurchases]);

  const totalAll = useMemo(
    () => Array.from(totalsByCard.values()).reduce((a, b) => a + b, 0),
    [totalsByCard]
  );

  function notify(message: string, type: 'success' | 'info' | 'danger' = 'success') {
    setNotice({ message, type });
    window.setTimeout(() => setNotice(null), 2500);
  }

  // ——— CRUD Cartões ———
  function openNewCard() {
    setEditingCard(null); setCardName(''); setCardBank('');
    setCardColor('#7C3AED'); setCardColorTouched(false); setCardErrors({});
    setCardModalOpen(true);
  }
  function openEditCard(c: Card) {
    setEditingCard(c); setCardName(c.name); setCardBank(c.bank);
    setCardColor(c.color); setCardColorTouched(true); setCardErrors({});
    setCardModalOpen(true);
  }
  function validateCard() {
    const errors: typeof cardErrors = {};
    if (!cardName.trim()) errors.name = 'Informe o nome do cartão.';
    if (!cardBank.trim()) errors.bank = 'Informe o banco.';
    setCardErrors(errors);
    return Object.keys(errors).length === 0;
  }
  async function saveCard() {
    if (!validateCard()) return;
    const name = cardName.trim();
    const bank = cardBank.trim();
    const color = cardColorTouched ? (cardColor || '#7C3AED') : bankColorFor(bank, cardColor || '#7C3AED');
    const api = (typeof window !== 'undefined' ? (window as any).api : null);
    const card = editingCard
      ? { ...editingCard, name, bank, color }
      : { id: crypto.randomUUID(), name, bank, color };
    if (api?.cards) {
      const list = await api.cards.upsert(card);
      setCards(list ?? []);
    } else {
      if (editingCard) {
        setCards(prev => prev.map(c => c.id === editingCard.id ? { ...c, name, bank, color } : c));
      } else {
        setCards(prev => [...prev, card as Card]);
      }
    }
    notify(editingCard ? 'Cartão atualizado.' : 'Cartão criado.', 'success');
    setCardModalOpen(false);
    setEditingCard(null);
  }
  async function removeCard(id: string) {
    const api = (typeof window !== 'undefined' ? (window as any).api : null);
    if (api?.cards) {
      const r = await api.cards.remove(id);
      setCards(r.cards ?? []); setPurchases(r.purchases ?? []);
    } else {
      setCards(prev => prev.filter(c => c.id !== id));
      setPurchases(prev => prev.filter(p => p.cardId !== id));
    }
    notify('Cartão excluído.', 'info');
  }

  // ——— CRUD Compras ———
  function openNewPurchase() {
    setEditingPurchase(null);
    setPurchaseCardId(cards[0]?.id ?? '');
    setPurchaseTitle(''); setPurchaseTotalInstallments('1');
    setPurchaseCurrentInstallment('1'); setPurchaseInstallmentAmount('');
    setPurchaseErrors({});
    setPurchaseModalOpen(true);
  }
  function openEditPurchase(p: Purchase) {
    setEditingPurchase(p); setPurchaseCardId(p.cardId); setPurchaseTitle(p.title);
    setPurchaseTotalInstallments(String(p.totalInstallments));
    setPurchaseCurrentInstallment(String(p.currentInstallmentAtStart));
    setPurchaseInstallmentAmount(formatCurrencyInput(p.installmentAmount));
    setPurchaseErrors({});
    setPurchaseModalOpen(true);
  }
  function validatePurchase() {
    const errors: typeof purchaseErrors = {};
    if (!purchaseCardId) errors.card = 'Selecione um cartão.';
    if (!purchaseTitle.trim()) errors.title = 'Informe a descrição.';
    const amt = parseCurrencyInput(purchaseInstallmentAmount);
    if (!purchaseInstallmentAmount.trim()) {
      errors.amount = 'Informe o valor da parcela.';
    } else if (!Number.isFinite(amt) || amt <= 0) {
      errors.amount = 'Valor inválido. Ex.: 150,00';
    }
    setPurchaseErrors(errors);
    return Object.keys(errors).length === 0;
  }
  async function savePurchase() {
    if (!validatePurchase()) return;
    const title = purchaseTitle.trim();
    const totalInstallments = Math.max(1, Number(purchaseTotalInstallments));
    const currentInstallmentAtStart = Math.max(1, Math.min(Number(purchaseCurrentInstallment), totalInstallments));
    const installmentAmount = parseCurrencyInput(purchaseInstallmentAmount);
    const api = (typeof window !== 'undefined' ? (window as any).api : null);
    const purchase = editingPurchase
      ? { ...editingPurchase, cardId: purchaseCardId, title, totalInstallments, currentInstallmentAtStart, installmentAmount }
      : { id: crypto.randomUUID(), cardId: purchaseCardId, title, startMonthKey: currentKey, totalInstallments, currentInstallmentAtStart, installmentAmount };
    if (api?.purchases) {
      const list = await api.purchases.upsert(purchase);
      setPurchases(list ?? []);
    } else {
      if (editingPurchase) {
        setPurchases(prev => prev.map(p => p.id === (purchase as Purchase).id ? (purchase as Purchase) : p));
      } else {
        setPurchases(prev => [...prev, purchase as Purchase]);
      }
    }
    notify(editingPurchase ? 'Compra atualizada.' : 'Compra adicionada.', 'success');
    setPurchaseModalOpen(false);
    setEditingPurchase(null);
  }
  async function removePurchase(id: string) {
    const api = (typeof window !== 'undefined' ? (window as any).api : null);
    if (api?.purchases) {
      const list = await api.purchases.remove(id);
      setPurchases(list ?? []);
    } else {
      setPurchases(prev => prev.filter(p => p.id !== id));
    }
    notify('Compra excluída.', 'info');
  }

  const monthlyRows = useMemo(() => activePurchases.map(p => {
    const idx = computeInstallmentIndex(p, currentKey);
    const remaining = Math.max(0, p.totalInstallments - idx);
    const totalValue = p.installmentAmount * p.totalInstallments;
    const card = cards.find(c => c.id === p.cardId);
    return { p, card, idx, remaining, totalValue };
  }), [activePurchases, currentKey, cards]);

  const chartData = useMemo(() => {
    const months: string[] = [];
    const seriesByCard: Record<string, number[]> = {};
    for (let i = 5; i >= 0; i--) {
      const d = addMonths(nowMonth, -i);
      const k = monthKey(d);
      months.push(format(d, "LLL'/'yy", { locale: ptBR }));
      for (const c of cards) {
        if (!seriesByCard[c.id]) seriesByCard[c.id] = [];
        const sum = purchases
          .filter(p => p.cardId === c.id)
          .filter(p => { const idx = computeInstallmentIndex(p, k); return idx >= 1 && idx <= p.totalInstallments; })
          .reduce((a, b) => a + b.installmentAmount, 0);
        seriesByCard[c.id].push(sum);
      }
    }
    return {
      labels: months,
      datasets: cards.map(c => ({
        label: c.name,
        data: seriesByCard[c.id] ?? [],
        borderColor: c.color,
        backgroundColor: c.color,
        tension: 0.25,
      })),
    };
  }, [nowMonth, purchases, cards]);

  const groupedByCard = useMemo(() => cards.map(card => ({
    card,
    rows: monthlyRows
      .filter(r => r.card?.id === card.id)
      .sort((a, b) => sortDesc
        ? b.p.installmentAmount - a.p.installmentAmount
        : a.p.installmentAmount - b.p.installmentAmount),
  })), [cards, monthlyRows, sortDesc]);

  const confirmDeleteCard = cards.find(c => c.id === confirmDeleteCardId);
  const confirmDeletePurchase = purchases.find(p => p.id === confirmDeletePurchaseId);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <button className="btn-outline" onClick={() => setNowMonth(prev => addMonths(prev, -1))} aria-label="Mês anterior">
            <ArrowLeft className="size-4" />
          </button>
          <h1 className="text-2xl font-semibold">
            Cartões · {format(nowMonth, "LLLL 'de' yyyy", { locale: ptBR })}
          </h1>
          <button className="btn-outline" onClick={() => setNowMonth(prev => addMonths(prev, 1))} aria-label="Próximo mês">
            <ArrowRight className="size-4" />
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            className="btn-outline"
            onClick={() => setSortDesc(v => !v)}
            title={sortDesc ? 'Ordenar: menor → maior' : 'Ordenar: maior → menor'}
          >
            <ArrowDownUp className="size-4" /> Ordenar
          </button>
          <button className="btn-outline" onClick={openNewCard}><Plus className="size-4" /> Novo cartão</button>
          <button className="btn-primary" onClick={openNewPurchase}><Plus className="size-4" /> Nova compra</button>
        </div>
      </div>

      {/* Totais por cartão */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.id} className="card p-4 flex items-center justify-between gap-3" style={{ borderColor: c.color }}>
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-md flex items-center justify-center overflow-hidden shrink-0" style={{ backgroundColor: c.color }}>
                {bankLogoFor(c.bank) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={bankLogoFor(c.bank) as string} alt="logo" className="w-8 h-8 object-contain" />
                ) : (
                  <CreditCard className="size-5 text-white" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-semibold truncate">{c.name}</p>
                <p className="text-xs text-muted truncate">{c.bank}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button className="btn-outline px-2 py-2" onClick={() => openEditCard(c)} aria-label="Editar">
                <Edit3 className="size-4" />
              </button>
              <button className="btn-outline px-2 py-2 text-danger border-danger/30 hover:bg-danger/10" onClick={() => setConfirmDeleteCardId(c.id)} aria-label="Excluir">
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}
        {cards.length === 0 && (
          <div className="col-span-full card p-4 text-sm text-muted">Nenhum cartão cadastrado.</div>
        )}
      </div>

      {/* Resumo do mês por cartão */}
      {cards.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cards.map(c => (
            <div key={c.id} className="card p-4">
              <p className="text-sm text-muted">{c.name}</p>
              <p className="mt-1 text-xl font-semibold" style={{ color: c.color }}>
                {(totalsByCard.get(c.id) ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
          ))}
          <div className="card p-4">
            <p className="text-sm text-muted">Total geral</p>
            <p className="mt-1 text-2xl font-semibold">
              {totalAll.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        </div>
      )}

      {/* Compras agrupadas por cartão */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groupedByCard.map(({ card, rows }) => (
          <div key={card.id} className="card p-4" style={{ borderColor: card.color }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="size-9 rounded-md flex items-center justify-center overflow-hidden shrink-0" style={{ backgroundColor: card.color }}>
                {bankLogoFor(card.bank) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={bankLogoFor(card.bank) as string} alt="logo" className="w-6 h-6 object-contain" />
                ) : (
                  <CreditCard className="size-4 text-white" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-semibold">{card.name}</p>
                <p className="text-xs text-muted">{card.bank}</p>
              </div>
              <div className="ml-auto text-sm font-semibold shrink-0" style={{ color: card.color }}>
                {(totalsByCard.get(card.id) ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            </div>
            {rows.length === 0 ? (
              <p className="text-xs text-muted py-6 text-center">Sem compras ativas neste mês.</p>
            ) : (
              <ul className="divide-y divide-white/10">
                {rows.map(({ p, idx, remaining, totalValue }) => (
                  <li key={p.id} className="py-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.title}</p>
                      <div className="text-xs text-muted mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                        <span>Parcela {idx}/{p.totalInstallments}</span>
                        <span>Restam: {remaining}</span>
                        <span>{p.installmentAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/parcela</span>
                        <span>Total: {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-1">
                      <button className="btn-outline px-2 py-2" onClick={() => openEditPurchase(p)} aria-label="Editar">
                        <Edit3 className="size-4" />
                      </button>
                      <button className="btn-outline px-2 py-2 text-danger border-danger/30 hover:bg-danger/10" onClick={() => setConfirmDeletePurchaseId(p.id)} aria-label="Excluir">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {/* Gráfico */}
      {cards.length > 0 && (
        <div className="card p-4">
          <p className="text-sm text-muted mb-2">Evolução de gastos (últimos 6 meses)</p>
          <Line
            data={chartData}
            options={{
              responsive: true,
              plugins: {
                legend: { labels: { color: '#e5e7eb' } },
                tooltip: { enabled: true },
              },
              scales: {
                x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
              },
            }}
          />
        </div>
      )}

      {/* Modal Cartão */}
      {cardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setCardModalOpen(false)} />
          <div className="relative z-10 card w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">{editingCard ? 'Editar cartão' : 'Novo cartão'}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted">Nome do cartão</label>
                <input
                  autoFocus
                  className={`mt-1 w-full rounded-lg bg-black/20 border px-3 py-2 outline-none focus:ring-2 focus:ring-white/20 ${cardErrors.name ? 'border-danger' : 'border-white/10'}`}
                  value={cardName}
                  onChange={e => { setCardName(e.target.value); setCardErrors(p => ({ ...p, name: undefined })); }}
                />
                {cardErrors.name && <p className="mt-1 text-xs text-danger">{cardErrors.name}</p>}
              </div>
              <div>
                <label className="text-sm text-muted">Banco</label>
                <input
                  className={`mt-1 w-full rounded-lg bg-black/20 border px-3 py-2 outline-none focus:ring-2 focus:ring-white/20 ${cardErrors.bank ? 'border-danger' : 'border-white/10'}`}
                  value={cardBank}
                  onChange={e => {
                    const v = e.target.value;
                    setCardBank(v);
                    setCardErrors(p => ({ ...p, bank: undefined }));
                    if (!cardColorTouched) setCardColor(bankColorFor(v));
                  }}
                />
                {cardErrors.bank && <p className="mt-1 text-xs text-danger">{cardErrors.bank}</p>}
                {cardBank && (
                  <div className="mt-2 inline-flex items-center gap-2 text-xs text-muted">
                    {bankLogoFor(cardBank) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={bankLogoFor(cardBank) as string} alt="logo" className="w-5 h-5 object-contain" />
                    )}
                    <span>Pré-visualização da identidade do banco</span>
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm text-muted">Cor</label>
                <input
                  type="color"
                  className="mt-1 w-20 h-10 rounded border border-white/10 bg-transparent cursor-pointer"
                  value={cardColor}
                  onChange={e => { setCardColor(e.target.value); setCardColorTouched(true); }}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button className="btn-outline" onClick={() => setCardModalOpen(false)}>Cancelar</button>
                <button className="btn-primary" onClick={saveCard}>Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Compra */}
      {purchaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setPurchaseModalOpen(false)} />
          <div className="relative z-10 card w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">{editingPurchase ? 'Editar compra' : 'Nova compra'}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted">Cartão</label>
                {cards.length === 0 ? (
                  <p className="mt-2 text-xs text-muted">Cadastre um cartão primeiro.</p>
                ) : (
                  <div role="radiogroup" className="mt-2 grid grid-cols-2 gap-3">
                    {cards.map(c => {
                      const selected = purchaseCardId === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => { setPurchaseCardId(c.id); setPurchaseErrors(p => ({ ...p, card: undefined })); }}
                          className={`card p-3 flex items-center gap-3 text-left transition border ${selected ? 'ring-2 ring-primary' : 'hover:bg-white/5 border-white/10'}`}
                          style={{ borderColor: selected ? c.color : undefined }}
                        >
                          <div className="size-8 rounded-md flex items-center justify-center overflow-hidden shrink-0" style={{ backgroundColor: c.color }}>
                            {bankLogoFor(c.bank) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={bankLogoFor(c.bank) as string} alt="logo" className="w-6 h-6 object-contain" />
                            ) : (
                              <CreditCard className="size-4 text-white" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{c.name}</p>
                            <p className="text-[11px] text-muted truncate">{c.bank}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                {purchaseErrors.card && <p className="mt-1 text-xs text-danger">{purchaseErrors.card}</p>}
              </div>
              <div>
                <label className="text-sm text-muted">Descrição</label>
                <input
                  autoFocus
                  className={`mt-1 w-full rounded-lg bg-black/20 border px-3 py-2 outline-none focus:ring-2 focus:ring-white/20 ${purchaseErrors.title ? 'border-danger' : 'border-white/10'}`}
                  value={purchaseTitle}
                  onChange={e => { setPurchaseTitle(e.target.value); setPurchaseErrors(p => ({ ...p, title: undefined })); }}
                  placeholder="Ex.: Mercado, Eletrônico"
                />
                {purchaseErrors.title && <p className="mt-1 text-xs text-danger">{purchaseErrors.title}</p>}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm text-muted">Parcelas</label>
                  <input className="mt-1 w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-white/20" inputMode="numeric" value={purchaseTotalInstallments} onChange={e => setPurchaseTotalInstallments(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-muted">Atual</label>
                  <input className="mt-1 w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-white/20" inputMode="numeric" value={purchaseCurrentInstallment} onChange={e => setPurchaseCurrentInstallment(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-muted">Valor/parcela</label>
                  <input
                    className={`mt-1 w-full rounded-lg bg-black/20 border px-3 py-2 outline-none focus:ring-2 focus:ring-white/20 ${purchaseErrors.amount ? 'border-danger' : 'border-white/10'}`}
                    inputMode="decimal"
                    value={purchaseInstallmentAmount}
                    onChange={e => { setPurchaseInstallmentAmount(e.target.value); setPurchaseErrors(p => ({ ...p, amount: undefined })); }}
                    placeholder="150,00"
                  />
                  {purchaseErrors.amount && <p className="mt-1 text-xs text-danger">{purchaseErrors.amount}</p>}
                </div>
              </div>
              <p className="text-xs text-muted">
                Início do parcelamento: {format(nowMonth, "LLLL 'de' yyyy", { locale: ptBR })}.
                As parcelas avançam automaticamente ao navegar pelos meses.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button className="btn-outline" onClick={() => setPurchaseModalOpen(false)}>Cancelar</button>
                <button className="btn-primary" onClick={savePurchase}>Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirms */}
      <ConfirmDialog
        open={!!confirmDeleteCardId}
        title="Excluir cartão"
        message={`Deseja excluir o cartão "${confirmDeleteCard?.name}"? Todas as compras vinculadas a ele também serão removidas.`}
        onConfirm={() => { removeCard(confirmDeleteCardId!); setConfirmDeleteCardId(null); }}
        onCancel={() => setConfirmDeleteCardId(null)}
      />
      <ConfirmDialog
        open={!!confirmDeletePurchaseId}
        title="Excluir compra"
        message={`Deseja excluir "${confirmDeletePurchase?.title}"? Essa ação não pode ser desfeita.`}
        onConfirm={() => { removePurchase(confirmDeletePurchaseId!); setConfirmDeletePurchaseId(null); }}
        onCancel={() => setConfirmDeletePurchaseId(null)}
      />

      {notice && <Toast message={notice.message} type={notice.type} />}
    </div>
  );
}
