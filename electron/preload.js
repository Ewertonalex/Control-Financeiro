const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  monthly: {
    get: (monthKey) => ipcRenderer.invoke('monthly:get', monthKey),
    upsert: (monthKey, tx) => ipcRenderer.invoke('monthly:upsert', monthKey, tx),
    remove: (monthKey, id) => ipcRenderer.invoke('monthly:remove', monthKey, id),
    togglePaid: (monthKey, id) => ipcRenderer.invoke('monthly:togglePaid', monthKey, id),
    replicate: (srcKey, dstKey) => ipcRenderer.invoke('monthly:replicate', srcKey, dstKey),
    clear: (key) => ipcRenderer.invoke('monthly:clear', key),
  },
  cards: {
    get: () => ipcRenderer.invoke('cards:get'),
    upsert: (card) => ipcRenderer.invoke('cards:upsert', card),
    remove: (id) => ipcRenderer.invoke('cards:remove', id),
  },
  purchases: {
    get: () => ipcRenderer.invoke('purchases:get'),
    upsert: (p) => ipcRenderer.invoke('purchases:upsert', p),
    remove: (id) => ipcRenderer.invoke('purchases:remove', id),
  },
});

