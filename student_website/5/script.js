const state = {
    x: 600, y: 600,
    speed: 6,
    inventory: [],
    selectedItem: null,
    stageIdx: 0,
    isModalOpen: false,
    hasChoice: false,
    isInventoryOpen: false,
    isEnding: false,
    isHidden: false,
    keys: {},
    viewport: { w: 0, h: 0 },

    morality: 0,
    sanity: 10,
    knowledge: 0,
    trapCount: 0,

    mapWidth: 1200,
    mapHeight: 1200,
    flags: {},

    chaser: {
        active: false,
        x: 0, y: 0,
        speed: 4.5,
        targetStages: [1, 2]
    }
};

const stages = [
    {
        name: "지하 관리실 (시작)",
        bgClass: "bg-common",
        objects: [
            { id: 'rules_start', name: '낡은 수칙서', x: 400, y: 400, type: 'item', icon: '📜',
              desc: "제 1조: 이곳은 둘로 나뉩니다. 땅의 짐승과 물의 괴물.\n\n제 2조: 가방(E)에서 도구를 선택하고 사용(Z)하십시오.\n\n제 3조: 중앙 광장의 그늘을 밟지 마십시오.\n\n제 4조: 복도에 있는 '젠틀라'는 누군가가 탐험가의 일기를 가져오면 쫓아옵니다." },
            { id: 'flashlight', name: '손전등', x: 800, y: 400, type: 'item', icon: '🔦',
              desc: "어둠 속에서 진실을 밝히는 도구입니다." },
            { id: 'hide_0', name: '캐비닛', x: 200, y: 200, type: 'hideout', icon: '🚪', desc: "숨기 좋은 낡은 캐비닛입니다. (Space: 숨기/나오기)" },
            { id: 'door_main', name: '중앙 광장으로', x: 600, y: 1000, type: 'portal', target: 1, icon: '🚪' }
        ]
    },
    {
        name: "중앙 광장 (갈림길)",
        bgClass: "bg-common",
        objects: [
            { id: 'sign_corridor', name: '잊혀진 복도 입구', x: 600, y: 300, type: 'portal', target: 2, icon: '🏛️' },
            { id: 'sign_zoo', name: '동물원 방향', x: 200, y: 600, type: 'portal', target: 3, icon: '🦁' },
            { id: 'sign_aqua', name: '수족관 방향', x: 1000, y: 600, type: 'portal', target: 6, icon: '🌊' },
            { id: 'hide_1', name: '큰 상자', x: 800, y: 800, type: 'hideout', icon: '📦' },
            { id: 'trap_shadow', name: '검은 그늘', x: 600, y: 700, type: 'trap', icon: '🌑',
              desc: "그늘 속의 무언가가 당신의 발을 잡았습니다!",
              action: () => { applyStatChange([{ label: '이성', stat: 'sanity', delta: -2 }]); triggerTrap(); }
            }
        ]
    },
    {
        name: "잊혀진 복도 (Corridor)",
        bgClass: "bg-corridor",
        objects: [
            { id: 'diary', name: '탐험가의 일기', x: 400, y: 400, type: 'item', icon: '📔',
              desc: "'젠틀라의 빛을 보지 마라... 촉수에 닿는 순간 너는 빛의 일부가 될 것이다.'",
              onCollect: () => { 
                  applyStatChange([{ label: '지식', stat: 'knowledge', delta: 5 }]);
                  startChase(); 
              } 
            },
            { id: 'hide_2', name: '낡은 캐비닛', x: 900, y: 300, type: 'hideout', icon: '🚪' },
            { id: 'back_main', name: '중앙 광장으로', x: 600, y: 1000, type: 'portal', target: 1, icon: '🔙' }
        ]
    },
    {
        name: "사자 사육장 (동물원)",
        bgClass: "bg-zoo",
        objects: [
            { id: 'lion_choice', name: '굶주린 사자', x: 600, y: 400, type: 'choice', icon: '🦁',
              desc: "사자가 괴로워 보입니다.",
              options: [
                { label: "먹이를 준다", action: () => {
                    applyStatChange([{ label: '도덕성', stat: 'morality', delta: 3 }]);
                    state.inventory.push('날카로운 이빨');
                    showModal("사자가 사라지고 '날카로운 이빨'을 얻었습니다.");
                } },
                { label: "공격한다", action: () => {
                    applyStatChange([{ label: '도덕성', stat: 'morality', delta: -5 }, { label: '이성', stat: 'sanity', delta: -2 }]);
                    showModal("사자를 처치했습니다.");
                } }
              ]
            },
            { id: 'zoo_next', name: '원숭이 사육장으로', x: 1000, y: 600, type: 'portal', target: 4, icon: '➡️' },
            { id: 'back_main_z', name: '중앙 광장으로', x: 600, y: 1100, type: 'portal', target: 1, icon: '🔙' }
        ]
    },
    {
        name: "원숭이 사육장",
        bgClass: "bg-zoo",
        objects: [
            { id: 'monkey_statue', name: '눈뜬 원숭이', x: 600, y: 400, type: 'puzzle', icon: '🗿',
              req: '손전등', useItem: '손전등',
              action: () => {
                  state.flags.monkeyFixed = true;
                  applyStatChange([{ label: '지식', stat: 'knowledge', delta: 3 }]);
                  showModal("북쪽 벽이 열립니다.");
                  renderMap();
              }
            },
            { id: 'zoo_secret', name: '코끼리 무덤으로', x: 600, y: 100, type: 'portal', target: 5, icon: '🐘',
              condition: () => state.flags.monkeyFixed, hidden: true }
        ]
    },
    {
        name: "코끼리 무덤",
        bgClass: "bg-zoo",
        objects: [
            { id: 'ele_lore', name: '거대한 상아', x: 600, y: 600, type: 'item', icon: '🦷',
              onCollect: () => { applyStatChange([{ label: '지식', stat: 'knowledge', delta: 10 }]); } },
            { id: 'zoo_to_final', name: '심판의 방으로', x: 600, y: 1000, type: 'portal', target: 9, icon: '🪞' }
        ]
    },
    {
        name: "산소 공급실 (수족관)",
        bgClass: "bg-aqua",
        objects: [
            { id: 'valve', name: '굳게 닫힌 밸브', x: 600, y: 400, type: 'puzzle', icon: '⚙️',
              req: '날카로운 이빨', useItem: '날카로운 이빨',
              action: () => {
                  state.flags.oxygenOn = true;
                  showModal("산소가 공급됩니다.");
                  renderMap();
              }
            },
            { id: 'aqua_next', name: '투명 수조로', x: 1000, y: 600, type: 'portal', target: 7, icon: '➡️',
              condition: () => state.flags.oxygenOn, hidden: true },
            { id: 'back_main_a', name: '중앙 광장으로', x: 600, y: 1100, type: 'portal', target: 1, icon: '🔙' }
        ]
    },
    {
        name: "투명 수조",
        bgClass: "bg-aqua",
        objects: [
            { id: 'deep_eye', name: '거대한 눈', x: 600, y: 400, type: 'choice', icon: '👁️',
              options: [
                { label: "마주본다", action: () => {
                    applyStatChange([{ label: '이성', stat: 'sanity', delta: -6 }, { label: '지식', stat: 'knowledge', delta: 15 }]);
                    showModal("기억이 주입됩니다.");
                } },
                { label: "회피한다", action: () => {
                    applyStatChange([{ label: '이성', stat: 'sanity', delta: 2 }]);
                    showModal("정신이 맑아집니다.");
                } }
              ]
            },
            { id: 'aqua_next_2', name: '가오리 수조로', x: 600, y: 100, type: 'portal', target: 8, icon: '🐟' }
        ]
    },
    {
        name: "가오리 수조",
        bgClass: "bg-aqua",
        objects: [
            { id: 'trap_volt', name: '전기 가오리', x: 400, y: 400, type: 'trap', icon: '⚡',
              action: () => { applyStatChange([{ label: '이성', stat: 'sanity', delta: -3 }]); triggerTrap(); }
            },
            { id: 'aqua_to_final', name: '심판의 방으로', x: 600, y: 1000, type: 'portal', target: 9, icon: '🪞' }
        ]
    },
    {
        name: "심판의 방",
        bgClass: "bg-final",
        objects: [
            { id: 'final_mirror', name: '진실의 거울', x: 600, y: 600, type: 'event', icon: '🪞',
              action: () => triggerEnding() }
        ]
    }
];

function startChase() {
    state.chaser.active = true;
    state.chaser.x = 1000; state.chaser.y = 800;
    document.getElementById('chaser').style.display = 'block';
    stages[2].objects.push(
        { id: 'obs_1', name: '무너진 벽', x: 600, y: 500, type: 'trap', icon: '🧱' },
        { id: 'obs_2', name: '가시 넝쿨', x: 300, y: 800, type: 'trap', icon: '🌵' }
    );
    renderMap();
}

function applyStatChange(changes) {
    let hasNegative = false; let hasPositive = false;
    changes.forEach(({ stat, delta }) => {
        state[stat] += delta;
        if (delta < 0) hasNegative = true; else hasPositive = true;
    });
    const mapArea = document.getElementById('map-area');
    mapArea.classList.remove('tint-negative', 'tint-positive');
    void mapArea.offsetWidth; 
    if (hasNegative) mapArea.classList.add('tint-negative');
    else if (hasPositive) mapArea.classList.add('tint-positive');
}

function transitionToStage(targetIdx, message) {
    const overlay = document.getElementById('stage-transition');
    overlay.classList.add('transitioning');
    setTimeout(() => {
        state.stageIdx = targetIdx;
        state.x = 600; state.y = 600;
        state.isHidden = false;
        document.getElementById('player').classList.remove('hidden');
        if (state.chaser.active) {
            if (state.chaser.targetStages.includes(state.stageIdx)) {
                document.getElementById('chaser').style.display = 'block';
                state.chaser.x = state.x > 600 ? 100 : 1100;
                state.chaser.y = state.y > 600 ? 100 : 1100;
            } else { document.getElementById('chaser').style.display = 'none'; }
        }
        renderMap();
        if (message) showModal(message);
    }, 340);
    overlay.addEventListener('animationend', () => overlay.classList.remove('transitioning'), { once: true });
}

function init() {
    state.viewport.w = document.getElementById('map-area').clientWidth;
    state.viewport.h = document.getElementById('map-area').clientHeight;
    
    // 배경 클릭 시 모달 닫기
    document.getElementById('modal-overlay').addEventListener('mousedown', (e) => {
        if (e.target !== e.currentTarget) return;
        if (state.isModalOpen && !state.hasChoice) {
            if (state.isEnding) location.reload();
            closeModal();
        }
    });

    window.addEventListener('keydown', e => {
        const key = e.key.toLowerCase();
        if (state.isEnding) { location.reload(); return; }
        if (state.isModalOpen) {
            if (key === 'e' && state.isInventoryOpen) { toggleInventory(); return; }
            if (key === 'z' && state.isInventoryOpen) { useSelectedItem(); return; }
            if (!state.hasChoice && !state.isInventoryOpen) { closeModal(); return; }
            return;
        }
        state.keys[key] = true;
        if (key === 'e') toggleInventory();
        if (key === 'z') useSelectedItem();
        if (key === ' ') handleInteraction();
    });
    window.addEventListener('keyup', e => state.keys[e.key.toLowerCase()] = false);
    renderMap();
    gameLoop();
}

function renderMap() {
    const objectsEl = document.getElementById('objects');
    const stage = stages[state.stageIdx];
    document.getElementById('map').className = stage.bgClass;
    objectsEl.innerHTML = '';
    stage.objects.forEach(obj => {
        if (obj.hidden && obj.condition && !obj.condition()) return;
        const el = document.createElement('div');
        el.className = 'entity ' + (obj.type) + (obj.used ? ' used' : '');
        el.style.left = obj.x + 'px'; el.style.top  = obj.y + 'px';
        el.innerText = obj.icon;
        objectsEl.appendChild(el);
    });
    document.getElementById('status-line').innerHTML =
        `<span>위치: ${stage.name}</span>` +
        `<span>이성: ${state.sanity} | 지식: ${state.knowledge}</span>` +
        `<span>위험: ${state.trapCount}/4</span>`;
}

function showModal(text, options = null) {
    state.isModalOpen = true; state.hasChoice = !!options;
    document.getElementById('modal-overlay').style.display = 'flex';
    const textEl = document.getElementById('modal-text');
    textEl.innerText = text;
    if (options) {
        const div = document.createElement('div');
        div.className = 'choice-container';
        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'modal-btn'; btn.innerText = opt.label;
            btn.onclick = (e) => { e.stopPropagation(); opt.action(); };
            div.appendChild(btn);
        });
        textEl.appendChild(div);
    }
}

function closeModal() {
    state.isModalOpen = false; state.hasChoice = false; state.isInventoryOpen = false;
    document.getElementById('modal-overlay').style.display = 'none';
}

function toggleInventory() {
    if (state.isInventoryOpen) closeModal();
    else {
        state.isInventoryOpen = true; state.isModalOpen = true;
        document.getElementById('modal-overlay').style.display = 'flex';
        const textEl = document.getElementById('modal-text');
        textEl.innerHTML = "<h3>소지품 가방</h3>";
        refreshInventoryContent(textEl);
    }
}

function refreshInventoryContent(container) {
    const existing = container.querySelector('.inventory-grid');
    if (existing) existing.remove();
    const grid = document.createElement('div');
    grid.className = 'inventory-grid';
    state.inventory.forEach(item => {
        const slot = document.createElement('div');
        slot.className = 'inv-slot' + (state.selectedItem === item ? ' selected' : '');
        slot.innerText = item;
        
        // 아이템 클릭 시 선택
        const selectHandler = (e) => {
            e.stopPropagation();
            state.selectedItem = item;
            refreshInventoryContent(container);
            const title = container.querySelector('h3');
            if (title) title.innerText = `'${item}' 선택됨 (Z키로 사용)`;
        };
        slot.onclick = selectHandler;
        slot.ontouchstart = selectHandler;
        
        grid.appendChild(slot);
    });
    container.appendChild(grid);
}

function useSelectedItem() {
    if (state.isModalOpen && !state.isInventoryOpen) return;
    if (!state.selectedItem) {
        showModal("아이템이 선택되지 않았습니다.\n(가방을 열어 아이템을 클릭해 선택하세요)");
        return;
    }
    const stage = stages[state.stageIdx];
    const near = stage.objects.find(obj => !obj.used && Math.hypot(state.x - obj.x, state.y - obj.y) < 100);

    if (near && (near.useItem === state.selectedItem || near.req === state.selectedItem)) {
        near.action(); near.used = true;
        state.inventory = state.inventory.filter(i => i !== state.selectedItem);
        state.selectedItem = null;
        renderMap();
        if (state.isInventoryOpen) closeModal();
    } else {
        showModal(`'${state.selectedItem}'을(를) 여기에서 사용할 수 없습니다.`);
    }
}

function triggerTrap() {
    state.trapCount++;
    if (state.trapCount >= 4 || state.sanity <= 0) {
        triggerSpecialEnding("데드 엔딩: 당신의 정신과 육체가 무너졌습니다.");
    }
}

function triggerJumpscare() {
    const overlay = document.getElementById('jumpscare-overlay');
    overlay.style.display = 'block';
    const lHalf = overlay.querySelector('.l-half'); const rHalf = overlay.querySelector('.r-half'); const light = overlay.querySelector('.gentla-light-js');
    lHalf.style.animation = 'none'; rHalf.style.animation = 'none'; light.style.animation = 'none';
    void overlay.offsetWidth; 
    lHalf.style.animation = 'split-l 0.8s forwards ease-out'; rHalf.style.animation = 'split-r 0.8s forwards ease-out'; light.style.animation = 'light-consume 1.5s forwards ease-out 0.6s';
    setTimeout(() => { overlay.style.display = 'none'; triggerSpecialEnding("젠틀라에게 붙잡혔습니다... 당신의 몸은 붉은 빛의 양분이 되었습니다."); }, 2500);
}

function triggerSpecialEnding(msg) { state.isEnding = true; showModal(msg + "\n\n(아무 키나 눌러 다시 시작)"); }
function triggerEnding() {
    let msg = "A급 엔딩: 살아남았으나, 매일 밤 비명이 들려옵니다.";
    if (state.morality > 2 && state.knowledge > 15 && state.sanity > 5) msg = "S급 엔딩: 진실된 탈출에 성공했습니다.";
    triggerSpecialEnding(msg);
}

function handleInteraction() {
    if (state.isModalOpen) return;
    const stage = stages[state.stageIdx];
    const found = stage.objects.find(obj => !obj.used && Math.hypot(state.x - obj.x, state.y - obj.y) < 85);
    if (!found) return;
    if (found.type === 'hideout') {
        state.isHidden = !state.isHidden;
        const playerEl = document.getElementById('player');
        if (state.isHidden) { playerEl.classList.add('hidden'); showModal("몸을 숨겼습니다."); }
        else { playerEl.classList.remove('hidden'); showModal("숨은 곳에서 나왔습니다."); }
        return;
    }
    if (state.isHidden) return;
    if (found.type === 'item') {
        state.inventory.push(found.name); found.used = true;
        if (found.onCollect) found.onCollect();
        showModal(`${found.name} 획득!`);
    } else if (found.type === 'portal') { transitionToStage(found.target, `${stages[found.target].name} 진입.`); }
    else if (found.type === 'choice') { showModal(found.desc, found.options); found.used = true; }
    else if (found.type === 'puzzle') {
        const haveReq = state.inventory.includes(found.req);
        const selected = state.selectedItem === found.req;
        if (found.req && !haveReq) showModal(`아이템이 필요합니다: ${found.req}`);
        else if (found.req && haveReq && !selected) showModal(`가방(E)에서 ${found.req}을 클릭해 선택한 뒤 Z키를 누르세요.`);
        else if (selected) useSelectedItem();
        else showModal(found.desc);
    } else if (found.type === 'event') found.action();
}

function update() {
    if (state.isModalOpen || state.isHidden) {
        if (state.chaser.active && state.chaser.targetStages.includes(state.stageIdx)) moveChaser(false);
        return;
    }
    let dx = 0, dy = 0;
    if (state.keys['w'] || state.keys['arrowup']) dy -= state.speed;
    if (state.keys['s'] || state.keys['arrowdown']) dy += state.speed;
    if (state.keys['a'] || state.keys['arrowleft']) dx -= state.speed;
    if (state.keys['d'] || state.keys['arrowright']) dx += state.speed;
    state.x += dx; state.y += dy;
    state.x = Math.max(30, Math.min(state.mapWidth - 30, state.x));
    state.y = Math.max(30, Math.min(state.mapHeight - 30, state.y));
    const playerEl = document.getElementById('player');
    playerEl.style.left = state.x + 'px'; playerEl.style.top = state.y + 'px';
    if (dx !== 0 || dy !== 0) playerEl.classList.add('walking'); else playerEl.classList.remove('walking');
    if (state.chaser.active && state.chaser.targetStages.includes(state.stageIdx)) moveChaser(true);
    const camX = state.viewport.w / 2 - state.x; const camY = state.viewport.h / 2 - state.y;
    document.getElementById('map').style.transform = `translate(${camX}px, ${camY}px)`;
    const stage = stages[state.stageIdx];
    const near = stage.objects.find(obj => !obj.used && Math.hypot(state.x - obj.x, state.y - obj.y) < 85);
    document.querySelector('.interact-prompt').style.display = near ? 'block' : 'none';
}

function moveChaser(canSeePlayer) {
    const chaserEl = document.getElementById('chaser');
    let targetX = state.x, targetY = state.y;
    if (!canSeePlayer) { targetX = state.chaser.x + (Math.random() - 0.5) * 50; targetY = state.chaser.y + (Math.random() - 0.5) * 50; }
    const angle = Math.atan2(targetY - state.chaser.y, targetX - state.chaser.x);
    state.chaser.x += Math.cos(angle) * state.chaser.speed; state.chaser.y += Math.sin(angle) * state.chaser.speed;
    chaserEl.style.left = state.chaser.x + 'px'; chaserEl.style.top = state.chaser.y + 'px';
    if (canSeePlayer && Math.hypot(state.x - state.chaser.x, state.y - state.chaser.y) < 55) { triggerJumpscare(); state.chaser.active = false; }
}

function gameLoop() { update(); requestAnimationFrame(gameLoop); }
function move(dir) { if (state.isModalOpen || state.isHidden) return; state.keys = {}; if (dir !== 'stop') state.keys[dir] = true; }
window.onload = init;
