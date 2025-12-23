/**
 * LPS Crawler Desktop - Preload Script
 * Secure IPC bridge between renderer and main process
 * 
 * @author Production-Grade Implementer
 * @version 1.0.0
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Directory selection
    selectDirectory: () => ipcRenderer.invoke('select-directory'),
    
    // File export functionality
    exportResults: (data) => ipcRenderer.invoke('export-results', data),
    
    // Configuration management
    updateConfig: (config) => ipcRenderer.invoke('update-config', config),
    getAppInfo: () => ipcRenderer.invoke('get-app-info'),
    
    // Utility functions
    showNotification: (message, type) => {
        // Send notification to main process
        ipcRenderer.send('show-notification', { message, type });
    },
    
    // Version information
    versions: {
        node: process.versions.node,
        chrome: process.versions.chrome,
        electron: process.versions.electron
    }
});

// Add security metadata
document.addEventListener('DOMContentLoaded', () => {
    // Set CSP meta tag for additional security
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = "default-src 'self' http://localhost:3001; script-src 'self' 'unsafe-inline' http://localhost:3001; style-src 'self' 'unsafe-inline' http://localhost:3001;";
    document.head.appendChild(meta);
    
    // Add electron detection class
    document.body.classList.add('electron-app');
});