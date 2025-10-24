"use client";
import { useEffect, useMemo, useState } from 'react';
import { addMonths, differenceInCalendarMonths, format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, ArrowRight, CheckCircle2, CreditCard, Edit3, Plus, Trash2 } from 'lucide-react';
import { Chart as ChartJS, LineElement, CategoryScale, LinearScale, PointElement, Legend, Tooltip } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Legend, Tooltip);

type Card = {
  id: string;
  name: string;
  bank: string;
  color: string; // hex
};

type Purchase = {
  id: string;
  cardId: string;
  title: string;
  startMonthKey: string; // yyyy-MM em que o parcelamento começa a contar
  totalInstallments: number;
  currentInstallmentAtStart: number; // parcela atual no mês de start
  installmentAmount: number;
};

const STORAGE_KEY = 'ccards:v1';

const BANK_COLORS: Record<string, string> = {
  // normalizar chave para minúsculas sem acentos/trim
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

function normalizeBankName(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();
}

function bankColorFor(bank: string, fallback = '#7C3AED') {
  const key = normalizeBankName(bank);
  if (BANK_COLORS[key]) return BANK_COLORS[key];
  // atalhos
  if (key.includes('itau')) return BANK_COLORS.itau;
  if (key.includes('nubank')) return BANK_COLORS.nubank;
  if (key.includes('bradesco')) return BANK_COLORS.bradesco;
  if (key.includes('santander')) return BANK_COLORS.santander;
  if (key.includes('banco do brasil') || key === 'bb') return BANK_COLORS['banco do brasil'];
  if (key.includes('caixa')) return BANK_COLORS.caixa;
  if (key.includes('inter')) return BANK_COLORS.inter;
  if (key.includes('original')) return BANK_COLORS.original;
  if (key.includes('neon')) return BANK_COLORS.neon;
  if (key === 'c6' || key.includes('c6')) return BANK_COLORS.c6;
  if (key.includes('credicard')) return BANK_COLORS.credicard;
  return fallback;
}

// Logos disponíveis no projeto (evitar apontar para arquivos inexistentes)
const BANK_LOGOS: Record<string, string> = {
  itau: '/banks/itau.svg',
  nubank: '/banks/nubank.svg',
  'banco do brasil': '/banks/bb.svg',
  bb: '/banks/bb.svg',
};

function bankLogoFor(bank: string): string | null {
  const key = normalizeBankName(bank);
  if (BANK_LOGOS[key]) return BANK_LOGOS[key];
  if (key.includes('itau')) return BANK_LOGOS.itau;
  if (key.includes('nubank')) return BANK_LOGOS.nubank;
  if (key.includes('banco do brasil') || key === 'bb') return BANK_LOGOS['banco do brasil'];
  return null;
}

function monthKey(d: Date) {
  return format(d, 'yyyy-MM');
}

function keyToDate(key: string) {
  return parse(key + '-01', 'yyyy-MM-dd', new Date());
}

function computeInstallmentIndex(p: Purchase, currentKey: string) {
  const diff = differenceInCalendarMonths(keyToDate(currentKey), keyToDate(p.startMonthKey));
  return p.currentInstallmentAtStart + diff; // 1-based
}

export default function CartoesPage() {
  const [nowMonth, setNowMonth] = useState<Date>(new Date());
  const [cards, setCards] = useState<Card[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [notice, setNotice] = useState<null | { message: string; type: 'success' | 'info' | 'danger' }>(null);
  const [hydrated, setHydrated] = useState(false);

  // formularios
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [cardName, setCardName] = useState('');
  const [cardBank, setCardBank] = useState('');
  const [cardColor, setCardColor] = useState('#7C3AED');
  const [cardColorTouched, setCardColorTouched] = useState(false);

  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [purchaseCardId, setPurchaseCardId] = useState('');
  const [purchaseTitle, setPurchaseTitle] = useState('');
  const [purchaseTotalInstallments, setPurchaseTotalInstallments] = useState('1');
  const [purchaseCurrentInstallment, setPurchaseCurrentInstallment] = useState('1');
  const [purchaseInstallmentAmount, setPurchaseInstallmentAmount] = useState('');

  // persistência
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
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
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ cards, purchases }));
    } catch {}
  }, [cards, purchases, hydrated]);

  const currentKey = useMemo(() => monthKey(nowMonth), [nowMonth]);

  // compras ativas neste mês
  const activePurchases = useMemo(() => {
    return purchases.filter(p => {
      const installment = computeInstallmentIndex(p, currentKey);
      return installment >= 1 && installment <= p.totalInstallments;
    });
  }, [purchases, currentKey]);

  // totais por cartão e total geral no mês
  const totalsByCard = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of activePurchases) {
      map.set(p.cardId, (map.get(p.cardId) ?? 0) + p.installmentAmount);
    }
    return map;
  }, [activePurchases]);
  const totalAll = useMemo(() => Array.from(totalsByCard.values()).reduce((a, b) => a + b, 0), [totalsByCard]);

  function notify(message: string, type: 'success' | 'info' | 'danger' = 'success') {
    setNotice({ message, type });
    window.setTimeout(() => setNotice(null), 2200);
  }

  function moveMonth(diff: number) {
    setNowMonth(prev => addMonths(prev, diff));
  }

  // CRUD cartões
  function openNewCard() {
    setEditingCard(null);
    setCardName('');
    setCardBank('');
    setCardColor('#7C3AED');
    setCardColorTouched(false);
    setCardModalOpen(true);
  }
  function openEditCard(c: Card) {
    setEditingCard(c);
    setCardName(c.name);
    setCardBank(c.bank);
    setCardColor(c.color);
    setCardColorTouched(true);
    setCardModalOpen(true);
  }
  function saveCard() {
    const name = cardName.trim();
    const bank = cardBank.trim();
    if (!name || !bank) return;
    const color = cardColorTouched ? (cardColor || '#7C3AED') : bankColorFor(bank, cardColor || '#7C3AED');
    if (editingCard) {
      setCards(prev => prev.map(c => (c.id === editingCard.id ? { ...c, name, bank, color } : c)));
      notify('Cartão atualizado.', 'success');
    } else {
      setCards(prev => [...prev, { id: crypto.randomUUID(), name, bank, color }]);
      notify('Cartão criado.', 'success');
    }
    setCardModalOpen(false);
    setEditingCard(null);
  }
  function removeCard(id: string) {
    setCards(prev => prev.filter(c => c.id !== id));
    setPurchases(prev => prev.filter(p => p.cardId !== id));
    notify('Cartão excluído.', 'info');
  }

  // CRUD compras parceladas
  function openNewPurchase() {
    setEditingPurchase(null);
    setPurchaseCardId(cards[0]?.id ?? '');
    setPurchaseTitle('');
    setPurchaseTotalInstallments('1');
    setPurchaseCurrentInstallment('1');
    setPurchaseInstallmentAmount('');
    setPurchaseModalOpen(true);
  }
  function openEditPurchase(p: Purchase) {
    setEditingPurchase(p);
    setPurchaseCardId(p.cardId);
    setPurchaseTitle(p.title);
    setPurchaseTotalInstallments(String(p.totalInstallments));
    setPurchaseCurrentInstallment(String(p.currentInstallmentAtStart));
    setPurchaseInstallmentAmount(String(p.installmentAmount));
    setPurchaseModalOpen(true);
  }
  function savePurchase() {
    if (!purchaseCardId) return;
    const title = purchaseTitle.trim();
    if (!title) return;
    const totalInstallments = Math.max(1, Number(purchaseTotalInstallments));
    const currentInstallmentAtStart = Math.max(1, Math.min(Number(purchaseCurrentInstallment), totalInstallments));
    const installmentAmount = Number(purchaseInstallmentAmount.replace(/\./g, '').replace(',', '.')) || Number(purchaseInstallmentAmount);
    if (!Number.isFinite(installmentAmount) || installmentAmount <= 0) return;
    if (editingPurchase) {
      setPurchases(prev => prev.map(p => (p.id === editingPurchase.id ? { ...p, cardId: purchaseCardId, title, totalInstallments, currentInstallmentAtStart, installmentAmount } : p)));
      notify('Compra atualizada.', 'success');
    } else {
      setPurchases(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          cardId: purchaseCardId,
          title,
          startMonthKey: currentKey,
          totalInstallments,
          currentInstallmentAtStart,
          installmentAmount,
        },
      ]);
      notify('Compra adicionada.', 'success');
    }
    setPurchaseModalOpen(false);
    setEditingPurchase(null);
  }
  function removePurchase(id: string) {
    setPurchases(prev => prev.filter(p => p.id !== id));
    notify('Compra excluída.', 'info');
  }

  // dados para lista do mês
  const monthlyRows = useMemo(() => {
    return activePurchases.map(p => {
      const idx = computeInstallmentIndex(p, currentKey);
      const remaining = Math.max(0, p.totalInstallments - idx);
      const totalValue = p.installmentAmount * p.totalInstallments;
      const card = cards.find(c => c.id === p.cardId);
      return { p, card, idx, remaining, totalValue };
    });
  }, [activePurchases, currentKey, cards]);

  // gráfico: últimos 6 meses
  const chartData = useMemo(() => {
    const months: string[] = [];
    const seriesByCard: Record<string, number[]> = {};
    const seriesLabels: Record<string, string> = {};
    const orderedCards = cards;
    for (let i = 5; i >= 0; i--) {
      const d = addMonths(nowMonth, -i);
      const k = monthKey(d);
      months.push(format(d, "LLL'/'yy", { locale: ptBR }));
      for (const c of orderedCards) {
        if (!seriesByCard[c.id]) {
          seriesByCard[c.id] = [];
          seriesLabels[c.id] = c.name;
        }
        const sum = purchases
          .filter(p => p.cardId === c.id)
          .filter(p => {
            const idx = computeInstallmentIndex(p, k);
            return idx >= 1 && idx <= p.totalInstallments;
          })
          .reduce((a, b) => a + b.installmentAmount, 0);
        seriesByCard[c.id].push(sum);
      }
    }
    const datasets = orderedCards.map(c => ({
      label: seriesLabels[c.id],
      data: seriesByCard[c.id],
      borderColor: c.color,
      backgroundColor: c.color,
      tension: 0.25,
    }));
    return { labels: months, datasets };
  }, [nowMonth, purchases, cards]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <button className="btn-outline" onClick={() => moveMonth(-1)} aria-label="Mês anterior">
            <ArrowLeft className="size-4" />
          </button>
          <h1 className="text-2xl font-semibold">Cartões · {format(nowMonth, "LLLL 'de' yyyy", { locale: ptBR })}</h1>
          <button className="btn-outline" onClick={() => moveMonth(1)} aria-label="Próximo mês">
            <ArrowRight className="size-4" />
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button className="btn-outline" onClick={openNewCard}><Plus className="size-4" /> Novo cartão</button>
          <button className="btn-primary" onClick={openNewPurchase}><Plus className="size-4" /> Nova compra</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.id} className="card p-4 flex items-center justify-between gap-3" style={{ borderColor: c.color }}>
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-md flex items-center justify-center overflow-hidden" style={{ backgroundColor: c.color }}>
                {bankLogoFor(c.bank) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={bankLogoFor(c.bank) as string} alt="logo" className="w-8 h-8 object-contain" />
                ) : (
                  <CreditCard className="size-5 text-white" />
                )}
              </div>
              <div>
                <p className="font-semibold">{c.name}</p>
                <p className="text-xs text-muted">{c.bank}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="btn-outline" onClick={() => openEditCard(c)} aria-label="Editar"><Edit3 className="size-4" /></button>
              <button className="btn-outline" onClick={() => removeCard(c.id)} aria-label="Excluir"><Trash2 className="size-4" /></button>
            </div>
          </div>
        ))}
        {cards.length === 0 && (
          <div className="col-span-full card p-4 text-sm text-muted">Nenhum cartão cadastrado.</div>
        )}
      </div>

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
          <p className="text-sm text-muted">Total</p>
          <p className="mt-1 text-2xl font-semibold">{totalAll.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
        </div>
      </div>

      <div className="card p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted">
              <th className="py-2 pr-3">Cartão</th>
              <th className="py-2 pr-3">Compra</th>
              <th className="py-2 pr-3">Parcela</th>
              <th className="py-2 pr-3">Restantes</th>
              <th className="py-2 pr-3">Valor parcela</th>
              <th className="py-2 pr-3">Valor total</th>
              <th className="py-2 pr-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {monthlyRows.length === 0 && (
              <tr>
                <td className="py-6 text-center text-muted" colSpan={7}>Sem compras ativas neste mês.</td>
              </tr>
            )}
            {monthlyRows.map(({ p, card, idx, remaining, totalValue }) => (
              <tr key={p.id}>
                <td className="py-3 pr-3 align-top">
                  <div className="inline-flex items-center gap-2">
                    <span className="inline-block size-3 rounded" style={{ backgroundColor: card?.color }} />
                    <span>{card?.name ?? '—'}</span>
                  </div>
                </td>
                <td className="py-3 pr-3 align-top">{p.title}</td>
                <td className="py-3 pr-3 align-top">{idx}/{p.totalInstallments}</td>
                <td className="py-3 pr-3 align-top">{remaining}</td>
                <td className="py-3 pr-3 align-top">{p.installmentAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td className="py-3 pr-3 align-top">{totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td className="py-3 pr-3 align-top">
                  <div className="flex items-center gap-2">
                    <button className="btn-outline" onClick={() => openEditPurchase(p)} aria-label="Editar"><Edit3 className="size-4" /></button>
                    <button className="btn-outline" onClick={() => removePurchase(p.id)} aria-label="Excluir"><Trash2 className="size-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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

      {/* Modal Cartão */}
      {cardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setCardModalOpen(false)} />
          <div className="relative z-10 card w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">{editingCard ? 'Editar cartão' : 'Novo cartão'}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted">Nome do cartão</label>
                <input className="mt-1 w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-white/20" value={cardName} onChange={e => setCardName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-muted">Banco</label>
                <input
                  className="mt-1 w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-white/20"
                  value={cardBank}
                  onChange={e => {
                    const v = e.target.value;
                    setCardBank(v);
                    if (!cardColorTouched) setCardColor(bankColorFor(v));
                  }}
                />
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
                <label className="text-sm text-muted">Cor do banco</label>
                <input
                  type="color"
                  className="mt-1 w-20 h-10 rounded border border-white/10 bg-transparent"
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
                <select className="mt-1 w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-white/20" value={purchaseCardId} onChange={e => setPurchaseCardId(e.target.value)}>
                  {cards.map(c => (
                    <option key={c.id} value={c.id}>{c.name} · {c.bank}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-muted">Descrição</label>
                <input className="mt-1 w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-white/20" value={purchaseTitle} onChange={e => setPurchaseTitle(e.target.value)} placeholder="Ex.: Mercado, Eletrônico" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm text-muted">Parcelas</label>
                  <input className="mt-1 w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-white/20" inputMode="numeric" value={purchaseTotalInstallments} onChange={e => setPurchaseTotalInstallments(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-muted">Parcela atual</label>
                  <input className="mt-1 w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-white/20" inputMode="numeric" value={purchaseCurrentInstallment} onChange={e => setPurchaseCurrentInstallment(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-muted">Valor da parcela</label>
                  <input className="mt-1 w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-white/20" inputMode="decimal" value={purchaseInstallmentAmount} onChange={e => setPurchaseInstallmentAmount(e.target.value)} placeholder="Ex.: 150,00" />
                </div>
              </div>
              <p className="text-xs text-muted">Observação: o início do parcelamento será considerado como {format(nowMonth, "LLLL 'de' yyyy", { locale: ptBR })}. Ao navegar de mês, as parcelas avançam automaticamente.</p>
              <div className="flex justify-end gap-2 pt-2">
                <button className="btn-outline" onClick={() => setPurchaseModalOpen(false)}>Cancelar</button>
                <button className="btn-primary" onClick={savePurchase}>Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {notice && (
        <div className="fixed right-6 bottom-6 z-50">
          <div className="card px-4 py-3 flex items-center gap-3">
            <CheckCircle2 className={"size-5 " + (notice.type === 'danger' ? 'text-danger' : 'text-success')} />
            <span className="text-sm">{notice.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// (removido export duplicado)


