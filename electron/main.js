const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const url = require('url');
const store = require('./db');

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.svg': return 'image/svg+xml';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.webp': return 'image/webp';
    case '.ico': return 'image/x-icon';
    case '.map': return 'application/json; charset=utf-8';
    case '.woff2': return 'font/woff2';
    case '.ttf': return 'font/ttf';
    default: return 'application/octet-stream';
  }
}

function createStaticServer(rootDir) {
  return http.createServer((req, res) => {
    try {
      const parsed = url.parse(req.url);
      let pathname = decodeURIComponent(parsed.pathname || '/');
      let filePath = path.join(rootDir, pathname);
      if (!filePath.startsWith(rootDir)) {
        res.writeHead(403); res.end('Forbidden'); return;
      }
      const tryCandidates = [];
      const hasExt = path.extname(filePath) !== '';
      // se for diretório, tenta index.html
      if (pathname.endsWith('/')) {
        tryCandidates.push(path.join(rootDir, pathname, 'index.html'));
      }
      // caminho exato
      tryCandidates.push(filePath);
      // tenta .html (ex.: /sobre -> /sobre.html)
      if (!hasExt) tryCandidates.push(filePath + '.html');
      // tenta /path/index.html (ex.: /sobre -> /sobre/index.html)
      if (!hasExt) tryCandidates.push(path.join(filePath, 'index.html'));
      // por fim, fallback SPA
      tryCandidates.push(path.join(rootDir, 'index.html'));

      let existing = null;
      for (const candidate of tryCandidates) {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          existing = candidate; break;
        }
      }
      if (!existing) existing = path.join(rootDir, 'index.html');

      filePath = existing;
      const ct = getContentType(filePath);
      res.writeHead(200, { 'Content-Type': ct });
      fs.createReadStream(filePath).pipe(res);
    } catch (e) {
      res.writeHead(500);
      res.end('Internal Server Error');
    }
  });
}

function tryListen(server, ports, onReady) {
  const [port, ...rest] = ports;
  if (!port) {
    // fallback porta aleatória (pode mudar a origem do localStorage)
    server.listen(0, '127.0.0.1', () => {
      const { port: p } = server.address();
      onReady(p);
    });
    return;
  }
  server.once('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      tryListen(server, rest, onReady);
    } else {
      // fallback aleatório em erro desconhecido
      server.listen(0, '127.0.0.1', () => {
        const { port: p } = server.address();
        onReady(p);
      });
    }
  });
  server.listen(port, '127.0.0.1', () => onReady(port));
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
    title: 'Controle Financeiro',
  });

  // Se existir build exportado (out/), serve via HTTP local para respeitar paths absolutos do Next
  const outDir = path.join(__dirname, '..', 'out');
  if (fs.existsSync(outDir)) {
    const server = createStaticServer(outDir);
    // Use portas fixas para manter a mesma origem e preservar o localStorage entre execuções
    const preferredPorts = [3007, 3017, 3027];
    tryListen(server, preferredPorts, (port) => {
      win.loadURL(`http://127.0.0.1:${port}/`);
    });
    win.on('closed', () => {
      try { server.close(); } catch {}
    });
  } else {
    const devUrl = process.env.ELECTRON_START_URL || 'http://localhost:3000';
    win.loadURL(devUrl);
  }
}

app.whenReady().then(() => {
  createWindow();
  // IPC - Monthly
  ipcMain.handle('monthly:get', (_evt, monthKey) => store.getMonthly(monthKey));
  ipcMain.handle('monthly:upsert', (_evt, monthKey, tx) => store.upsertTransaction(monthKey, tx));
  ipcMain.handle('monthly:remove', (_evt, monthKey, id) => store.removeTransaction(monthKey, id));
  ipcMain.handle('monthly:togglePaid', (_evt, monthKey, id) => store.togglePaid(monthKey, id));
  ipcMain.handle('monthly:replicate', (_evt, srcKey, dstKey) => store.replicateMonth(srcKey, dstKey));
  ipcMain.handle('monthly:clear', (_evt, key) => store.clearMonth(key));
  // IPC - Cards
  ipcMain.handle('cards:get', () => store.getCards());
  ipcMain.handle('cards:upsert', (_evt, card) => store.upsertCard(card));
  ipcMain.handle('cards:remove', (_evt, id) => store.removeCard(id));
  // IPC - Purchases
  ipcMain.handle('purchases:get', () => store.getPurchases());
  ipcMain.handle('purchases:upsert', (_evt, p) => store.upsertPurchase(p));
  ipcMain.handle('purchases:remove', (_evt, id) => store.removePurchase(id));
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});


