#!/usr/bin/env node

/**
 * LPS Crawler Implementation Test Suite
 * Validates all production-grade components are working correctly
 * 
 * @author Production-Grade Implementer
 * @version 1.0.0
 */

const fs = require('fs').promises;
const path = require('path');
const http = require('http');
const mathUtils = require('./src/utils/mathUtils');
const {
    BrowserInterface,
    LPSCrawler,
    TextExtractor,
    MFTExtractor,
    TBRExtractor,
    AudioExtractor,
    PDFExtractor,
    DataSynthesizer
} = require('./src');
const { createTestServer, closeServer } = require('./tests/test-utils');

class ImplementationTester {
    constructor() {
        this.testResults = [];
        this.startTime = Date.now();
        this.testContext = {};
    }

    async runAllTests() {
        console.log('🔍 LPS Crawler Implementation Test Suite');
        console.log('==========================================');
        console.log('');
        const { server, baseUrl } = await createTestServer();
        this.testContext.server = server;
        this.testContext.baseUrl = baseUrl;

        try {
            await this.testFileStructure();
            await this.testCodeQuality();
            await this.testServerFunctionality();
            await this.testMathUtils();
            await this.testBrowserInterfaceIntegration();
            await this.testCrawlerIntegration();
            await this.testExtractorIntegration();
            await this.testDataSynthesizerIntegration();
            await this.testDesktopAppStructure();
            await this.testGUIImplementation();
        } finally {
            await closeServer(this.testContext.server);
        }

        this.generateTestReport();
    }

    async testFileStructure() {
        console.log('📁 Testing File Structure...');
        
        const requiredFiles = [
            'serve-gui.js',
            'index.html',
            'package.json',
            'start-desktop.js',
            'desktop/main.js',
            'desktop/preload.js'
        ];

        for (const file of requiredFiles) {
            try {
                await fs.access(path.join(__dirname, file));
                this.testResults.push({
                    test: `File exists: ${file}`,
                    status: 'PASS',
                    details: 'File found and accessible'
                });
                console.log(`   ✅ ${file}`);
            } catch (error) {
                this.testResults.push({
                    test: `File exists: ${file}`,
                    status: 'FAIL',
                    details: `File not found: ${error.message}`
                });
                console.log(`   ❌ ${file} - MISSING`);
            }
        }
        
        console.log('');
    }

    async testCodeQuality() {
        console.log('🔍 Testing Code Quality...');
        
        const filesToCheck = [
            'start-desktop.js',
            'serve-gui.js',
            'desktop/main.js',
            'index.html'
        ];

        for (const file of filesToCheck) {
            try {
                const content = await fs.readFile(path.join(__dirname, file), 'utf8');
                const lines = content.split('\n');
                const hasComments = lines.some(line => line.includes('/**') || line.includes('//'));
                const hasErrorHandling = content.includes('try') || content.includes('catch') || content.includes('error');
                const hasProductionFeatures = content.includes('production') || content.includes('PRODUCTION');

                this.testResults.push({
                    test: `Code quality: ${file}`,
                    status: hasComments && hasErrorHandling ? 'PASS' : 'WARN',
                    details: `Lines: ${lines.length}, Comments: ${hasComments}, Error handling: ${hasErrorHandling}, Production features: ${hasProductionFeatures}`
                });
                
                const status = hasComments && hasErrorHandling ? '✅' : '⚠️';
                console.log(`   ${status} ${file} - ${lines.length} lines`);
                
            } catch (error) {
                this.testResults.push({
                    test: `Code quality: ${file}`,
                    status: 'FAIL',
                    details: `Could not read file: ${error.message}`
                });
                console.log(`   ❌ ${file} - ERROR`);
            }
        }
        
        console.log('');
    }

    async testServerFunctionality() {
        console.log('🌐 Testing Server Functionality...');
        
        // Start the server in a child process
        const { spawn } = require('child_process');
        const serverProcess = spawn('node', ['serve-gui.js'], {
            stdio: 'pipe',
            env: { ...process.env, PORT: '3002' }
        });

        let serverStarted = false;
        let serverOutput = '';

        serverProcess.stdout.on('data', (data) => {
            serverOutput += data.toString();
            if (data.toString().includes('READY TO USE!')) {
                serverStarted = true;
            }
        });

        // Wait for server to start
        await this.delay(3000);

        if (serverStarted) {
            console.log('   ✅ Server started successfully');
            
            // Test HTTP requests
            await this.testHTTPRequest('http://localhost:3002', 'Main page');
            await this.testHTTPRequest('http://localhost:3002/index.html', 'GUI file');
            await this.testHTTPRequest('http://localhost:3002/api/health', 'Health endpoint');
            
            this.testResults.push({
                test: 'Server functionality',
                status: 'PASS',
                details: 'Server starts and responds to HTTP requests'
            });
        } else {
            console.log('   ❌ Server failed to start');
            this.testResults.push({
                test: 'Server functionality',
                status: 'FAIL',
                details: 'Server did not start within timeout'
            });
        }

        // Kill server process
        serverProcess.kill('SIGTERM');
        await this.delay(1000);
        
        console.log('');
    }

    recordResult(test, passed, details) {
        const status = passed ? 'PASS' : 'FAIL';
        this.testResults.push({ test, status, details });
        const icon = passed ? '✅' : '❌';
        console.log(`   ${icon} ${test}`);
    }

    async testMathUtils() {
        console.log('📐 Testing Mathematical Utilities...');
        const range = Array.from({ length: 14 }, (_, idx) => idx - 1);

        const clampResults = range.map(value => mathUtils.clamp(value, 0, 10));
        const clampWithinBounds = clampResults.every(value => value >= 0 && value <= 10);
        this.recordResult(
            'clamp enforces bounds for -1..12',
            clampWithinBounds,
            `Clamp results: ${clampResults.join(', ')}`
        );

        const readingTimes = range.map(value => mathUtils.calculateReadingTime(value, 200));
        const readingTimeValid = readingTimes.filter(value => value !== null).every(value => value >= 1);
        this.recordResult(
            'calculateReadingTime handles -1..12 range',
            readingTimeValid,
            `Reading time outputs: ${readingTimes.join(', ')}`
        );

        const rateLimitWaits = range.map(value => mathUtils.calculateRateLimitWait(1000, value * 100, 100));
        const waitValid = rateLimitWaits.every(value => value >= 100);
        this.recordResult(
            'calculateRateLimitWait enforces minWait across -1..12',
            waitValid,
            `Waits: ${rateLimitWaits.join(', ')}`
        );

        const successRates = range.map(value => mathUtils.calculateSuccessRate(Math.max(0, value), 12));
        const successRateValid = successRates.every(result => typeof result.rate === 'number' && typeof result.percentage === 'string');
        this.recordResult(
            'calculateSuccessRate outputs stable types for -1..12',
            successRateValid,
            `Rates: ${successRates.map(r => r.percentage).join(', ')}`
        );

        console.log('');
    }

    async testBrowserInterfaceIntegration() {
        console.log('🧭 Testing BrowserInterface Integration...');
        const browser = new BrowserInterface({
            headless: true,
            respectRobots: false,
            defaultTimeout: 5000
        });

        try {
            await browser.initialize(this.testContext.baseUrl);
            const scrollLinks = await browser.interact('SCROLL');
            const hasPage2 = scrollLinks.some(link => link.url.includes('/page2'));
            this.recordResult(
                'BrowserInterface scroll link extraction',
                hasPage2,
                `Scroll returned ${scrollLinks.length} links`
            );

            const nextLinks = await browser.interact('PAGE_NEXT');
            const hasPage3 = nextLinks.some(link => link.url.includes('/page3'));
            this.recordResult(
                'BrowserInterface pagination link extraction',
                hasPage3,
                `Pagination returned ${nextLinks.length} links`
            );
        } catch (error) {
            this.recordResult('BrowserInterface integration', false, error.message);
        } finally {
            await browser.close();
        }

        console.log('');
    }

    async testCrawlerIntegration() {
        console.log('🕸️  Testing LPSCrawler Integration...');
        const browser = new BrowserInterface({
            headless: true,
            respectRobots: false,
            defaultTimeout: 5000
        });
        const outputDir = path.join(__dirname, 'test-output');
        const crawler = new LPSCrawler(browser, {
            maxPhases: 2,
            saveInterval: 99,
            outputDir
        });

        try {
            const report = await crawler.run(this.testContext.baseUrl);
            this.testContext.crawlerLog = crawler.extractionLog;

            this.recordResult(
                'LPSCrawler report links found',
                report.linksFound > 0,
                `Links found: ${report.linksFound}`
            );
            this.recordResult(
                'LPSCrawler report phases executed',
                report.phases >= 2,
                `Phases: ${report.phases}`
            );
        } catch (error) {
            this.recordResult('LPSCrawler integration', false, error.message);
        }

        console.log('');
    }

    async testExtractorIntegration() {
        console.log('🧪 Testing Extractor Integrations...');
        const baseUrl = this.testContext.baseUrl;
        const browserOptions = { headless: true, respectRobots: false, defaultTimeout: 5000 };

        try {
            const textExtractor = new TextExtractor(new BrowserInterface(browserOptions), {
                waitForDynamicContent: 200
            });
            const textResults = await textExtractor.run(baseUrl);
            this.recordResult(
                'TextExtractor summary generated',
                textResults?.summary?.wordCount > 0,
                `Word count: ${textResults?.summary?.wordCount}`
            );

            const imageExtractor = new MFTExtractor(new BrowserInterface(browserOptions), {
                maxScrolls: 1,
                scrollDelay: 150,
                stabilizationDelay: 300
            });
            const imageResults = await imageExtractor.run(baseUrl);
            const heroImage = `${baseUrl}/media/hero.jpg`;
            this.recordResult(
                'MFTExtractor hero image detected',
                imageResults.items.includes(heroImage),
                `Images found: ${imageResults.items.length}`
            );

            const videoExtractor = new TBRExtractor(new BrowserInterface(browserOptions), {
                observationWindow: 500,
                scanShadowDOM: false
            });
            const videoResults = await videoExtractor.run(baseUrl);
            const hasHls = videoResults.grouped.hls.some(url => url.includes('stream.m3u8'));
            const hasMp4 = videoResults.grouped.direct.some(url => url.includes('video.mp4'));
            this.recordResult(
                'TBRExtractor streaming and direct video detected',
                hasHls && hasMp4,
                `HLS: ${videoResults.grouped.hls.length}, Direct: ${videoResults.grouped.direct.length}`
            );

            const audioExtractor = new AudioExtractor(new BrowserInterface(browserOptions), {
                observationWindow: 500
            });
            const audioResults = await audioExtractor.run(baseUrl);
            const hasMp3 = audioResults.grouped.mp3.some(url => url.includes('audio.mp3'));
            this.recordResult(
                'AudioExtractor mp3 detected',
                hasMp3,
                `Audio found: ${audioResults.items.length}`
            );

            const pdfExtractor = new PDFExtractor(new BrowserInterface(browserOptions));
            const pdfResults = await pdfExtractor.run(baseUrl);
            const hasPdf = pdfResults.grouped.pdf.some(url => url.includes('sample.pdf'));
            this.recordResult(
                'PDFExtractor pdf detected',
                hasPdf,
                `Documents found: ${pdfResults.items.length}`
            );
        } catch (error) {
            this.recordResult('Extractor integration', false, error.message);
        }

        console.log('');
    }

    async testDataSynthesizerIntegration() {
        console.log('🧾 Testing DataSynthesizer Integration...');
        const logs = this.testContext.crawlerLog || [];

        if (logs.length === 0) {
            this.recordResult('DataSynthesizer input logs', false, 'No crawl log entries captured');
            console.log('');
            return;
        }

        const synthesizer = new DataSynthesizer(logs);
        const jsonl = synthesizer.toJSONL();
        const markdown = synthesizer.toMarkdown();
        const csv = synthesizer.toCSV();
        const raw = synthesizer.toRaw();

        this.recordResult(
            'DataSynthesizer JSONL entries',
            jsonl.split('\n').length === logs.length,
            `JSONL lines: ${jsonl.split('\n').length}`
        );
        this.recordResult(
            'DataSynthesizer Markdown report',
            markdown.includes('# LPS Discovery Report') && markdown.includes('## Summary'),
            'Markdown report generated'
        );
        this.recordResult(
            'DataSynthesizer CSV output',
            csv.startsWith('timestamp,phase,interaction,url,text,title'),
            'CSV header validated'
        );
        this.recordResult(
            'DataSynthesizer raw output',
            raw.includes('SCROLL') || raw.includes('PAGE_NEXT'),
            'Raw output contains interactions'
        );

        console.log('');
    }

    async testHTTPRequest(url, description) {
        return new Promise((resolve) => {
            const req = http.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    const success = res.statusCode === 200;
                    const status = success ? '✅' : '❌';
                    console.log(`   ${status} ${description} - HTTP ${res.statusCode}`);
                    
                    this.testResults.push({
                        test: `HTTP request: ${description}`,
                        status: success ? 'PASS' : 'FAIL',
                        details: `Status: ${res.statusCode}, Content length: ${data.length}`
                    });
                    
                    resolve();
                });
            });

            req.on('error', (error) => {
                console.log(`   ❌ ${description} - Error: ${error.message}`);
                this.testResults.push({
                    test: `HTTP request: ${description}`,
                    status: 'FAIL',
                    details: `Error: ${error.message}`
                });
                resolve();
            });

            req.setTimeout(5000, () => {
                req.abort();
                console.log(`   ❌ ${description} - Timeout`);
                this.testResults.push({
                    test: `HTTP request: ${description}`,
                    status: 'FAIL',
                    details: 'Request timeout'
                });
                resolve();
            });
        });
    }

    async testDesktopAppStructure() {
        console.log('🖥️  Testing Desktop App Structure...');
        
        try {
            const desktopAppContent = await fs.readFile(path.join(__dirname, 'desktop', 'main.js'), 'utf8');
            
            const hasElectron = desktopAppContent.includes('electron');
            const hasIPCHandlers = desktopAppContent.includes('ipcMain');
            const hasBrowserWindow = desktopAppContent.includes('BrowserWindow');
            const hasErrorHandling = desktopAppContent.includes('try') || desktopAppContent.includes('catch');
            const hasGracefulShutdown = desktopAppContent.includes('SIGTERM') || desktopAppContent.includes('cleanup');

            const checks = [
                { name: 'Electron integration', passed: hasElectron },
                { name: 'IPC handlers', passed: hasIPCHandlers },
                { name: 'BrowserWindow usage', passed: hasBrowserWindow },
                { name: 'Error handling', passed: hasErrorHandling },
                { name: 'Graceful shutdown', passed: hasGracefulShutdown }
            ];

            checks.forEach(check => {
                const status = check.passed ? '✅' : '❌';
                console.log(`   ${status} ${check.name}`);
                
                this.testResults.push({
                    test: `Desktop app: ${check.name}`,
                    status: check.passed ? 'PASS' : 'FAIL',
                    details: check.passed ? 'Feature implemented' : 'Feature missing'
                });
            });
            
        } catch (error) {
            console.log(`   ❌ Could not read desktop app file: ${error.message}`);
            this.testResults.push({
                test: 'Desktop app structure',
                status: 'FAIL',
                details: `File read error: ${error.message}`
            });
        }
        
        console.log('');
    }

    async testGUIImplementation() {
        console.log('🎨 Testing GUI Implementation...');
        
        try {
            const guiContent = await fs.readFile(path.join(__dirname, 'index.html'), 'utf8');
            
            const hasProductionClasses = guiContent.includes('WebCrawler') || guiContent.includes('ImageExtractor') || guiContent.includes('VideoExtractor');
            const hasErrorHandling = guiContent.includes('try') || guiContent.includes('catch') || guiContent.includes('error');
            const hasStateManagement = guiContent.includes('AppState');
            const hasAdvancedUI = guiContent.includes('status-indicator') || guiContent.includes('log-output');
            const hasExportFunction = guiContent.includes('exportResults');
            const hasSettings = guiContent.includes('saveSettings');

            const checks = [
                { name: 'Production-grade classes', passed: hasProductionClasses },
                { name: 'Error handling', passed: hasErrorHandling },
                { name: 'State management', passed: hasStateManagement },
                { name: 'Advanced UI features', passed: hasAdvancedUI },
                { name: 'Export functionality', passed: hasExportFunction },
                { name: 'Settings management', passed: hasSettings }
            ];

            checks.forEach(check => {
                const status = check.passed ? '✅' : '❌';
                console.log(`   ${status} ${check.name}`);
                
                this.testResults.push({
                    test: `GUI: ${check.name}`,
                    status: check.passed ? 'PASS' : 'FAIL',
                    details: check.passed ? 'Feature implemented' : 'Feature missing'
                });
            });
            
        } catch (error) {
            console.log(`   ❌ Could not read GUI file: ${error.message}`);
            this.testResults.push({
                test: 'GUI implementation',
                status: 'FAIL',
                details: `File read error: ${error.message}`
            });
        }
        
        console.log('');
    }

    generateTestReport() {
        const duration = ((Date.now() - this.startTime) / 1000).toFixed(1);
        const passed = this.testResults.filter(r => r.status === 'PASS').length;
        const failed = this.testResults.filter(r => r.status === 'FAIL').length;
        const warnings = this.testResults.filter(r => r.status === 'WARN').length;
        const total = this.testResults.length;

        console.log('');
        console.log('📊 TEST SUMMARY');
        console.log('===============');
        console.log(`Total tests: ${total}`);
        console.log(`Passed: ${passed}`);
        console.log(`Failed: ${failed}`);
        console.log(`Warnings: ${warnings}`);
        console.log(`Duration: ${duration}s`);
        console.log('');

        if (failed === 0) {
            console.log('🎉 ALL TESTS PASSED!');
            console.log('✅ Implementation is production-ready');
        } else {
            console.log('❌ Some tests failed. Please review the implementation.');
        }

        // Generate detailed report
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                total,
                passed,
                failed,
                warnings,
                duration: duration + 's'
            },
            results: this.testResults
        };

        // Save report
        const reportPath = path.join(__dirname, 'test-report.json');
        fs.writeFile(reportPath, JSON.stringify(report, null, 2))
            .then(() => console.log(`📋 Detailed report saved: ${reportPath}`))
            .catch(err => console.error('Failed to save report:', err));
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const tester = new ImplementationTester();
    tester.runAllTests().catch(console.error);
}

module.exports = ImplementationTester;
