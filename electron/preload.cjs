const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cueforgeDesktop', {
  isDesktop: true,
  info: () => ipcRenderer.invoke('cueforge:desktop-info'),
  scanAudioSetup: () => ipcRenderer.invoke('cueforge:scan-audio-setup'),
  readBridgeReport: () => ipcRenderer.invoke('cueforge:read-bridge-report'),
  openBridgeFolder: () => ipcRenderer.invoke('cueforge:open-bridge-folder')
});
