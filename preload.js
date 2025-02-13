// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    processImage: (imagePath, configPath) => ipcRenderer.invoke('process-image', imagePath, configPath),
    saveConfig: (config) => ipcRenderer.invoke('saveConfig', config),
    openFile: (fileType) => ipcRenderer.invoke('dialog:openFile', fileType),
    saveFile: () => ipcRenderer.invoke('dialog:saveFile'),
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
    saveImage: (sourcePath, targetPath) => ipcRenderer.invoke('save-image', sourcePath, targetPath),
    loadModelOptions: () => ipcRenderer.invoke('load-model-options'),
});
