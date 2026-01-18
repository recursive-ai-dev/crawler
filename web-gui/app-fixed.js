// LPS Crawler Web GUI Application - Fixed Version

// Ensure DOM is fully loaded before initializing
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 LPS Crawler GUI: DOM loaded, initializing...');
    
    // Simple tab switching
    window.switchTab = function(tabIndex) {
        console.log('🔄 Switching to tab:', tabIndex);
        
        // Update active tab
        document.querySelectorAll('.tab').forEach((tab, index) => {
            tab.classList.toggle('active', index === tabIndex);
        });

        // Update active content
        document.querySelectorAll('.tab-content').forEach((content, index) => {
            content.classList.toggle('active', index === tabIndex);
        });
        
        console.log('✅ Tab switched to:', tabIndex);
    };

    // Slider updates
    window.updateSlider = function(sliderId) {
        const slider = document.getElementById(sliderId);
        const valueSpan = document.getElementById(sliderId + '-value');
        
        if (slider && valueSpan) {
            let value = slider.value;
            
            // Add units where appropriate
            if (sliderId.includes('delay') || sliderId.includes('window')) {
                value += 'ms';
            }
            
            valueSpan.textContent = value;
            console.log('📊 Slider updated:', sliderId, '=', value);
        }
    };

    // Download options toggle
    window.toggleDownloadOptions = function(type, checked) {
        console.log('📥 Toggling download options:', type, checked);
        const optionsDiv = document.getElementById(type + '-download-options');
        if (optionsDiv) {
            optionsDiv.style.display = checked ? 'block' : 'none';
            console.log('✅ Download options toggled:', type, checked ? 'visible' : 'hidden');
        }
    };

    // Notification system
    window.showNotification = function(message, type = 'info') {
        console.log('📢 Notification:', type, message);
        
        // Create notification element if it doesn't exist
        let notification = document.getElementById('notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'notification';
            notification.className = 'notification';
            document.body.appendChild(notification);
        }
        
        notification.className = 'notification ' + type;
        notification.innerHTML = `
            <strong>${type.charAt(0).toUpperCase() + type.slice(1)}</strong><br>
            ${message}
        `;
        notification.classList.add('show');

        setTimeout(() => {
            notification.classList.remove('show');
        }, 4000);
        
        console.log('✅ Notification shown:', type, message);
    };

    // Crawler Functions
    window.startCrawling = function() {
        console.log('🕷️ Starting web crawler...');
        
        const url = document.getElementById('crawl-url').value;
        const maxPhases = parseInt(document.getElementById('crawl-phases').value);
        
        if (!url) {
            showNotification('Please enter a URL', 'warning');
            return;
        }
        
        console.log('🎯 Crawler config:', { url, maxPhases });
        
        // Reset UI
        document.getElementById('crawl-progress').style.width = '0%';
        document.getElementById('crawl-status').textContent = 'Initializing crawler...';
        
        // Start spider animation
        if (window.spiderAnimation) {
            window.spiderAnimation.start();
        }

        // Simulate crawling
        simulateCrawling(url, maxPhases);
    };

    window.exportCrawlResults = function() {
        console.log('⬇️ Exporting crawl results...');
        showNotification('Export functionality would save results to file', 'info');
    };

    // Image Extractor Functions
    window.startImageExtraction = function() {
        console.log('📸 Starting image extraction...');
        
        const url = document.getElementById('image-url').value;
        const maxScrolls = parseInt(document.getElementById('image-scrolls').value);
        const scrollDelay = parseInt(document.getElementById('image-delay').value);
        const downloadMedia = document.getElementById('image-download').checked;
        
        if (!url) {
            showNotification('Please enter a URL', 'warning');
            return;
        }
        
        console.log('🎯 Image extractor config:', { url, maxScrolls, scrollDelay, downloadMedia });
        
        // Reset UI
        document.getElementById('image-progress').style.width = '0%';
        document.getElementById('image-status').textContent = 'Initializing image extractor...';
        document.getElementById('image-gallery').innerHTML = '';
        
        // Simulate image extraction
        simulateImageExtraction(url, maxScrolls, scrollDelay, downloadMedia);
    };

    // Video Extractor Functions
    window.startVideoExtraction = function() {
        console.log('🎥 Starting video extraction...');
        
        const url = document.getElementById('video-url').value;
        const observationWindow = parseInt(document.getElementById('video-window').value);
        const downloadMedia = document.getElementById('video-download').checked;
        
        if (!url) {
            showNotification('Please enter a URL', 'warning');
            return;
        }
        
        console.log('🎯 Video extractor config:', { url, observationWindow, downloadMedia });
        
        // Reset UI
        document.getElementById('video-progress').style.width = '0%';
        document.getElementById('video-status').textContent = 'Initializing video extractor...';
        document.getElementById('video-list').innerHTML = '';
        
        // Simulate video extraction
        simulateVideoExtraction(url, observationWindow, downloadMedia);
    };

    // Settings Functions
    window.saveSettings = function() {
        console.log('💾 Saving settings...');
        showNotification('Settings saved successfully!', 'success');
    };

    // Simulation Functions
    function simulateCrawling(url, maxPhases) {
        console.log('🔄 Simulating crawling for', maxPhases, 'phases...');
        
        let currentPhase = 0;
        let totalLinks = 0;
        let startTime = Date.now();
        
        function crawlPhase() {
            if (currentPhase >= maxPhases) {
                document.getElementById('crawl-progress').style.width = '100%';
                document.getElementById('crawl-status').textContent = 'Crawling completed!';
                showNotification('Web crawling completed successfully!', 'success');

                // Stop spider animation
                if (window.spiderAnimation) {
                    window.spiderAnimation.stop();
                }

                return;
            }
            
            // Update progress
            const progress = ((currentPhase + 1) / maxPhases) * 100;
            document.getElementById('crawl-progress').style.width = progress + '%';
            document.getElementById('crawl-status').textContent = `Phase ${currentPhase + 1} of ${maxPhases}`;
            
            // Simulate finding links
            const linksFound = Math.floor(Math.random() * 8) + 2;
            totalLinks += linksFound;
            const tension = Math.random() * 2;
            
            // Update results
            document.getElementById('crawl-phases-completed').textContent = currentPhase + 1;
            document.getElementById('crawl-links-found').textContent = totalLinks;
            document.getElementById('crawl-duration').textContent = ((Date.now() - startTime) / 1000).toFixed(1) + 's';
            document.getElementById('crawl-tension').textContent = tension.toFixed(2);
            
            currentPhase++;
            
            // Continue to next phase
            setTimeout(crawlPhase, 800);
        }
        
        crawlPhase();
    }

    function simulateImageExtraction(url, maxScrolls, scrollDelay, downloadMedia) {
        console.log('🔄 Simulating image extraction for', maxScrolls, 'scrolls...');
        
        let currentScroll = 0;
        let totalImages = 0;
        let downloadedImages = 0;
        let startTime = Date.now();
        
        function scrollPhase() {
            if (currentScroll >= maxScrolls) {
                document.getElementById('image-progress').style.width = '100%';
                document.getElementById('image-status').textContent = 'Image extraction completed!';
                showNotification(`Image extraction completed! Found ${totalImages} images${downloadMedia ? ', downloaded ' + downloadedImages : ''}`, 'success');
                return;
            }
            
            // Update progress
            const progress = ((currentScroll + 1) / maxScrolls) * 100;
            document.getElementById('image-progress').style.width = progress + '%';
            document.getElementById('image-status').textContent = `Scroll ${currentScroll + 1} of ${maxScrolls}`;
            
            // Simulate finding images
            const imagesFound = Math.floor(Math.random() * 5) + 1;
            totalImages += imagesFound;
            
            // Add images to gallery
            for (let i = 0; i < imagesFound; i++) {
                addImageToGallery({
                    url: `https://via.placeholder.com/300x200/1976d2/ffffff?text=Image+${totalImages - imagesFound + i + 1}`,
                    size: Math.floor(Math.random() * 500000) + 50000,
                    type: 'jpg'
                });
                
                if (downloadMedia) {
                    downloadedImages++;
                }
            }
            
            // Update counts
            document.getElementById('image-count').textContent = totalImages;
            document.getElementById('image-downloaded').textContent = downloadMedia ? downloadedImages : 0;
            
            currentScroll++;
            
            // Continue to next scroll
            setTimeout(scrollPhase, scrollDelay);
        }
        
        scrollPhase();
    }

    function simulateVideoExtraction(url, observationWindow, downloadMedia) {
        console.log('🔄 Simulating video extraction...');
        
        let currentStep = 0;
        const totalSteps = 5;
        let totalVideos = 0;
        let downloadedVideos = 0;
        
        function extractionStep() {
            if (currentStep >= totalSteps) {
                document.getElementById('video-progress').style.width = '100%';
                document.getElementById('video-status').textContent = 'Video extraction completed!';
                showNotification(`Video extraction completed! Found ${totalVideos} video sources${downloadMedia ? ', downloaded ' + downloadedVideos : ''}`, 'success');
                return;
            }
            
            // Update progress
            const progress = ((currentStep + 1) / totalSteps) * 100;
            document.getElementById('video-progress').style.width = progress + '%';
            document.getElementById('video-status').textContent = `Scanning for video sources...`;
            
            // Simulate finding videos at step 2
            if (currentStep === 2) {
                const sampleVideos = [
                    { type: 'hls', url: 'https://example.com/stream.m3u8', quality: '1080p', source: 'network' },
                    { type: 'dash', url: 'https://example.com/stream.mpd', quality: '720p', source: 'network' },
                    { type: 'direct', url: 'https://example.com/video.mp4', quality: '1080p', source: 'dom' },
                    { type: 'blob', url: 'blob:https://example.com/video', quality: 'Unknown', source: 'dom' }
                ];
                
                sampleVideos.forEach((video, index) => {
                    const videoData = { ...video, id: `video-${index}` };
                    totalVideos++;
                    
                    if (downloadMedia && video.type !== 'blob') {
                        downloadedVideos++;
                    }
                });
                
                displayVideoResults({
                    hls: [sampleVideos[0]],
                    dash: [sampleVideos[1]], 
                    direct: [sampleVideos[2]],
                    blob: [sampleVideos[3]],
                    other: []
                }, totalVideos, downloadMedia ? downloadedVideos : 0);
            }
            
            currentStep++;
            
            // Continue to next step
            setTimeout(extractionStep, observationWindow / totalSteps);
        }
        
        extractionStep();
    }

    function addImageToGallery(imageData) {
        const gallery = document.getElementById('image-gallery');
        const imageItem = document.createElement('div');
        imageItem.className = 'image-item';
        imageItem.innerHTML = `
            <div class="image-placeholder">
                <span class="material-icons">photo_camera</span>
                <span>Image ${gallery.children.length + 1}</span>
            </div>
            <div class="image-info">
                <div style="font-size: 0.8rem; color: #666;">${formatFileSize(imageData.size)}</div>
                <div style="font-size: 0.8rem; color: #666;">${imageData.type.toUpperCase()}</div>
            </div>
        `;
        gallery.appendChild(imageItem);
    }

    function displayVideoResults(groupedVideos, totalVideos, downloadedVideos) {
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

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Initialize everything
    console.log('✅ LPS Crawler GUI: Initialization complete!');
    console.log('🎯 Ready for user interaction!');
    showNotification('LPS Crawler GUI loaded successfully!', 'success');
});