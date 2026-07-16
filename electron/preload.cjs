const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('starling', {
  database: {
    load: () => ipcRenderer.invoke('database:load'),
    save: (vault) => ipcRenderer.invoke('database:save', vault),
    export: () => ipcRenderer.invoke('database:export'),
    import: () => ipcRenderer.invoke('database:import'),
  },
  codex: {
    status: () => ipcRenderer.invoke('codex:status'),
    chooseBinary: () => ipcRenderer.invoke('codex:choose-binary'),
    setBinary: (path) => ipcRenderer.invoke('codex:set-binary', path),
    generate: (request) => ipcRenderer.invoke('codex:generate', request),
  },
  app: {
    platform: process.platform,
    version: () => ipcRenderer.invoke('app:version'),
    openExternal: (url) => ipcRenderer.invoke('app:open-external', url),
  },
})
