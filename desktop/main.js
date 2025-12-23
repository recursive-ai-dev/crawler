#!/usr/bin/env node

/**
 * LPS Crawler Real Desktop Application
 * Production-grade web scraping tool with advanced crawling algorithms
 * 
 * @author Production-Grade Implementer
 * @version 1.0.0
 */

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');

class LPSCrawlerDesktop {
    constructor() {
        this.mainWindow = null;
        this.guiServer = null;
        this.serverPort = 3001;
        this.isDev = process.env.NODE_ENV !== 'production';
        
        // Application configuration
        this.config = {
            downloadDir: './downloads',
            maxConcurrent: 5,
            userAgent: 'LPS-Crawler-Desktop/1.0.0 (Production-Grade)',
            timeout: 30000,
            retries: 3
        };

        this.initializeApp();
    }

    async initializeApp() {
        console.log('🏗️  Initializing LPS Crawler Desktop Application...');
        
        // Wait for Electron app to be ready
        await app.whenReady();
        
        // Create downloads directory
        await this.ensureDownloadsDirectory();
        
        // Start GUI server
        await this.startGUIServer();
        
        // Create main window
        await this.createMainWindow();
        
        // Setup IPC handlers
        this.setupIPCHandlers();
        
        // Setup event handlers
        this.setupEventHandlers();
        
        console.log('✅ LPS Crawler Desktop Application initialized successfully!');
    }

    async ensureDownloadsDirectory() {
        try {
            await fs.mkdir(this.config.downloadDir, { recursive: true });
            console.log(`📁 Downloads directory ensured: ${this.config.downloadDir}`);
        } catch (error) {
            console.error('❌ Failed to create downloads directory:', error);
        }
    }

    async startGUIServer() {
        return new Promise((resolve, reject) => {
            console.log('🚀 Starting GUI server...');
            
            // Start the GUI server as a child process
            this.guiServer = spawn('node', [
                path.join(__dirname, '..', 'serve-gui.js')
            ], {
                stdio: 'pipe',
                env: {
                    ...process.env,
                    PORT: this.serverPort,
                    NODE_ENV: this.isDev ? 'development' : 'production'
                }
            });

            this.guiServer.stdout.on('data', (data) => {
                const output = data.toString();
                console.log(`🖥️  GUI Server: ${output}`);
                
                // Resolve when server is ready
                if (output.includes('READY TO USE!')) {
                    resolve();
                }
            });

            this.guiServer.stderr.on('data', (data) => {
                console.error(`❌ GUI Server Error: ${data}`);
            });

            this.guiServer.on('error', (error) => {
                console.error('🚨 Failed to start GUI server:', error);
                reject(error);
            });

            this.guiServer.on('exit', (code) => {
                console.log(`👋 GUI server exited with code ${code}`);
                if (code !== 0) {
                    reject(new Error(`GUI server exited with code ${code}`));
                }
            });
        });
    }

    async createMainWindow() {
        console.log('🖥️  Creating main application window...');
        
        this.mainWindow = new BrowserWindow({
            width: 1400,
            height: 900,
            minWidth: 1200,
            minHeight: 700,
            show: false,
            icon: path.join(__dirname, '..', 'assets', 'icon.png'),
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                enableRemoteModule: false,
                preload: path.join(__dirname, 'preload.js'),
                webSecurity: true,
                allowRunningInsecureContent: false
            },
            titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
            show: false
        });

        // Load the GUI
        await this.mainWindow.loadURL(`http://localhost:${this.serverPort}`);

        // Setup window events
        this.mainWindow.once('ready-to-show', () => {
            console.log('🎉 Main window ready to show!');
            this.mainWindow.show();
            
            if (this.isDev) {
                this.mainWindow.webContents.openDevTools();
            }
        });

        // Prevent navigation to external sites
        this.mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
            const parsedUrl = new URL(navigationUrl);
            if (parsedUrl.origin !== `http://localhost:${this.serverPort}`) {
                event.preventDefault();
                shell.openExternal(navigationUrl);
            }
        });

        // Handle new window requests
        this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            shell.openExternal(url);
            return { action: 'deny' };
        });

        console.log('✅ Main window created successfully!');
    }

    setupIPCHandlers() {
        console.log('🔧 Setting up IPC handlers...');

        // Handle directory selection
        ipcMain.handle('select-directory', async () => {
            const result = await dialog.showOpenDialog(this.mainWindow, {
                properties: ['openDirectory'],
                defaultPath: this.config.downloadDir
            });

            if (!result.canceled && result.filePaths.length > 0) {
                this.config.downloadDir = result.filePaths[0];
                return { success: true, path: result.filePaths[0] };
            }
            return { success: false };
        });

        // Handle file exports
        ipcMain.handle('export-results', async (event, data) => {
            try {
                const result = await dialog.showSaveDialog(this.mainWindow, {
                    defaultPath: path.join(this.config.downloadDir, `crawl-results-${Date.now()}.json`),
                    filters: [
                        { name: 'JSON Files', extensions: ['json'] },
                        { name: 'CSV Files', extensions: ['csv'] },
                        { name: 'All Files', extensions: ['*'] }
                    ]
                });

                if (!result.canceled) {
                    await fs.writeFile(result.filePath, JSON.stringify(data, null, 2));
                    return { success: true, path: result.filePath };
                }
                return { success: false };
            } catch (error) {
                console.error('❌ Export failed:', error);
                return { success: false, error: error.message };
            }
        });

        // Handle configuration updates
        ipcMain.handle('update-config', async (event, newConfig) => {
            try {
                this.config = { ...this.config, ...newConfig };
                await this.saveConfig();
                return { success: true, config: this.config };
            } catch (error) {
                console.error('❌ Config update failed:', error);
                return { success: false, error: error.message };
            }
        });

        // Handle application info requests
        ipcMain.handle('get-app-info', async () => {
            return {
                version: '1.0.0',
                name: 'LPS Crawler Desktop',
                platform: process.platform,
                arch: process.arch,
                config: this.config
            };
        });
    }

    setupEventHandlers() {
        // Handle app activation (macOS)
        app.on('activate', async () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                await this.createMainWindow();
            }
        });

        // Handle all windows closed
        app.on('window-all-closed', () => {
            console.log('🪟 All windows closed');
            this.cleanup();
        });

        // Handle before quit
        app.on('before-quit', () => {
            console.log('🛑 Application quitting...');
            this.cleanup();
        });

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error('🚨 Uncaught Exception:', error);
            this.cleanup();
            process.exit(1);
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
        });
    }

    async saveConfig() {
        try {
            const configPath = path.join(__dirname, '..', 'config.json');
            await fs.writeFile(configPath, JSON.stringify(this.config, null, 2));
            console.log('💾 Configuration saved successfully');
        } catch (error) {
            console.error('❌ Failed to save configuration:', error);
        }
    }

    async loadConfig() {
        try {
            const configPath = path.join(__dirname, '..', 'config.json');
            const configData = await fs.readFile(configPath, 'utf8');
            this.config = { ...this.config, ...JSON.parse(configData) };
            console.log('📋 Configuration loaded successfully');
        } catch (error) {
            console.log('⚠️  Using default configuration');
        }
    }

    cleanup() {
        console.log('🧹 Cleaning up resources...');
        
        if (this.guiServer) {
            console.log('🛑 Stopping GUI server...');
            this.guiServer.kill('SIGTERM');
            this.guiServer = null;
        }

        if (this.mainWindow) {
            console.log('🪟 Closing main window...');
            this.mainWindow.close();
            this.mainWindow = null;
        }
    }
}

// Application entry point
if (require.main === module) {
    console.log('🎯 LPS Crawler Real Desktop Application');
    console.log('🚀 Starting production-grade web scraping tool...');
    console.log('');
    console.log('📋 FEATURES:');
    console.log('   • Real web crawling with advanced algorithms');
    console.log('   • Image extraction and processing');
    console.log('   • Video source detection (HLS, DASH, MP4)');
    console.log('   • Cross-platform desktop application');
    console.log('   • Professional Material Design interface');
    console.log('   • Real-time progress tracking');
    console.log('   • Export capabilities (JSON, CSV)');
    console.log('   • Configurable download settings');
    console.log('');

    // Initialize the desktop application
    new LPSCrawlerDesktop();
}

module.exports = LPSCrawlerDesktop;