/**
 * RPG 게임 - script.js
 * 종족 고유 스킬 시스템 및 레벨업 포인트 상향 적용 버전
 */

document.addEventListener('DOMContentLoaded', () => {
    // [화면 요소]
    const mainScreen = document.getElementById('main-screen');
    const creationScreen = document.getElementById('creation-screen');
    const gameScreen = document.getElementById('game-screen');
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');

    // [게임 데이터]
    let player = {
        race: '',
        raceData: null, // 종족 데이터 저장
        level: 1,
        exp: 0,
        maxExp: 100,
        stats: { str: 0, int: 0, agi: 0, con: 0, mag: 0 },
        points: 10,
        hp: 100, maxHp: 100,
        mp: 50, maxMp: 50,
        speed: 3,
        learnedSkills: [],
        selectedSkillIndex: 0,
        totalKills: 0,
        lastRaceSkillTime: 0 // 종족 스킬 쿨타임 관리
    };

    // 종족 다양화 및 고유 스킬 정의
    const races = [
        { 
            name: '평범한 인간', grade: '일반', chance: 15, bonus: { str: 1, con: 1 },
            uniqueSkill: { name: "노력의 결실", desc: "공격 시 20% 확률로 마나 5 회복", type: "passive_proc" }
        },
        { 
            name: '숲의 엘프', grade: '희귀', chance: 25, bonus: { int: 2, agi: 2 },
            uniqueSkill: { name: "바람의 화살", desc: "W 공격 시 추가 유도 탄환 발사", type: "attack_proc" }
        },
        { 
            name: '바위 수인', grade: '희귀', chance: 20, bonus: { str: 3, con: 2 },
            uniqueSkill: { name: "단단한 피부", desc: "피격 시 데미지 30% 감소", type: "defense_passive" }
        },
        { 
            name: '그림자 언데드', grade: '레어', chance: 18, bonus: { str: 4, agi: 3, mag: 2 },
            uniqueSkill: { name: "영혼 흡수", desc: "몬스터 처치 시 체력 5 회복", type: "kill_proc" }
        },
        { 
            name: '바람의 정령', grade: '영웅', chance: 15, bonus: { int: 6, agi: 8, mag: 10 },
            uniqueSkill: { name: "폭풍 가속", desc: "대쉬 시 마나 소모 없음", type: "dash_passive" }
        },
        { 
            name: '고대 천룡인', grade: '전설', chance: 7, bonus: { str: 15, int: 15, agi: 15, con: 15, mag: 15 },
            uniqueSkill: { name: "신의 권능", desc: "S 스킬 사용 시 화면 전체 데미지", type: "skill_aoe" }
        }
    ];

    const allSkills = [
        { id: 0, name: '파이어볼', grade: '일반', damage: 40, mana: 15, color: '#ff4400', reqLv: 1, range: 150 },
        { id: 1, name: '아이스 스피어', grade: '희귀', damage: 80, mana: 25, color: '#00ccff', reqLv: 3, range: 180 },
        { id: 2, name: '썬더볼트', grade: '레어', damage: 150, mana: 50, color: '#ffff00', reqLv: 6, range: 220 },
        { id: 3, name: '포이즌 가스', grade: '레어', damage: 20, mana: 40, color: '#4caf50', reqLv: 8, range: 200 },
        { id: 4, name: '다크 익스플로전', grade: '영웅', damage: 350, mana: 100, color: '#9900ff', reqLv: 12, range: 280 },
        { id: 5, name: '드래곤 브레스', grade: '전설', damage: 800, mana: 250, color: '#ff1744', reqLv: 18, range: 400 }
    ];

    const passiveData = {
        str: { name: "거인의 힘", desc: "공격 범위 증가", level: 0 },
        int: { name: "현자의 지혜", desc: "마나 회복 증가", level: 0 },
        agi: { name: "바람의 발걸음", desc: "대쉬 쿨타임 감소", level: 0 },
        con: { name: "강철의 신체", desc: "초당 체력 회복", level: 0 },
        mag: { name: "마력 폭주", desc: "스킬 데미지 증가", level: 0 }
    };

    // [시스템 변수]
    let keys = {};
    let playerPos = { x: 300, y: 300, width: 32, height: 32 };
    let worldSize = { width: 3000, height: 2000 };
    let monsters = [];
    let npcs = [
        { x: 500, y: 400, type: 'village_head', name: "촌장", color: "#ffff00", message: "안녕하신가!" },
        { x: 700, y: 300, type: 'skill_master', name: "마법 스승", color: "#00ccff", message: "기술을 배우러 왔나?" }
    ];
    let currentQuest = null;
    let effects = [];
    let isDashing = false;
    let dashCooldown = 0;
    let lastAttackTime = 0;
    let mpRegenTimer = 0;
    let decorations = [];

    // --- 초기화 및 UI ---
    function showScreen(s) {
        [document.getElementById('main-screen'), document.getElementById('creation-screen'), document.getElementById('game-screen')].forEach(el => el.classList.add('hidden'));
        s.classList.remove('hidden');
    }

    document.getElementById('start-btn').addEventListener('click', () => showScreen(document.getElementById('creation-screen')));

    const rollRaceBtn = document.getElementById('roll-race-btn');
    const raceResult = document.getElementById('race-result');
    const statAllocation = document.getElementById('stat-allocation');
    const completeCreationBtn = document.getElementById('complete-creation-btn');

    rollRaceBtn.addEventListener('click', () => {
        const rand = Math.random() * 100;
        let cumulative = 0;
        let selectedRace = races[0];
        for (const r of races) { cumulative += r.chance; if (rand <= cumulative) { selectedRace = r; break; } }
        
        player.race = selectedRace.name;
        player.raceData = selectedRace; // 종족 데이터 저장
        
        for (const s in selectedRace.bonus) player.stats[s] += selectedRace.bonus[s];
        
        raceResult.innerHTML = `
            <span style="color:${getGradeColor(selectedRace.grade)}">[${selectedRace.grade}] ${selectedRace.name}</span> 탄생!<br>
            <small style="color:#00e676">고유 스킬: ${selectedRace.uniqueSkill.name}</small>
        `;
        rollRaceBtn.disabled = true;
        statAllocation.classList.remove('hidden');
        updateInitStatDisplay();
    });

    function getGradeColor(g) { return { '희귀': '#4caf50', '레어': '#2196f3', '영웅': '#9c27b0', '전설': '#ff9800' }[g] || 'white'; }

    function updateInitStatDisplay() {
        document.getElementById('stat-points-init').textContent = player.points;
        for (const s in player.stats) document.getElementById(`stat-${s}-init`).textContent = player.stats[s];
        completeCreationBtn.disabled = !(player.points === 0 && player.race !== '');
    }

    document.querySelectorAll('.stat-plus-init').forEach(b => b.addEventListener('click', () => {
        if (player.points > 0) { player.stats[b.dataset.stat]++; player.points--; updateInitStatDisplay(); }
    }));
    document.querySelectorAll('.stat-minus-init').forEach(b => b.addEventListener('click', () => {
        if (player.stats[b.dataset.stat] > 0) { player.stats[b.dataset.stat]--; player.points++; updateInitStatDisplay(); }
    }));

    completeCreationBtn.addEventListener('click', () => {
        applyStats();
        initDecorations();
        showScreen(document.getElementById('game-screen'));
        setTimeout(initGame, 100);
    });

    function applyStats() {
        player.maxHp = 100 + (player.stats.con * 30);
        player.maxMp = 50 + (player.stats.mag * 25);
        player.speed = 3 + (player.stats.agi * 0.5);
        updateUI();
    }

    function initGame() {
        resizeCanvas();
        window.addEventListener('keydown', e => { 
            keys[e.code] = true; 
            
            // 비밀 치트 기능 (Ctrl + 1)
            if (e.ctrlKey && e.code === 'Digit1') {
                cheatLevelUp();
            }

            // 비밀 히든 스킬 습득 (Ctrl + 2)
            if (e.ctrlKey && e.code === 'Digit2') {
                getHiddenSkill();
            }

            if (e.code === 'KeyP') document.getElementById('stat-window').classList.toggle('hidden');
            handleAction(e.code); 
        });
        window.addEventListener('keyup', e => keys[e.code] = false);
        window.addEventListener('resize', resizeCanvas);
        gameLoop();
    }

    function cheatLevelUp() {
        player.level++;
        player.points += 3;
        player.hp = player.maxHp;
        player.mp = player.maxMp;
        player.exp = 0; // 경험치 초기화 (선택 사항)
        player.maxExp = Math.floor(player.maxExp * 1.7);
        createBurstEffect(playerPos.x+16, playerPos.y+16, '#ffff00', 50);
        updateUI();
        console.log("치트 사용: 레벨업!");
    }

    function getHiddenSkill() {
        const hiddenSkill = {
            id: 999,
            name: '운영자의 심판',
            grade: '신화',
            damage: 9999,
            mana: 0,
            color: '#ffffff',
            reqLv: 1,
            range: 1000
        };
        
        if (!player.learnedSkills.some(s => s.id === 999)) {
            player.learnedSkills.push(hiddenSkill);
            alert("!!! 운영자의 심판을 습득했습니다 !!!");
            updateUI();
        }
    }

    function resizeCanvas() { canvas.width = document.getElementById('game-screen').clientWidth; canvas.height = document.getElementById('game-screen').clientHeight; }

    function spawnMonsters(count, isBoss = false) {
        for (let i = 0; i < count; i++) {
            if (isBoss) {
                monsters.push({
                    x: 2000, y: worldSize.height / 2, width: 120, height: 120, 
                    hp: 5000 + player.level * 1000, maxHp: 5000 + player.level * 1000, 
                    speed: 1.2, exp: 2000, isBoss: true, name: "대마왕의 분신"
                });
                alert("!!! 강력한 보스 몬스터가 출현했습니다 !!!");
            } else {
                monsters.push({
                    x: 1200 + Math.random() * (worldSize.width - 1300), y: Math.random() * worldSize.height,
                    width: 40, height: 40, hp: 150 + player.level * 50, maxHp: 150 + player.level * 50, 
                    speed: 1.5 + Math.random(), exp: 50, isBoss: false
                });
            }
        }
    }

    function handleAction(code) {
        const now = Date.now();
        if (code === 'KeyW' && now - lastAttackTime > 250) { attack(); lastAttackTime = now; }
        if (code === 'KeyA' && dashCooldown <= 0) {
            // 바람의 정령 패시브: 대쉬 시 마나 소모 없음
            if (player.raceData.uniqueSkill.type === 'dash_passive' || player.mp >= 20) {
                dash();
            }
        }
        if (code === 'KeyS') useSkill();
        if (code === 'Space') interact();
    }

    function attack() {
        let range = 85 * (1 + passiveData.str.level * 0.3);
        let hit = false;
        monsters.forEach(m => {
            const d = Math.sqrt((m.x - playerPos.x)**2 + (m.y - playerPos.y)**2);
            if (d < range) {
                let dmg = (25 + player.stats.str * 10);
                m.hp -= dmg;
                hit = true;
                
                // 인간 고유 스킬: 노력의 결실 (20% 확률 마나 회복)
                if (player.raceData.uniqueSkill.type === 'passive_proc' && Math.random() < 0.2) {
                    player.mp = Math.min(player.maxMp, player.mp + 5);
                }

                if (m.hp <= 0) onMonsterKill(m);
            }
        });

        // 엘프 고유 스킬: 바람의 화살 (추가 탄환 효과)
        if (player.raceData.uniqueSkill.type === 'attack_proc') {
            addEffect(playerPos.x + 16, playerPos.y + 16, range * 1.5, '#00e676', 'wave');
            monsters.forEach(m => {
                const d = Math.sqrt((m.x - playerPos.x)**2 + (m.y - playerPos.y)**2);
                if (d < range * 1.5) m.hp -= 15; // 추가 미세 데미지
            });
        }

        if (hit) createBurstEffect(playerPos.x + 16, playerPos.y + 16, '#ffffff', 5);
    }

    function dash() {
        isDashing = true; 
        if (player.raceData.uniqueSkill.type !== 'dash_passive') player.mp -= 20;
        
        dashCooldown = 60 * Math.pow(0.8, passiveData.agi.level);
        const dist = 160 + player.stats.agi * 18;
        if (keys['ArrowUp']) playerPos.y -= dist;
        if (keys['ArrowDown']) playerPos.y += dist;
        if (keys['ArrowLeft']) playerPos.x -= dist;
        if (keys['ArrowRight']) playerPos.x += dist;
        updateUI();
        setTimeout(() => isDashing = false, 120);
    }

    function useSkill() {
        if (player.learnedSkills.length === 0) return;
        const skill = player.learnedSkills[player.selectedSkillIndex];
        if (player.mp < skill.mana) return;
        player.mp -= skill.mana;
        
        let range = skill.range;
        let dmg = (skill.damage + player.stats.int * 20) * (1 + passiveData.mag.level * 0.4);
        
        // 고대 천룡인 고유 스킬: 신의 권능 (범위 대폭 증가)
        if (player.raceData.uniqueSkill.type === 'skill_aoe') {
            range *= 2;
            dmg *= 1.2;
        }

        monsters.forEach(m => {
            const d = Math.sqrt((m.x - playerPos.x)**2 + (m.y - playerPos.y)**2);
            if (d < range) {
                m.hp -= dmg;
                if (m.hp <= 0) onMonsterKill(m);
            }
        });
        createSkillEffect(playerPos.x + 16, playerPos.y + 16, { ...skill, range });
        updateUI();
    }

    function onMonsterKill(m) {
        player.exp += m.exp;
        player.totalKills++;
        if (currentQuest && currentQuest.type === 'hunt') currentQuest.current++;
        
        // 그림자 언데드 고유 스킬: 영혼 흡수 (체력 회복)
        if (player.raceData.uniqueSkill.type === 'kill_proc') {
            player.hp = Math.min(player.maxHp, player.hp + 5);
        }

        if (player.totalKills > 0 && player.totalKills % 100 === 0) spawnMonsters(1, true);
        
        monsters = monsters.filter(mon => mon !== m);
        checkLevelUp();
        updateUI();
    }

    function createSkillEffect(x, y, skill) {
        effects.push({ x, y, maxR: skill.range, currentR: 0, color: skill.color, life: 1.0, type: 'wave' });
        for(let i=0; i<30; i++) {
            effects.push({
                x, y, vx: (Math.random()-0.5)*18, vy: (Math.random()-0.5)*18,
                color: skill.color, life: 1.2, type: 'particle', size: Math.random()*10+2
            });
        }
    }

    function createBurstEffect(x, y, color, count) {
        for(let i=0; i<count; i++) {
            effects.push({
                x, y, vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10,
                color: color, life: 0.8, type: 'particle', size: Math.random()*5+1
            });
        }
    }

    function interact() {
        npcs.forEach(npc => {
            const d = Math.sqrt((npc.x - playerPos.x)**2 + (npc.y - playerPos.y)**2);
            if (d < 85) {
                if (npc.type === 'village_head') {
                    if (!currentQuest) {
                        const q = { type: 'hunt', name: "대청소", msg: "몬스터 10마리를 처치하게나.", target: 10, reward: 800 };
                        alert(`[촌장]: ${q.msg}`);
                        currentQuest = { ...q, current: 0 };
                    } else if (currentQuest.current >= currentQuest.target) {
                        alert(`[촌장]: 오! 정말 고맙네. 여기 보상일세.`);
                        player.exp += currentQuest.reward; currentQuest = null; checkLevelUp();
                    } else alert(`[촌장]: 아직 더 처치해야 한다네!`);
                } else if (npc.type === 'skill_master') {
                    const nextSkill = allSkills.find(s => !player.learnedSkills.some(ls => ls.id === s.id));
                    if (nextSkill) {
                        if (player.level >= nextSkill.reqLv) {
                            player.learnedSkills.push(nextSkill);
                            alert(`[마법 스승]: 새로운 비기 '${nextSkill.name}'을 전수했다!`);
                        } else alert(`[마법 스승]: 레벨 ${nextSkill.reqLv}이 되면 다시 오게.`);
                    } else alert(`[마법 스승]: 이미 모든 기술을 배웠군.`);
                }
                updateUI();
            }
        });
    }

    function checkLevelUp() {
        while (player.exp >= player.maxExp) {
            player.level++; player.exp -= player.maxExp; player.maxExp = Math.floor(player.maxExp * 1.7);
            player.points += 3; // 레벨업 포인트 3으로 상향!
            player.hp = player.maxHp; player.mp = player.maxMp;
            createBurstEffect(playerPos.x+16, playerPos.y+16, '#ffff00', 50);
            alert(`축하합니다! 레벨 업 (Lv.${player.level}). 포인트 3개를 획득했습니다!`);
        }
    }

    function updateUI() {
        document.getElementById('ui-level').textContent = player.level;
        document.getElementById('ui-hp').textContent = Math.ceil(player.hp);
        document.getElementById('ui-max-hp').textContent = player.maxHp;
        document.getElementById('ui-mp').textContent = Math.ceil(player.mp);
        document.getElementById('ui-max-mp').textContent = player.maxMp;
        document.getElementById('ui-quest').textContent = currentQuest ? `${currentQuest.name} (${currentQuest.current}/${currentQuest.target})` : `누적 처치: ${player.totalKills}`;
        document.getElementById('exp-bar').style.width = (player.exp / player.maxExp * 100) + '%';
        
        document.getElementById('ui-stat-points').textContent = player.points;
        for (const s in player.stats) {
            document.getElementById(`ui-stat-${s}`).textContent = player.stats[s];
            passiveData[s].level = Math.floor(player.stats[s] / 10);
        }

        const container = document.getElementById('passives-container');
        container.innerHTML = `
            <div class="passive-item" style="color:#ffeb3b"><strong>종족: ${player.raceData.uniqueSkill.name}</strong></div>
            ${Object.values(passiveData).filter(p => p.level > 0).map(p => `<div class="passive-item"><strong>${p.name} Lv.${p.level}</strong></div>`).join('')}
        `;

        const skillList = document.getElementById('skill-list');
        skillList.innerHTML = player.learnedSkills.map((s, idx) => `
            <div class="skill-item ${idx === player.selectedSkillIndex ? 'selected-skill' : ''}" data-idx="${idx}">
                <span>${s.name}</span><span style="color:${getGradeColor(s.grade)}">${s.grade}</span>
            </div>
        `).join('');

        document.querySelectorAll('.skill-item').forEach(item => {
            item.onclick = () => { player.selectedSkillIndex = parseInt(item.dataset.idx); updateUI(); };
        });
    }

    document.querySelectorAll('.ui-stat-plus').forEach(b => b.onclick = () => {
        if (player.points > 0) { player.stats[b.dataset.stat]++; player.points--; applyStats(); updateUI(); }
    });

    function initDecorations() {
        decorations = [];
        for(let i=0; i<20; i++) decorations.push({ x: Math.random() * 1000, y: Math.random() * worldSize.height, type: 'tree' });
        for(let i=0; i<40; i++) decorations.push({ x: 1200 + Math.random() * (worldSize.width-1200), y: Math.random() * worldSize.height, type: 'rock' });
    }

    function addEffect(x, y, r, c, type) {
        effects.push({ x, y, maxR: r, currentR: 0, color: c, life: 1.0, type: type });
    }

    function update() {
        if (!isDashing) {
            if (keys['ArrowUp']) playerPos.y -= player.speed;
            if (keys['ArrowDown']) playerPos.y += player.speed;
            if (keys['ArrowLeft']) playerPos.x -= player.speed;
            if (keys['ArrowRight']) playerPos.x += player.speed;
        }
        if (dashCooldown > 0) dashCooldown--;

        mpRegenTimer++;
        if (mpRegenTimer >= 60) {
            let regen = (1 + player.stats.int * 0.3) * (1 + passiveData.int.level);
            player.mp = Math.min(player.maxMp, player.mp + regen);
            if (passiveData.con.level > 0) player.hp = Math.min(player.maxHp, player.hp + passiveData.con.level * 2);
            mpRegenTimer = 0; updateUI();
        }

        if (monsters.length < 20) spawnMonsters(1);
        monsters.forEach(m => {
            const dx = playerPos.x - m.x, dy = playerPos.y - m.y, dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 600 && dist > 30) { m.x += (dx/dist)*m.speed; m.y += (dy/dist)*m.speed; }
            if (dist < 40) { 
                let rawDmg = (m.isBoss ? 2 : 0.4);
                // 바위 수인 고유 스킬: 단단한 피부 (데미지 감소)
                if (player.raceData.uniqueSkill.type === 'defense_passive') rawDmg *= 0.7;
                player.hp -= rawDmg; 
                updateUI(); 
            }
        });

        playerPos.x = Math.max(0, Math.min(worldSize.width - 32, playerPos.x));
        playerPos.y = Math.max(0, Math.min(worldSize.height - 32, playerPos.y));

        effects.forEach((e, i) => {
            if (e.type === 'wave') { e.currentR += e.maxR / 10; e.life -= 0.08; }
            else { e.x += e.vx; e.y += e.vy; e.life -= 0.03; }
            if (e.life <= 0) effects.splice(i, 1);
        });

        if (player.hp <= 0) {
            alert("전투 불능! 마을로 귀환합니다."); player.hp = player.maxHp; player.mp = player.maxMp;
            playerPos.x = 300; playerPos.y = 300; updateUI();
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const camX = playerPos.x - canvas.width / 2 + 16, camY = playerPos.y - canvas.height / 2 + 16;
        ctx.save(); ctx.translate(-camX, -camY);

        ctx.fillStyle = '#1b5e20'; ctx.fillRect(0, 0, 1100, worldSize.height);
        ctx.fillStyle = '#3e2723'; ctx.fillRect(1100, 0, worldSize.width - 1100, worldSize.height);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 8; ctx.setLineDash([20, 15]); ctx.beginPath(); ctx.moveTo(1100, 0); ctx.lineTo(1100, worldSize.height); ctx.stroke(); ctx.setLineDash([]);

        decorations.forEach(d => {
            if (d.type === 'tree') { ctx.fillStyle = '#3e2723'; ctx.fillRect(d.x+12, d.y+30, 16, 30); ctx.fillStyle = '#2e7d32'; ctx.beginPath(); ctx.arc(d.x+20, d.y+20, 30, 0, Math.PI*2); ctx.fill(); }
            else { ctx.fillStyle = '#616161'; ctx.beginPath(); ctx.arc(d.x+20, d.y+20, 18, 0, Math.PI*2); ctx.fill(); }
        });

        npcs.forEach(n => { ctx.fillStyle = n.color; ctx.beginPath(); ctx.arc(n.x+20, n.y+20, 22, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.textAlign='center'; ctx.font='bold 16px Arial'; ctx.fillText(`! ${n.name}`, n.x+20, n.y-15); });
        
        monsters.forEach(m => {
            ctx.fillStyle = m.isBoss ? '#000' : '#d50000';
            ctx.fillRect(m.x, m.y, m.width, m.height);
            ctx.fillStyle = '#000'; ctx.fillRect(m.x, m.y-15, m.width, 8);
            ctx.fillStyle = '#ff1744'; ctx.fillRect(m.x, m.y-15, m.width*(m.hp/m.maxHp), 8);
            if(m.isBoss) { ctx.fillStyle='#fff'; ctx.font='bold 14px Arial'; ctx.textAlign='center'; ctx.fillText(m.name, m.x+m.width/2, m.y-25); }
        });

        effects.forEach(e => {
            ctx.globalAlpha = e.life;
            if (e.type === 'wave') { ctx.strokeStyle = e.color; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(e.x, e.y, e.currentR, 0, Math.PI*2); ctx.stroke(); }
            else { ctx.fillStyle = e.color; ctx.beginPath(); ctx.arc(e.x, e.y, e.size || 5, 0, Math.PI*2); ctx.fill(); }
        });
        ctx.globalAlpha = 1;

        ctx.shadowBlur = 15; ctx.shadowColor = '#00e676';
        ctx.fillStyle = isDashing ? '#fff' : '#00e676'; ctx.fillRect(playerPos.x, playerPos.y, 32, 32);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(`${player.race} (Lv.${player.level})`, playerPos.x+16, playerPos.y-10);

        ctx.restore();
    }

    function gameLoop() { if (!gameScreen.classList.contains('hidden')) { update(); draw(); requestAnimationFrame(gameLoop); } }
});
