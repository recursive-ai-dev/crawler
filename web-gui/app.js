// LPS Crawler Web GUI Application

class Spider {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = Math.random() * 2 - 1;
        this.vy = Math.random() * 2 - 1;
        this.size = Math.random() * 5 + 2;
    }

    draw() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.beginPath();
        this.ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        this.ctx.fill();
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > this.canvas.width) {
            this.vx *= -1;
        }

        if (this.y < 0 || this.y > this.canvas.height) {
            this.vy *= -1;
        }
    }
}

class CrawlerApp {
    constructor() {
        this.activeTab = 0;
        this.isRunning = false;
        this.settings = {
            downloadDirectory: './downloads',
            maxConcurrentDownloads: 5,
            rateLimit: 5,
            headlessMode: true,
            respectRobots: true
        };
        
        this.spiders = [];
        this.animationFrameId = null;

        this.initializeApp();
    }

    initializeApp() {
        this.loadSettings();
        this.setupEventListeners();
        this.updateAllSliders();
        this.showNotification('LPS Crawler GUI loaded successfully!', 'success');

        this.canvas = document.getElementById('spider-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
    }

    loadSettings() {
        const savedSettings = localStorage.getItem('lps-crawler-settings');
        if (savedSettings) {
            this.settings = JSON.parse(savedSettings);
            this.applySettings();
        }
    }

    applySettings() {
        document.getElementById('settings-download-dir').value = this.settings.downloadDirectory;
        document.getElementById('settings-concurrent').value = this.settings.maxConcurrentDownloads;
        document.getElementById('settings-rate').value = this.settings.rateLimit;
        
        this.updateSlider('settings-concurrent');
        this.updateSlider('settings-rate');
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab').forEach((tab, index) => {
            tab.addEventListener('click', () => this.switchTab(index));
        });

        // Slider updates
        document.querySelectorAll('.slider').forEach(slider => {
            slider.addEventListener('input', (e) => this.updateSlider(e.target.id));
        });

        // Download toggles
        document.getElementById('image-download').addEventListener('change', (e) => {
            this.toggleDownloadOptions('image', e.target.checked);
        });

        document.getElementById('video-download').addEventListener('change', (e) => {
            this.toggleDownloadOptions('video', e.target.checked);
        });
    }

    switchTab(tabIndex) {
        // Update active tab
        document.querySelectorAll('.tab').forEach((tab, index) => {
            tab.classList.toggle('active', index === tabIndex);
        });

        // Update active content
        document.querySelectorAll('.tab-content').forEach((content, index) => {
            content.classList.toggle('active', index === tabIndex);
        });

        this.activeTab = tabIndex;
    }

    updateSlider(sliderId) {
        const slider = document.getElementById(sliderId);
        const valueSpan = document.getElementById(sliderId + '-value');
        
        if (valueSpan) {
            let value = slider.value;
            
            // Add units where appropriate
            if (sliderId.includes('delay') || sliderId.includes('window')) {
                value += 'ms';
            }
            
            valueSpan.textContent = value;
        }
    }

    updateAllSliders() {
        document.querySelectorAll('.slider').forEach(slider => {
            this.updateSlider(slider.id);
        });
    }

    toggleDownloadOptions(type, checked) {
        const optionsDiv = document.getElementById(type + '-download-options');
        optionsDiv.style.display = checked ? 'block' : 'none';
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        notification.className = 'notification ' + type;
        notification.innerHTML = `
            <strong>${type.charAt(0).toUpperCase() + type.slice(1)}</strong><br>
            ${message}
        `;
        notification.classList.add('show');

        setTimeout(() => {
            notification.classList.remove('show');
        }, 4000);
    }

    // Crawler Functions
    async startCrawling() {
        if (this.isRunning) return;

        const url = document.getElementById('crawl-url').value;
        const maxPhases = parseInt(document.getElementById('crawl-phases').value);

        if (!url) {
            this.showNotification('Please enter a URL', 'warning');
            return;
        }

        this.isRunning = true;
        this.showNotification('Starting web crawler...', 'info');

        // Reset UI
        document.getElementById('crawl-progress').style.width = '0%';
        document.getElementById('crawl-status').textContent = 'Initializing crawler...';
        document.getElementById('crawl-phases-completed').textContent = '0';
        document.getElementById('crawl-links-found').textContent = '0';
        document.getElementById('crawl-duration').textContent = '0.0s';
        document.getElementById('crawl-tension').textContent = '0.00';

        this.spiders = Array.from({ length: 100 }, () => new Spider(this.canvas));
        this.animateSpiders();

        try {
            const startTime = Date.now();
            let totalLinks = 0;
            let totalPhases = 0;
            let totalTension = 0;

            // Simulate crawling
            for (let phase = 0; phase < maxPhases; phase++) {
                if (!this.isRunning) break;

                // Update progress
                const progress = ((phase + 1) / maxPhases) * 100;
                document.getElementById('crawl-progress').style.width = progress + '%';
                document.getElementById('crawl-status').textContent = `Phase ${phase + 1} of ${maxPhases}`;

                // Simulate finding links
                const linksFound = Math.floor(Math.random() * 8) + 2;
                totalLinks += linksFound;
                totalPhases = phase + 1;

                // Simulate tension calculation
                const tension = Math.random() * 2;
                totalTension += tension;

                // Update results
                document.getElementById('crawl-phases-completed').textContent = totalPhases;
                document.getElementById('crawl-links-found').textContent = totalLinks;
                document.getElementById('crawl-duration').textContent = ((Date.now() - startTime) / 1000).toFixed(1) + 's';
                document.getElementById('crawl-tension').textContent = (totalTension / totalPhases).toFixed(2);

                // Simulate stasis detection
                if (phase > 3 && tension < 0.2) {
                    this.showNotification('Stasis detected - crawling complete!', 'success');
                    break;
                }

                // Wait between phases
                await new Promise(resolve => setTimeout(resolve, 800));
            }

            if (this.isRunning) {
                document.getElementById('crawl-progress').style.width = '100%';
                document.getElementById('crawl-status').textContent = 'Crawling completed!';
                this.showNotification('Web crawling completed successfully!', 'success');
            }

        } catch (error) {
            this.showNotification('Crawling failed: ' + error.message, 'error');
        } finally {
            this.isRunning = false;
            cancelAnimationFrame(this.animationFrameId);
        }
    }

    animateSpiders() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.spiders.forEach(spider => {
            spider.update();
            spider.draw();
        });

        this.animationFrameId = requestAnimationFrame(() => this.animateSpiders());
    }

    exportCrawlResults() {
        this.showNotification('Export functionality would save results to file', 'info');
    }

    // Image Extractor Functions
    async startImageExtraction() {
        if (this.isRunning) return;

        const url = document.getElementById('image-url').value;
        const maxScrolls = parseInt(document.getElementById('image-scrolls').value);
        const scrollDelay = parseInt(document.getElementById('image-delay').value);
        const downloadMedia = document.getElementById('image-download').checked;

        if (!url) {
            this.showNotification('Please enter a URL', 'warning');
            return;
        }

        this.isRunning = true;
        this.showNotification('Starting image extraction...', 'info');

        // Reset UI
        document.getElementById('image-progress').style.width = '0%';
        document.getElementById('image-status').textContent = 'Initializing image extractor...';
        document.getElementById('image-count').textContent = '0';
        document.getElementById('image-downloaded').textContent = '0';
        document.getElementById('image-gallery').innerHTML = '';

        try {
            const startTime = Date.now();
            let totalImages = 0;
            let downloadedImages = 0;

            // Simulate image extraction
            for (let scroll = 0; scroll < maxScrolls; scroll++) {
                if (!this.isRunning) break;

                // Update progress
                const progress = ((scroll + 1) / maxScrolls) * 100;
                document.getElementById('image-progress').style.width = progress + '%';
                document.getElementById('image-status').textContent = `Scroll ${scroll + 1} of ${maxScrolls}`;

                // Simulate finding images
                const imagesFound = Math.floor(Math.random() * 5) + 1;
                totalImages += imagesFound;

                // Add images to gallery
                for (let i = 0; i < imagesFound; i++) {
                    const imageData = {
                        url: `https://via.placeholder.com/300x200/1976d2/ffffff?text=Image+${totalImages - imagesFound + i + 1}`,
                        originalUrl: `${url}/image-${scroll}-${i}.jpg`,
                        size: Math.floor(Math.random() * 500000) + 50000,
                        type: 'jpg'
                    };

                    this.addImageToGallery(imageData);
                    
                    if (downloadMedia) {
                        downloadedImages++;
                        this.simulateDownload(imageData);
                    }
                }

                // Update counts
                document.getElementById('image-count').textContent = totalImages;
                document.getElementById('image-downloaded').textContent = downloadMedia ? downloadedImages : 0;

                // Wait between scrolls
                await new Promise(resolve => setTimeout(resolve, scrollDelay));
            }

            if (this.isRunning) {
                document.getElementById('image-progress').style.width = '100%';
                document.getElementById('image-status').textContent = 'Image extraction completed!';
                this.showNotification(`Image extraction completed! Found ${totalImages} images${downloadMedia ? ', downloaded ' + downloadedImages : ''}`, 'success');
            }

        } catch (error) {
            this.showNotification('Image extraction failed: ' + error.message, 'error');
        } finally {
            this.isRunning = false;
        }
    }

    addImageToGallery(imageData) {
        const gallery = document.getElementById('image-gallery');
        const imageItem = document.createElement('div');
        imageItem.className = 'image-item';
        imageItem.innerHTML = `
            <div class="image-placeholder">
                <span class="material-icons">photo_camera</span>
                <span>Image ${gallery.children.length + 1}</span>
            </div>
            <div class="image-info">
                <div style="font-size: 0.8rem; color: #666;">${this.formatFileSize(imageData.size)}</div>
                <div style="font-size: 0.8rem; color: #666;">${imageData.type.toUpperCase()}</div>
            </div>
        `;
        gallery.appendChild(imageItem);
    }

    // Video Extractor Functions
    async startVideoExtraction() {
        if (this.isRunning) return;

        const url = document.getElementById('video-url').value;
        const observationWindow = parseInt(document.getElementById('video-window').value);
        const downloadMedia = document.getElementById('video-download').checked;

        if (!url) {
            this.showNotification('Please enter a URL', 'warning');
            return;
        }

        this.isRunning = true;
        this.showNotification('Starting video extraction...', 'info');

        // Reset UI
        document.getElementById('video-progress').style.width = '0%';
        document.getElementById('video-status').textContent = 'Initializing video extractor...';
        document.getElementById('video-total').textContent = '0';
        document.getElementById('video-downloaded').textContent = '0';
        document.getElementById('video-list').innerHTML = '';

        try {
            const steps = 5;
            const sampleVideos = [
                { type: 'hls', url: 'https://example.com/stream.m3u8', quality: '1080p', source: 'network' },
                { type: 'dash', url: 'https://example.com/stream.mpd', quality: '720p', source: 'network' },
                { type: 'direct', url: 'https://example.com/video.mp4', quality: '1080p', source: 'dom' },
                { type: 'blob', url: 'blob:https://example.com/video', quality: 'Unknown', source: 'dom' }
            ];

            let totalVideos = 0;
            let downloadedVideos = 0;
            const groupedVideos = { hls: [], dash: [], direct: [], blob: [], other: [] };

            for (let step = 0; step < steps; step++) {
                if (!this.isRunning) break;

                // Update progress
                const progress = ((step + 1) / steps) * 100;
                document.getElementById('video-progress').style.width = progress + '%';
                document.getElementById('video-status').textContent = `Scanning for video sources...`;

                // Simulate finding videos at step 2
                if (step === 2) {
                    sampleVideos.forEach((video, index) => {
                        const videoData = { ...video, id: `video-${index}` };
                        totalVideos++;
                        groupedVideos[video.type].push(videoData);

                        if (downloadMedia && video.type !== 'blob') {
                            downloadedVideos++;
                            this.simulateDownload(videoData);
                        }
                    });

                    this.displayVideoResults(groupedVideos, totalVideos, downloadMedia ? downloadedVideos : 0);
                }

                // Wait between steps
                await new Promise(resolve => setTimeout(resolve, observationWindow / steps));
            }

            if (this.isRunning) {
                document.getElementById('video-progress').style.width = '100%';
                document.getElementById('video-status').textContent = 'Video extraction completed!';
                this.showNotification(`Video extraction completed! Found ${totalVideos} video sources${downloadMedia ? ', downloaded ' + downloadedVideos : ''}`, 'success');
            }

        } catch (error) {
            this.showNotification('Video extraction failed: ' + error.message, 'error');
        } finally {
            this.isRunning = false;
        }
    }

    displayVideoResults(groupedVideos, totalVideos, downloadedVideos) {
        document.getElementById('video-total').textContent = totalVideos;
        document.getElementById('video-downloaded').textContent = downloadedVideos;

        const videoList = document.getElementById('video-list');
        videoList.innerHTML = '';

        const videoTypes = [
            { type: 'hls', name: 'HLS Streams', icon: '📡', color: 'primary' },
            { type: 'dash', name: 'DASH Streams', icon: '📊', color: 'secondary' },
            { type: 'direct', name: 'Direct Files', icon: '🎬', color: 'success' },
            { type: 'blob', name: 'Blob URLs', icon: '💾', color: 'warning' }
        ];

        videoTypes.forEach(({ type, name, icon, color }) => {
            if (groupedVideos[type].length > 0) {
                const section = document.createElement('div');
                section.className = 'video-item';
                section.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                        <span>${icon}</span>
                        <h4 style="margin: 0;">${name}</h4>
                        <span class="chip chip-${color}">${groupedVideos[type].length}</span>
                    </div>
                    <div style="font-size: 0.9rem; color: #666;">
                        ${groupedVideos[type].map(video => `
                            <div style="margin-bottom: 8px;">
                                <div style="font-family: monospace; font-size: 0.8rem;">${video.url.substring(0, 60)}...</div>
                                <div style="margin-top: 4px;">
                                    <span class="chip chip-${color}">${video.quality}</span>
                                    <span class="chip chip-default">${video.source}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
                videoList.appendChild(section);
            }
        });
    }

    // Settings Functions
    saveSettings() {
        this.settings.downloadDirectory = document.getElementById('settings-download-dir').value;
        this.settings.maxConcurrentDownloads = parseInt(document.getElementById('settings-concurrent').value);
        this.settings.rateLimit = parseInt(document.getElementById('settings-rate').value);

        localStorage.setItem('lps-crawler-settings', JSON.stringify(this.settings));
        this.showNotification('Settings saved successfully!', 'success');
    }

    // Utility Functions
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    simulateDownload(fileData) {
        // Simulate download process
        console.log('Simulating download:', fileData);
        // In a real implementation, this would trigger actual file download
    }
}

// Global functions for HTML event handlers
function switchTab(tabIndex) {
    app.switchTab(tabIndex);
}

function updateSlider(sliderId) {
    app.updateSlider(sliderId);
}

function toggleDownloadOptions(type, checked) {
    app.toggleDownloadOptions(type, checked);
}

function startCrawling() {
    app.startCrawling();
}

function exportCrawlResults() {
    app.exportCrawlResults();
}

function startImageExtraction() {
    app.startImageExtraction();
}

function startVideoExtraction() {
    app.startVideoExtraction();
}

function saveSettings() {
    app.saveSettings();
}

// Initialize the app
const app = new CrawlerApp();