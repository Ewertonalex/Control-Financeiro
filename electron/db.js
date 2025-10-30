const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const DATA_DIR = app.getPath('userData');
const FILE_PATH = path.join(DATA_DIR, 'controle-financeiro.json');

function ensureFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(FILE_PATH)) {
      const initial = { monthly: {}, cards: [], purchases: [] };
      fs.writeFileSync(FILE_PATH, JSON.stringify(initial, null, 2), 'utf-8');
    }
  } catch {}
}

function readAll() {
  ensureFile();
  try {
    const raw = fs.readFileSync(FILE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { monthly: {}, cards: [], purchases: [] };
  }
}

function writeAll(data) {
  try {
    const tmp = FILE_PATH + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmp, FILE_PATH);
  } catch {}
}

module.exports = {
  getMonthly(monthKey) {
    const db = readAll();
    return db.monthly[monthKey] || [];
  },
  upsertTransaction(monthKey, tx) {
    const db = readAll();
    const list = db.monthly[monthKey] ? [...db.monthly[monthKey]] : [];
    const idx = list.findIndex(i => i.id === tx.id);
    if (idx >= 0) list[idx] = tx; else list.push(tx);
    db.monthly[monthKey] = list;
    writeAll(db);
    return list;
  },
  removeTransaction(monthKey, id) {
    const db = readAll();
    const list = (db.monthly[monthKey] || []).filter(t => t.id !== id);
    db.monthly[monthKey] = list;
    writeAll(db);
    return list;
  },
  togglePaid(monthKey, id) {
    const db = readAll();
    const list = (db.monthly[monthKey] || []).map(t => t.id === id ? { ...t, paid: !(t.paid || false) } : t);
    db.monthly[monthKey] = list;
    writeAll(db);
    return list;
  },
  replicateMonth(srcKey, dstKey) {
    const db = readAll();
    const src = db.monthly[srcKey] || [];
    const dst = db.monthly[dstKey] || [];
    const cloned = src.map(t => ({ ...t, id: crypto.randomUUID() }));
    db.monthly[dstKey] = [...dst, ...cloned];
    writeAll(db);
    return db.monthly[dstKey];
  },
  clearMonth(key) {
    const db = readAll();
    db.monthly[key] = [];
    writeAll(db);
    return [];
  },

  getCards() {
    const db = readAll();
    return db.cards;
  },
  upsertCard(card) {
    const db = readAll();
    const list = [...(db.cards || [])];
    const idx = list.findIndex(c => c.id === card.id);
    if (idx >= 0) list[idx] = card; else list.push(card);
    db.cards = list;
    writeAll(db);
    return list;
  },
  removeCard(id) {
    const db = readAll();
    db.cards = (db.cards || []).filter(c => c.id !== id);
    db.purchases = (db.purchases || []).filter(p => p.cardId !== id);
    writeAll(db);
    return { cards: db.cards, purchases: db.purchases };
  },

  getPurchases() {
    const db = readAll();
    return db.purchases;
  },
  upsertPurchase(p) {
    const db = readAll();
    const list = [...(db.purchases || [])];
    const idx = list.findIndex(i => i.id === p.id);
    if (idx >= 0) list[idx] = p; else list.push(p);
    db.purchases = list;
    writeAll(db);
    return list;
  },
  removePurchase(id) {
    const db = readAll();
    db.purchases = (db.purchases || []).filter(p => p.id !== id);
    writeAll(db);
    return db.purchases;
  },
};



