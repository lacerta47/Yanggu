const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const resultScreen = document.getElementById('result-screen');
const feedbackEl = document.getElementById('feedback');
const hudEl = document.getElementById('hud');
const containerEl = document.getElementById('game-container');

// 게임 상태
let score = 0;
let level = 1;
let highScore = localStorage.getItem('rhythmHighScore') || 0;
let gameActive = false;
let blocks = [];
let animationId;

// 사운드 관련
let audioCtx;
let bgmInterval;
let melodyStep = 0;

// 이펙트 관련 상태
let lavaOffset = 0;
let heavenLightAngle = 0;
let particles = [];
let clouds = [];
let frameCount = 0;
let jumpScareTimer = 0; // v11 추가: 점프스케어 타이머

// 레벨 테마 정보
const levelThemes = [
    { 
        name: "천국",
        bodyBg: "#87cefa", canvasBg: "#e0f7fa", borderColor: "#ffffff",
        hudColor: "#0277bd", blockBaseColor: 200, 
        speed: 0.8, bpm: 1200, 
        melody: [523.25, 659.25, 783.99, 1046.50]
    },
    { 
        name: "해질녘",
        bodyBg: "#ffb74d", canvasBg: "#fff3e0", borderColor: "#ffe0b2",
        hudColor: "#e65100", blockBaseColor: 40, 
        speed: 1.1, bpm: 1000, 
        melody: [440.00, 523.25, 659.25, 783.99]
    },
    { 
        name: "황혼",
        bodyBg: "#9575cd", canvasBg: "#ede7f6", borderColor: "#d1c4e9",
        hudColor: "#311b92", blockBaseColor: 280, 
        speed: 1.4, bpm: 850, 
        melody: [349.23, 440.00, 523.25, 659.25]
    },
    { 
        name: "어둠",
        bodyBg: "#616161", canvasBg: "#9e9e9e", borderColor: "#757575",
        hudColor: "#212121", blockBaseColor: 0, 
        speed: 1.8, bpm: 700, 
        melody: [329.63, 392.00, 493.88, 587.33]
    },
    { 
        name: "심연",
        bodyBg: "#3e2723", canvasBg: "#5d4037", borderColor: "#4e342e",
        hudColor: "#ffccbc", blockBaseColor: 10, 
        speed: 2.2, bpm: 550, 
        melody: [293.66, 349.23, 440.00, 523.25]
    },
    { 
        name: "지옥",
        bodyBg: "#111111", canvasBg: "#212121", borderColor: "#b71c1c",
        hudColor: "#ff5252", blockBaseColor: 0, 
        speed: 2.8, bpm: 450, 
        melody: [261.63, 311.13, 392.00, 466.16, 523.25]
    }
];

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playTone(freq, type, duration, volume = 0.1) {
    if (!audioCtx) return;
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
}

function updateTheme() {
    const theme = levelThemes[Math.min(level - 1, levelThemes.length - 1)];
    document.body.style.backgroundColor = theme.bodyBg;
    containerEl.style.borderColor = theme.borderColor;
    hudEl.style.color = theme.hudColor;
    
    // v13: 지옥 HUD 클래스 토글
    if (level >= 4) {
        hudEl.classList.add('hell-hud');
    } else {
        hudEl.classList.remove('hell-hud');
    }

    document.getElementById('level-display').innerHTML = `레벨: <span id="level-val">${level}</span> (${theme.name})`;
    if (gameActive) {
        playBGM();
    }
}

function spawnBlock() {
    if (!gameActive) return;
    const theme = levelThemes[Math.min(level - 1, levelThemes.length - 1)];
    blocks.push(new Block(theme.speed, theme.blockBaseColor));
}

function playBGM() {
    if (bgmInterval) clearInterval(bgmInterval);
    const theme = levelThemes[Math.min(level - 1, levelThemes.length - 1)];
    bgmInterval = setInterval(() => {
        if (!gameActive) return;
        const freq = theme.melody[melodyStep % theme.melody.length];
        const toneType = level >= 4 ? 'sawtooth' : (level >= 3 ? 'square' : 'sine');
        playTone(freq, toneType, 0.25, 0.05);
        spawnBlock();
        melodyStep++;
    }, theme.bpm);
}

function initEffects() {
    particles = [];
    clouds = [];
    for(let i=0; i<6; i++) {
        clouds.push({
            x: Math.random() * canvas.width,
            y: Math.random() * 400,
            size: 40 + Math.random() * 60,
            speed: 0.1 + Math.random() * 0.3
        });
    }
}

function drawBackground() {
    const theme = levelThemes[Math.min(level - 1, levelThemes.length - 1)];
    ctx.fillStyle = theme.canvasBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 천국 배경: 구름, 계단, 빛
    if (level <= 3) {
        const intensity = 1 - (level - 1) * 0.3;
        
        // 하늘 그라데이션
        const skyGrd = ctx.createLinearGradient(0, 0, 0, canvas.height);
        skyGrd.addColorStop(0, `rgba(255, 255, 255, ${0.5 * intensity})`);
        skyGrd.addColorStop(1, `rgba(135, 206, 250, 0)`);
        ctx.fillStyle = skyGrd;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 구름 그리기 (몽글몽글한 고퀄리티 구름)
        ctx.fillStyle = `rgba(255, 255, 255, ${0.7 * intensity})`;
        clouds.forEach(c => {
            ctx.beginPath();
            // 여러 원을 겹쳐서 구름 모양 만들기
            ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
            ctx.arc(c.x + c.size * 0.6, c.y - c.size * 0.3, c.size * 0.7, 0, Math.PI * 2);
            ctx.arc(c.x + c.size * 1.2, c.y, c.size * 0.8, 0, Math.PI * 2);
            ctx.arc(c.x + c.size * 0.6, c.y + c.size * 0.3, c.size * 0.6, 0, Math.PI * 2);
            ctx.fill();
            
            c.x += c.speed;
            if (c.x - c.size * 2 > canvas.width) {
                c.x = -c.size * 2;
                c.y = Math.random() * 400;
            }
        });

        // 계단 그리기
        for(let i=0; i<12; i++) {
            const y = 550 - i * 35;
            const width = 450 - i * 30;
            const height = 25;
            const x = canvas.width/2 - width/2;
            ctx.fillStyle = `rgba(0, 0, 0, ${0.1 * intensity})`;
            ctx.fillRect(x + 5, y + 5, width, height);
            const stairGrd = ctx.createLinearGradient(x, y, x, y + height);
            stairGrd.addColorStop(0, `rgba(255, 255, 255, ${0.9 * intensity})`);
            stairGrd.addColorStop(1, `rgba(200, 220, 255, ${0.8 * intensity})`);
            ctx.fillStyle = stairGrd;
            ctx.fillRect(x, y, width, height);
            ctx.strokeStyle = `rgba(255, 215, 0, ${0.4 * intensity})`;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, width, height);
        }

        // --- 천국의 문 (v8 추가) ---
        const gateX = canvas.width / 2;
        const gateY = 165; // 마지막 계단 높이
        const gateWidth = 120;
        const gateHeight = 150;

        // 1. 문 뒤쪽의 신비로운 빛 (맥동하는 효과)
        const glowSize = 150 + Math.sin(frameCount * 0.05) * 20;
        const gateGlow = ctx.createRadialGradient(gateX, gateY - gateHeight/2, 0, gateX, gateY - gateHeight/2, glowSize);
        gateGlow.addColorStop(0, `rgba(255, 255, 200, ${0.6 * intensity})`);
        gateGlow.addColorStop(0.5, `rgba(255, 255, 255, ${0.3 * intensity})`);
        gateGlow.addColorStop(1, `rgba(255, 255, 255, 0)`);
        ctx.fillStyle = gateGlow;
        ctx.beginPath();
        ctx.arc(gateX, gateY - gateHeight/2, glowSize, 0, Math.PI * 2);
        ctx.fill();

        // 2. 황금 기둥
        const pillarWidth = 20;
        const pillarGrd = ctx.createLinearGradient(gateX - gateWidth/2 - pillarWidth, 0, gateX - gateWidth/2, 0);
        pillarGrd.addColorStop(0, "#ffd700");
        pillarGrd.addColorStop(0.5, "#ffffff");
        pillarGrd.addColorStop(1, "#b8860b");

        // 왼쪽 기둥
        ctx.fillStyle = pillarGrd;
        ctx.fillRect(gateX - gateWidth/2 - pillarWidth, gateY - gateHeight, pillarWidth, gateHeight);
        ctx.strokeStyle = "rgba(0,0,0,0.1)";
        ctx.strokeRect(gateX - gateWidth/2 - pillarWidth, gateY - gateHeight, pillarWidth, gateHeight);
        
        // 오른쪽 기둥
        ctx.save();
        ctx.translate(gateX + gateWidth/2 + pillarWidth, 0);
        ctx.scale(-1, 1);
        ctx.fillStyle = pillarGrd;
        ctx.fillRect(0, gateY - gateHeight, pillarWidth, gateHeight);
        ctx.restore();

        // 3. 황금 아치
        ctx.beginPath();
        ctx.lineWidth = 15;
        const archGrd = ctx.createLinearGradient(gateX - gateWidth/2, gateY - gateHeight, gateX + gateWidth/2, gateY - gateHeight);
        archGrd.addColorStop(0, "#ffd700");
        archGrd.addColorStop(0.5, "#ffffff");
        archGrd.addColorStop(1, "#ffd700");
        ctx.strokeStyle = archGrd;
        ctx.arc(gateX, gateY - gateHeight, gateWidth/2 + pillarWidth/2, Math.PI, 0);
        ctx.stroke();

        // --- 천국의 문 내부 (v8 집중 업데이트: 울트라 고퀄리티) ---
        ctx.save();
        ctx.beginPath();
        ctx.rect(gateX - gateWidth/2, gateY - gateHeight, gateWidth, gateHeight);
        ctx.arc(gateX, gateY - gateHeight, gateWidth/2, Math.PI, 0);
        ctx.clip();

        // 1. 내부 무지개빛 은하수 (동적 별 효과 추가)
        const innerGrd = ctx.createRadialGradient(gateX, gateY - gateHeight, 0, gateX, gateY - gateHeight, gateWidth);
        innerGrd.addColorStop(0, "#ffffff");
        innerGrd.addColorStop(0.2, "#fff9c4");
        innerGrd.addColorStop(0.5, "#b3e5fc");
        innerGrd.addColorStop(0.8, "#f8bbd0");
        innerGrd.addColorStop(1, "#e1bee7");
        ctx.fillStyle = innerGrd;
        ctx.fillRect(gateX - gateWidth/2, gateY - gateHeight*1.5, gateWidth, gateHeight*2);

        // 움직이는 작은 별들
        ctx.fillStyle = "white";
        for(let i=0; i<15; i++) {
            const starX = gateX + Math.cos(frameCount * 0.01 + i) * (gateWidth/2 * (i/15));
            const starY = (gateY - gateHeight/2) + Math.sin(frameCount * 0.01 + i) * (gateHeight/2 * (i/15));
            const size = Math.random() * 2;
            ctx.beginPath();
            ctx.arc(starX, starY, size, 0, Math.PI * 2);
            ctx.fill();
        }

        // 2. 정교한 천국의 성 (창문과 지붕 묘사)
        const castleX = gateX;
        const castleY = gateY - 45;
        ctx.fillStyle = "white";
        ctx.shadowBlur = 10;
        ctx.shadowColor = "white";
        
        // 중앙 대탑
        ctx.fillRect(castleX - 12, castleY - 50, 24, 50);
        ctx.beginPath();
        ctx.moveTo(castleX - 18, castleY - 50);
        ctx.lineTo(castleX + 18, castleY - 50);
        ctx.lineTo(castleX, castleY - 80);
        ctx.fill();
        // 창문 불빛
        ctx.fillStyle = "#fff9c4";
        ctx.fillRect(castleX - 4, castleY - 40, 8, 10);
        
        // 왼쪽/오른쪽 부탑
        ctx.fillStyle = "white";
        [ -30, 18 ].forEach(offsetX => {
            ctx.fillRect(castleX + offsetX, castleY - 35, 12, 35);
            ctx.beginPath();
            ctx.moveTo(castleX + offsetX - 4, castleY - 35);
            ctx.lineTo(castleX + offsetX + 16, castleY - 35);
            ctx.lineTo(castleX + offsetX + 6, castleY - 55);
            ctx.fill();
            // 작은 창문
            ctx.fillStyle = "#fff9c4";
            ctx.fillRect(castleX + offsetX + 3, castleY - 25, 6, 8);
            ctx.fillStyle = "white";
        });
        ctx.shadowBlur = 0;

        // 3. 몽환적인 겹층 안개 (부드러운 효과)
        for(let i=0; i<5; i++) {
            const shift = Math.sin(frameCount * 0.015 + i) * 15;
            const fogGrd = ctx.createRadialGradient(gateX + shift, gateY - 10, 0, gateX + shift, gateY - 10, 40 + i*10);
            fogGrd.addColorStop(0, `rgba(255, 255, 255, ${0.4 - i*0.05})`);
            fogGrd.addColorStop(1, "rgba(255, 255, 255, 0)");
            ctx.fillStyle = fogGrd;
            ctx.beginPath();
            ctx.arc(gateX + shift, gateY - 10, 60 + i*10, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
        // -----------------------------------------------------------

        // 4. 문 주변 반짝이는 효과 (파티클 생성)
        if (frameCount % 10 === 0) {
            for(let i=0; i<2; i++) {
                particles.push({
                    x: gateX + (Math.random() - 0.5) * (gateWidth + 40),
                    y: gateY - Math.random() * gateHeight,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: (Math.random() - 0.5) * 0.5,
                    size: Math.random() * 3 + 1,
                    life: 1,
                    color: "255, 255, 200",
                    isSparkle: true
                });
            }
        }
        // --------------------------

        // 빛줄기
        heavenLightAngle += 0.005;
        ctx.save();
        ctx.translate(canvas.width/2, 120);
        for(let i=0; i<12; i++) {
            ctx.rotate(Math.PI/6);
            const lightGrd = ctx.createRadialGradient(0, 0, 0, 0, 0, 800);
            lightGrd.addColorStop(0, `rgba(255, 255, 255, ${0.2 * intensity})`);
            lightGrd.addColorStop(0.5, `rgba(255, 250, 200, ${0.05 * intensity})`);
            lightGrd.addColorStop(1, `rgba(255, 255, 255, 0)`);
            ctx.fillStyle = lightGrd;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            const angleWidth = 0.2 + Math.sin(heavenLightAngle + i) * 0.1;
            ctx.arc(0, 0, 800, -angleWidth, angleWidth);
            ctx.fill();
        }
        ctx.restore();

        if (frameCount % 5 === 0) {
            particles.push({
                x: Math.random() * canvas.width,
                y: canvas.height,
                vx: (Math.random() - 0.5) * 1,
                vy: -Math.random() * 2 - 1,
                size: Math.random() * 4 + 2,
                life: 1,
                color: "255, 255, 255"
            });
        }
    }
    
    // 지옥 배경
    if (level >= 4) {
        const intensity = (level - 3) / 3;
        lavaOffset += 0.08;
        
        // 1. 지옥의 하늘 (더 어둡고 기괴한 색감)
        const hellSky = ctx.createLinearGradient(0, 0, 0, canvas.height);
        hellSky.addColorStop(0, `rgba(5, 0, 0, ${intensity})`);
        hellSky.addColorStop(1, `rgba(30, 0, 0, ${intensity})`);
        ctx.fillStyle = hellSky;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 2. 핏빛 번개 연출 (무작위로 화면 번쩍임)
        if (Math.random() > 0.985) {
            ctx.fillStyle = `rgba(200, 0, 0, ${0.4 * intensity})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            if (audioCtx) playTone(80 + Math.random() * 40, 'sawtooth', 0.15, 0.03);
        }

        // 3. 열기 왜곡 연출
        const heatShake = Math.sin(frameCount * 0.12) * 3 * intensity;
        ctx.save();
        ctx.translate(heatShake, 0);

        // 4. 가시 성과 심연의 풍경
        ctx.save();
        ctx.globalAlpha = 0.7 * intensity;
        ctx.fillStyle = "#000";
        const castleX = canvas.width / 2;
        const castleY = 300;
        for(let i=-4; i<=4; i++) {
            const h = 120 + Math.abs(i) * 35;
            ctx.beginPath();
            ctx.moveTo(castleX + i*45 - 25, castleY);
            ctx.lineTo(castleX + i*45 + 25, castleY);
            ctx.lineTo(castleX + i*45, castleY - h);
            ctx.fill();
            // 눈동자처럼 번뜩이는 창문들
            ctx.fillStyle = frameCount % 20 < 10 ? "#ff0000" : "#220000";
            ctx.beginPath();
            ctx.arc(castleX + i*45, castleY - h/2, 4, 0, Math.PI*2);
            ctx.fill();
        }
        ctx.restore();

        // 5. 원혼의 손 (화면 아래에서 솟아오름) - v10 추가
        ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        for(let i=0; i<8; i++) {
            const handX = (canvas.width / 8) * i + Math.sin(frameCount * 0.05 + i) * 10;
            const handY = canvas.height - 20 - Math.sin(frameCount * 0.03 + i) * 40 * intensity;
            ctx.beginPath();
            ctx.moveTo(handX, canvas.height);
            ctx.lineTo(handX - 10, handY);
            ctx.lineTo(handX, handY - 30); // 손가락 느낌
            ctx.lineTo(handX + 10, handY);
            ctx.fill();
        }

        // 6. 갑자기 나타나는 귀신 얼굴 - v10 추가
        if (frameCount % 200 > 180 && Math.random() > 0.5) {
            ctx.save();
            ctx.globalAlpha = 0.2 * intensity;
            const ghostX = Math.random() * canvas.width;
            const ghostY = Math.random() * canvas.height;
            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.ellipse(ghostX, ghostY, 40, 60, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "black";
            ctx.beginPath(); // 기괴한 눈과 입
            ctx.arc(ghostX - 15, ghostY - 10, 8, 0, Math.PI * 2);
            ctx.arc(ghostX + 15, ghostY - 10, 8, 0, Math.PI * 2);
            ctx.ellipse(ghostX, ghostY + 20, 10, 20, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // 7. 용암 바다
        for(let layer=0; layer<3; layer++) {
            ctx.fillStyle = layer === 0 ? "#110000" : (layer === 1 ? "#440000" : "#cc0000");
            ctx.beginPath();
            ctx.moveTo(0, canvas.height);
            const lOffset = lavaOffset * (layer + 1);
            for(let x=-50; x<=canvas.width+50; x+=25) {
                const y = canvas.height - 60 - layer*20 - Math.sin(x*0.02 + lOffset) * 30;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(canvas.width, canvas.height);
            ctx.fill();
        }

        // 8. 피의 비
        if (frameCount % 1 === 0) {
            particles.push({
                x: Math.random() * canvas.width,
                y: -20,
                vx: (Math.random() - 0.5) * 1,
                vy: Math.random() * 12 + 8,
                size: Math.random() * 3 + 1,
                life: 1,
                color: "180, 0, 0",
                isBlood: true
            });
        }
        ctx.restore();

        // 9. 핏빛 비네팅과 심장 고동
        const heartBeat = Math.sin(frameCount * 0.08) * 0.3 + 0.4;
        const vGrd = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 150, canvas.width/2, canvas.height/2, 550);
        vGrd.addColorStop(0, "rgba(0,0,0,0)");
        vGrd.addColorStop(1, `rgba(180, 0, 0, ${heartBeat * intensity})`);
        ctx.fillStyle = vGrd;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (frameCount % 45 === 0 || frameCount % 45 === 12) {
            if (audioCtx) playTone(50, 'sine', 0.25, 0.04 * intensity);
        }

        // 10. 화면 글리치 효과 (v11 추가)
        if (Math.random() > 0.95) {
            for(let i=0; i<5; i++) {
                const gy = Math.random() * canvas.height;
                const gh = 2 + Math.random() * 10;
                const goff = (Math.random() - 0.5) * 40;
                ctx.drawImage(canvas, 0, gy, canvas.width, gh, goff, gy, canvas.width, gh);
            }
        }

        // 11. 점프스케어 귀신 (v11 추가 - 아주 짧게 전체 화면)
        if (Math.random() > 0.998 && jumpScareTimer === 0) {
            jumpScareTimer = 8; 
        }

        if (jumpScareTimer > 0) {
            ctx.save();
            ctx.globalAlpha = 0.9;
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            const cx = canvas.width/2;
            const cy = canvas.height/2;
            ctx.fillStyle = "black";
            ctx.beginPath();
            ctx.arc(cx - 80, cy - 50, 60, 0, Math.PI*2);
            ctx.arc(cx + 80, cy - 50, 60, 0, Math.PI*2);
            ctx.ellipse(cx, cy + 100, 70, 120, 0, 0, Math.PI*2);
            ctx.fill();
            ctx.restore();
            jumpScareTimer--;
            if (audioCtx && jumpScareTimer === 7) playTone(120, 'sawtooth', 0.4, 0.1);
        }
    }

    for(let i=particles.length-1; i>=0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.01;
        if(p.life <= 0) {
            particles.splice(i, 1);
            continue;
        }
        if (p.isSparkle) {
            ctx.save();
            ctx.shadowBlur = 10;
            ctx.shadowColor = `rgba(${p.color}, ${p.life})`;
            ctx.strokeStyle = `rgba(${p.color}, ${p.life})`;
            ctx.lineWidth = 2;
            const s = p.size * p.life * 2;
            ctx.beginPath();
            ctx.moveTo(p.x - s, p.y);
            ctx.lineTo(p.x + s, p.y);
            ctx.moveTo(p.x, p.y - s);
            ctx.lineTo(p.x, p.y + s);
            ctx.stroke();
            ctx.restore();
        } else {
            ctx.fillStyle = `rgba(${p.color}, ${p.life})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI*2);
            ctx.fill();
        }
        if (level >= 4 && !p.isSparkle) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = `rgb(${p.color})`;
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }
}

class Block {
    constructor(speed, baseHue) {
        this.size = 85;
        this.x = Math.random() * (canvas.width - this.size);
        this.y = -this.size;
        this.speed = speed;
        this.wobble = level >= 5 ? Math.random() * 4 - 2 : 0;
        const hue = baseHue + (Math.random() * 40 - 20);
        this.color = `hsl(${hue}, 80%, 50%)`;
        this.type = level <= 3 ? "angel" : "devil";
    }
    update() { 
        this.y += this.speed; 
        this.x += this.wobble;
        if(this.x < 0) this.x = 0;
        if(this.x > canvas.width - this.size) this.x = canvas.width - this.size;
    }
    draw() {
        ctx.save();
        if (this.type === "angel") {
            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.ellipse(this.x - 10, this.y + this.size/2, 20, 40, Math.PI/4, 0, Math.PI*2);
            ctx.ellipse(this.x + this.size + 10, this.y + this.size/2, 20, 40, -Math.PI/4, 0, Math.PI*2);
            ctx.fill();
            ctx.strokeStyle = "gold";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.ellipse(this.x + this.size/2, this.y - 15, 30, 10, 0, 0, Math.PI*2);
            ctx.stroke();
        } else {
            // 살아있는 원혼의 블록 (v12 집중 업그레이드)
            ctx.save();
            
            // 1. 검은 아우라 (그림자 효과)
            ctx.shadowBlur = 15;
            ctx.shadowColor = "black";
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.roundRect(this.x, this.y, this.size, this.size, 5);
            ctx.fill();
            ctx.shadowBlur = 0;

            // 2. 피눈물 흐르는 애니메이션
            ctx.fillStyle = "rgba(150, 0, 0, 0.8)";
            const tearOffset = (frameCount * 0.5 + this.y) % 20;
            ctx.fillRect(this.x + this.size * 0.25, this.y + this.size * 0.4, 4, 10 + tearOffset);
            ctx.fillRect(this.x + this.size * 0.65, this.y + this.size * 0.4, 4, 10 + tearOffset);

            // 3. 번뜩이는 안광 (발광 효과)
            const eyeY = this.y + this.size * 0.35;
            const glow = Math.sin(frameCount * 0.1) * 5 + 10;
            ctx.shadowBlur = glow;
            ctx.shadowColor = "red";
            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.arc(this.x + this.size * 0.3, eyeY, 8, 0, Math.PI * 2);
            ctx.arc(this.x + this.size * 0.7, eyeY, 8, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = "red";
            ctx.beginPath();
            ctx.arc(this.x + this.size * 0.3, eyeY, 3, 0, Math.PI * 2);
            ctx.arc(this.x + this.size * 0.7, eyeY, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // 4. 꿈틀대는 찢어진 입 (애니메이션)
            ctx.strokeStyle = "black";
            ctx.lineWidth = 3;
            ctx.beginPath();
            const mouthY = this.y + this.size * 0.75;
            const mouthOpen = Math.sin(frameCount * 0.15) * 5;
            ctx.moveTo(this.x + this.size * 0.15, mouthY);
            ctx.quadraticCurveTo(this.x + this.size * 0.5, mouthY + 10 + mouthOpen, this.x + this.size * 0.85, mouthY);
            ctx.stroke();
            
            // 입 안쪽 어두운 공간
            ctx.fillStyle = "#220000";
            ctx.fill();

            // 5. 날카로운 뿔
            ctx.fillStyle = "#1a0000";
            ctx.beginPath();
            ctx.moveTo(this.x + 10, this.y);
            ctx.lineTo(this.x - 10, this.y - 25);
            ctx.lineTo(this.x + 35, this.y);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(this.x + this.size - 10, this.y);
            ctx.lineTo(this.x + this.size + 10, this.y - 25);
            ctx.lineTo(this.x + this.size - 35, this.y);
            ctx.fill();
            
            ctx.restore();
        }
        ctx.restore();
    }
}

function showFeedback(text, isGood) {
    feedbackEl.innerText = text;
    feedbackEl.className = isGood ? 'feedback-good' : 'feedback-bad';
    feedbackEl.style.opacity = '1';
    setTimeout(() => feedbackEl.style.opacity = '0', 300);
}

function startGame() {
    initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    score = 0;
    level = 1;
    blocks = [];
    particles = [];
    initEffects();
    melodyStep = 0;
    gameActive = true;
    document.getElementById('score-val').innerText = score;
    updateTheme();
    switchScreen('game-screen');
    playBGM();
    gameLoop();
}

function switchScreen(screenId) {
    const screens = document.querySelectorAll('.inner-screen');
    screens.forEach(s => s.classList.remove('active'));
    if (screenId && document.getElementById(screenId)) {
        document.getElementById(screenId).classList.add('active');
    }
}

function gameLoop() {
    if (!gameActive) return;
    frameCount++;
    drawBackground();
    for (let i = blocks.length - 1; i >= 0; i--) {
        const b = blocks[i];
        b.update();
        b.draw();
        if (b.y > canvas.height) {
            endGame();
            return;
        }
    }
    animationId = requestAnimationFrame(gameLoop);
}

canvas.addEventListener('mousedown', (e) => {
    if (!gameActive) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    for (let i = blocks.length - 1; i >= 0; i--) {
        const b = blocks[i];
        if (mouseX >= b.x && mouseX <= b.x + b.size &&
            mouseY >= b.y && mouseY <= b.y + b.size) {
            blocks.splice(i, 1);
            score += 10;
            document.getElementById('score-val').innerText = score;
            if (score > 0 && score % 100 === 0) {
                level++;
                updateTheme(); 
                showFeedback(`레벨 ${level}!`, true);
                playTone(880, 'sine', 0.3, 0.1);
            } else {
                playTone(523.25, level >= 4 ? 'square' : 'sine', 0.15, 0.05);
                showFeedback("좋아요!", true);
            }
            return;
        }
    }
});

function endGame() {
    if (!gameActive) return;
    gameActive = false;
    cancelAnimationFrame(animationId);
    if (bgmInterval) clearInterval(bgmInterval);
    playTone(392, 'sawtooth', 0.4, 0.05);
    setTimeout(() => playTone(261, 'sawtooth', 0.4, 0.05), 150);
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('rhythmHighScore', highScore);
    }
    document.body.style.backgroundColor = "#fff";
    document.getElementById('final-score').innerText = score;
    document.getElementById('best-score').innerText = highScore;
    document.getElementById('result-message').innerText = level >= 4 ? "불타는 지옥을 무사히 빠져나왔네요!" : "구름 위 천국은 정말 아름다웠어요!";
    showFeedback("앗!", false);
    setTimeout(() => switchScreen('result-screen'), 1000);
}

function goHome() {
    switchScreen('start-screen');
    level = 1;
    updateTheme();
}

updateTheme();
