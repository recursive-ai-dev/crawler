#!/usr/bin/env node

/**
 * LPS Crawler Real Desktop Application Launcher
 * Production-grade launcher with comprehensive error handling and system integration
 * 
 * @author Production-Grade Implementer
 * @version 1.0.0
 */

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

class DesktopLauncher {
    constructor() {
        this.desktopProcess = null;
        this.startTime = Date.now();
        this.isRestarting = false;
        this.maxRestarts = 3;
        this.restartCount = 0;

        this.initializeLauncher();
    }

    initializeLauncher() {
        console.log('🚀 LPS Crawler Real Desktop Application Launcher');
        console.log('🎯 Production-Grade Web Scraping Tool');
        console.log('');

        // Display system information
        this.displaySystemInfo();

        // Check prerequisites
        this.checkPrerequisites();

        // Setup signal handlers
        this.setupSignalHandlers();

        // Start the desktop application
        this.startDesktopApp();
    }

    displaySystemInfo() {
        console.log('📊 SYSTEM INFORMATION:');
        console.log(`   • Platform: ${os.platform()} ${os.arch()}`);
        console.log(`   • Node.js: ${process.version}`);
        console.log(`   • Memory: ${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB total`);
        console.log(`   • CPUs: ${os.cpus().length} cores`);
        console.log(`   • Working Directory: ${process.cwd()}`);
        console.log('');
    }

    checkPrerequisites() {
        console.log('🔍 CHECKING PREREQUISITES...');

        const requiredFiles = [
            path.join(__dirname, 'desktop', 'main.js'),
            path.join(__dirname, 'serve-gui.js'),
            path.join(__dirname, 'index.html')
        ];

        let allFilesExist = true;

        requiredFiles.forEach(filePath => {
            if (fs.existsSync(filePath)) {
                // console.log(`   ✅ ${path.basename(filePath)}`);
            } else {
                console.log(`   ❌ ${path.basename(filePath)} - MISSING`);
                allFilesExist = false;
            }
        });

        if (!allFilesExist) {
            console.error('❌ Missing required files.');
            process.exit(1);
        }

        console.log('✅ Prerequisites satisfied.');
    }

    setupSignalHandlers() {
        ['SIGINT', 'SIGTERM'].forEach(signal => {
            process.on(signal, () => {
                console.log(`\n👋 Received ${signal}, shutting down...`);
                this.shutdown();
            });
        });

        process.on('uncaughtException', (error) => {
            console.error('🚨 Uncaught Exception:', error);
            this.shutdown();
            process.exit(1);
        });

        if (os.platform() === 'win32') {
            const readline = require('readline');
            readline.createInterface({
                input: process.stdin,
                output: process.stdout
            }).on('SIGINT', () => {
                process.emit('SIGINT');
            });
        }
    }

    startDesktopApp() {
        console.log('🖥️  Starting Desktop App...');

        const desktopAppPath = path.join(__dirname, 'desktop', 'main.js');
        const nodeArgs = [desktopAppPath];

        if (process.env.NODE_ENV === 'development') {
            nodeArgs.unshift('--inspect');
        }

        this.desktopProcess = spawn('node', nodeArgs, {
            stdio: 'inherit',
            env: {
                ...process.env,
                NODE_ENV: process.env.NODE_ENV || 'production',
                ELECTRON_ENABLE_LOGGING: 'true'
            },
            detached: false
        });

        // Setup process event handlers
        this.setupProcessHandlers();

        // Monitor process health
        this.startHealthMonitoring();
    }

    setupProcessHandlers() {
        if (!this.desktopProcess) return;

        this.desktopProcess.on('error', (error) => {
            console.error('🚨 Failed to start desktop app:', error);
            this.handleProcessError(error);
        });

        this.desktopProcess.on('exit', (code, signal) => {
            const uptime = ((Date.now() - this.startTime) / 1000).toFixed(1);

            if (code === 0) {
                console.log(`✅ Desktop app closed successfully (uptime: ${uptime}s)`);
                this.handleGracefulExit();
            } else {
                console.error(`❌ Desktop app exited with code ${code}, signal: ${signal} (uptime: ${uptime}s)`);
                this.handleProcessCrash(code, signal);
            }
        });

        this.desktopProcess.on('disconnect', () => {
            console.warn('🔌 Desktop app process disconnected');
        });

        // Handle stdout/stderr if not using inherit
        if (this.desktopProcess.stdout) {
            this.desktopProcess.stdout.on('data', (data) => {
                console.log(`📤 Desktop: ${data}`);
            });
        }

        if (this.desktopProcess.stderr) {
            this.desktopProcess.stderr.on('data', (data) => {
                console.error(`📥 Desktop Error: ${data}`);
            });
        }
    }

    handleProcessError(error) {
        console.error('🚨 Process Error Details:', error);

        if (error.code === 'ENOENT') {
            console.error('❌ Node.js executable not found. Please ensure Node.js is installed.');
        } else if (error.code === 'EACCES') {
            console.error('❌ Permission denied. Please check file permissions.');
        } else {
            console.error('❌ Unknown process error occurred.');
        }

        // Attempt restart if under limit
        if (this.restartCount < this.maxRestarts && !this.isRestarting) {
            this.attemptRestart();
        } else {
            this.shutdown();
            process.exit(1);
        }
    }

    handleProcessCrash(code, signal) {
        // Log crash details for debugging
        const crashReport = {
            timestamp: new Date().toISOString(),
            exitCode: code,
            signal: signal,
            uptime: Date.now() - this.startTime,
            restartCount: this.restartCount,
            platform: os.platform(),
            nodeVersion: process.version
        };

        try {
            const crashLogPath = path.join(__dirname, 'crash-reports', `crash-${Date.now()}.json`);
            const crashDir = path.dirname(crashLogPath);

            if (!fs.existsSync(crashDir)) {
                fs.mkdirSync(crashDir, { recursive: true });
            }

            fs.writeFileSync(crashLogPath, JSON.stringify(crashReport, null, 2));
            console.log(`📋 Crash report saved: ${crashLogPath}`);
        } catch (error) {
            console.error('❌ Failed to save crash report:', error);
        }

        // Attempt restart if under limit
        if (this.restartCount < this.maxRestarts && !this.isRestarting) {
            this.attemptRestart();
        } else {
            console.error('❌ Max restart attempts reached. Shutting down.');
            this.shutdown();
            process.exit(1);
        }
    }

    handleGracefulExit() {
        console.log('🛑 Desktop application terminated gracefully');
        this.shutdown();
        process.exit(0);
    }

    attemptRestart() {
        this.isRestarting = true;
        this.restartCount++;

        console.log(`🔄 Attempting restart ${this.restartCount}/${this.maxRestarts}...`);

        // Wait before restart to avoid rapid restart loops
        setTimeout(() => {
            this.isRestarting = false;
            this.startTime = Date.now();
            this.startDesktopApp();
        }, 3000);
    }

    startHealthMonitoring() {
        // Monitor system resources every 30 seconds
        setInterval(() => {
            const memUsage = process.memoryUsage();
            const uptime = ((Date.now() - this.startTime) / 1000).toFixed(1);

            // Log resource usage in development mode
            if (process.env.NODE_ENV === 'development') {
                console.log(`📊 Health Check - Uptime: ${uptime}s, Memory: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB used`);
            }

            // Check for memory leaks (if using more than 1GB)
            if (memUsage.heapUsed > 1024 * 1024 * 1024) {
                console.warn('⚠️  High memory usage detected');
            }
        }, 30000);
    }

    shutdown() {
        console.log('🧹 Shutting down launcher...');

        if (this.desktopProcess && !this.desktopProcess.killed) {
            console.log('🛑 Terminating desktop application...');
            this.desktopProcess.kill('SIGTERM');

            // Force kill after timeout
            setTimeout(() => {
                if (this.desktopProcess && !this.desktopProcess.killed) {
                    console.log('⚠️  Force terminating desktop application...');
                    this.desktopProcess.kill('SIGKILL');
                }
            }, 5000);
        }

        console.log('✅ Launcher shutdown complete');
    }
}

// Application entry point
if (require.main === module) {
    try {
        new DesktopLauncher();
    } catch (error) {
        console.error('🚨 Fatal launcher error:', error);
        process.exit(1);
    }
}

module.exports = DesktopLauncher;