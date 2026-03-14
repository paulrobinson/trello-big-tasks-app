const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  trelloAPI: (url) => ipcRenderer.invoke('trello-api', url),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  trelloOAuth: (apiKey) => ipcRenderer.invoke('trello-oauth', apiKey),
  closeWindow: () => ipcRenderer.send('close-window'),
  updateMenuBar: (cards) => ipcRenderer.send('update-menu-bar', cards),
  toggleBarMode: (enabled) => ipcRenderer.send('toggle-bar-mode', enabled)
});
