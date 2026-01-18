// Spider Animation for LPS Crawler Pro

function createSpiderAnimation(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error('Spider canvas not found!');
        return;
    }

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let spiders = [];
    const web = {
        nodes: [],
        edges: []
    };

    function resizeCanvas() {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Create a spider
    function createSpider(x, y) {
        return {
            x: x,
            y: y,
            targetX: x,
            targetY: y,
            speed: 0.5 + Math.random() * 1.5,
            size: 6 + Math.random() * 4,
            legPhase: Math.random() * Math.PI * 2,
            update: function() {
                // Move towards target
                const dx = this.targetX - this.x;
                const dy = this.targetY - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < this.speed) {
                    this.x = this.targetX;
                    this.y = this.targetY;
                    // Set new random target on the canvas
                    this.targetX = Math.random() * canvas.width;
                    this.targetY = Math.random() * canvas.height;
                } else {
                    this.x += (dx / dist) * this.speed;
                    this.y += (dy / dist) * this.speed;
                }

                this.legPhase += 0.1;
            },
            draw: function() {
                ctx.fillStyle = '#1a1a1a';

                // Body
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();

                // Legs
                ctx.strokeStyle = '#1a1a1a';
                ctx.lineWidth = 1.5;
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 4) * Math.PI + Math.PI / 8;
                    const legLength = this.size * 1.5;
                    const legWave = Math.sin(this.legPhase + i * Math.PI / 4) * 5;

                    const startX = this.x + Math.cos(angle) * this.size * 0.8;
                    const startY = this.y + Math.sin(angle) * this.size * 0.8;
                    const endX = this.x + Math.cos(angle) * (legLength + legWave);
                    const endY = this.y + Math.sin(angle) * (legLength + legWave);

                    ctx.beginPath();
                    ctx.moveTo(startX, startY);
                    ctx.lineTo(endX, endY);
                    ctx.stroke();
                }
            }
        };
    }

    // Initialize web and spiders
    function initialize() {
        // Create spiders
        spiders = [];
        for (let i = 0; i < 5; i++) {
            spiders.push(createSpider(Math.random() * canvas.width, Math.random() * canvas.height));
        }
    }

    function drawWeb() {
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
        ctx.lineWidth = 1;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Radial lines
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(centerX + Math.cos(angle) * canvas.width, centerY + Math.sin(angle) * canvas.height);
            ctx.stroke();
        }

        // Concentric circles
        for (let i = 1; i < 6; i++) {
            const radius = (i / 5) * Math.min(canvas.width, canvas.height) / 2;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    // Animation loop
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        drawWeb();

        // Draw spiders
        spiders.forEach(spider => {
            spider.update();
            spider.draw();
        });

        animationFrameId = requestAnimationFrame(animate);
    }

    // Public API
    return {
        start: function() {
            if (animationFrameId) return; // Already running
            console.log('Starting spider animation...');
            initialize();
            animate();
        },
        stop: function() {
            if (!animationFrameId) return; // Already stopped
            console.log('Stopping spider animation...');
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
            // Clear canvas
            setTimeout(() => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }, 100);
        }
    };
}

// Make it available globally, but wrapped in a check to avoid errors in non-browser envs
if (typeof window !== 'undefined') {
    window.spiderAnimation = createSpiderAnimation('spider-canvas');
}
