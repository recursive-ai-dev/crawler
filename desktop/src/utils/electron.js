// Electron API utilities for renderer process

// Check if we're in Electron environment
export const isElectron = () => {
  return window && window.electronAPI;
};

// IPC Renderer wrapper
export const ipcRenderer = {
  invoke: (channel, ...args) => {
    if (isElectron() && window.electronAPI.invoke) {
      return window.electronAPI.invoke(channel, ...args);
    } else {
      console.warn(`IPC invoke called but electronAPI not available: ${channel}`);
      return Promise.resolve(null);
    }
  },

  on: (channel, callback) => {
    if (isElectron() && window.electronAPI.on) {
      window.electronAPI.on(channel, callback);
    } else {
      console.warn(`IPC on called but electronAPI not available: ${channel}`);
    }
  },

  removeListener: (channel, callback) => {
    if (isElectron() && window.electronAPI.removeListener) {
      window.electronAPI.removeListener(channel, callback);
    }
  }
};

// Menu event handlers
export const setupMenuHandlers = (handlers) => {
  if (isElectron()) {
    Object.entries(handlers).forEach(([event, handler]) => {
      ipcRenderer.on(event, handler);
    });
  }
};

// File system operations
export const fileOperations = {
  selectDirectory: async () => {
    return await ipcRenderer.invoke('select-download-directory');
  },

  showSaveDialog: async (options) => {
    return await ipcRenderer.invoke('show-save-dialog', options);
  },

  showMessage: async (options) => {
    return await ipcRenderer.invoke('show-message', options);
  }
};

// Window operations
export const windowOperations = {
  minimize: () => {
    ipcRenderer.invoke('minimize-window');
  },

  maximize: () => {
    ipcRenderer.invoke('maximize-window');
  },

  close: () => {
    ipcRenderer.invoke('close-window');
  }
};

// App info
export const appInfo = {
  getVersion: async () => {
    return await ipcRenderer.invoke('get-app-version');
  }
};

// Crawler operations
export const crawlerOperations = {
  startCrawler: async (options) => {
    return await ipcRenderer.invoke('start-crawler', options);
  },

  startMediaExtraction: async (options) => {
    return await ipcRenderer.invoke('start-media-extraction', options);
  }
};

export default {
  isElectron,
  ipcRenderer,
  setupMenuHandlers,
  fileOperations,
  windowOperations,
  appInfo,
  crawlerOperations
};