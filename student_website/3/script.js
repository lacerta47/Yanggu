/**
 * NewProject v1 - 정통 이미지 에셋 교체 시스템
 */

// 아이템 데이터베이스 (assets/images 경로와 매칭)
const itemData = {
    top: [
        { name: '핑크 프릴 셔츠', file: 'spring_top_frill.svg' }
    ],
    bottom: [
        { name: '샤랄라 스커트', file: 'spring_bottom_skirt.svg' }
    ],
    onepiece: [
        { name: '노란 데이지 원피스', file: 'spring_onepiece_daisy.svg' }
    ],
    accessory: [
        { name: '왕리본 머리띠', file: 'spring_accessory_ribbon.svg' }
    ]
};

// 현재 게임 상태
let state = {
    category: 'top',
    equipped: {
        top: '',
        bottom: '',
        onepiece: '',
        accessory: ''
    }
};

// DOM 요소
const shelf = document.getElementById('item-shelf');
const startBtn = document.getElementById('start-btn');
const finishBtn = document.getElementById('finish-btn');
const retryBtn = document.getElementById('retry-btn');
const resetBtn = document.getElementById('reset-btn');

function init() {
    renderShelf();
}

function renderShelf() {
    shelf.innerHTML = '';
    const items = itemData[state.category];

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = `item-card ${state.equipped[state.category] === item.file ? 'selected' : ''}`;
        card.innerHTML = `
            <img src="../assets/images/${item.file}" class="item-preview" alt="${item.name}">
            <div class="item-label">${item.name}</div>
        `;
        card.onclick = () => toggleItem(state.category, item.file);
        shelf.appendChild(card);
    });
}

function toggleItem(cat, filename) {
    const layer = document.getElementById(`layer-${cat}`);
    
    if (state.equipped[cat] === filename) {
        // 이미 입고 있으면 벗기기
        state.equipped[cat] = '';
        layer.src = '';
        layer.style.display = 'none';
    } else {
        // 상호 배제 (한벌옷 vs 상하의)
        if (cat === 'onepiece') {
            state.equipped.top = '';
            state.equipped.bottom = '';
            document.getElementById('layer-top').src = '';
            document.getElementById('layer-bottom').src = '';
        } else if (cat === 'top' || cat === 'bottom') {
            state.equipped.onepiece = '';
            document.getElementById('layer-onepiece').src = '';
        }

        state.equipped[cat] = filename;
        layer.src = `../assets/images/${filename}`;
        layer.style.display = 'block';
    }
    renderShelf();
}

// 화면 전환
function switchScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

// 이벤트 리스너
startBtn.onclick = () => switchScreen('play-screen');

document.querySelectorAll('.cat-tab').forEach(tab => {
    tab.onclick = () => {
        document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.category = tab.dataset.category;
        renderShelf();
    };
});

finishBtn.onclick = () => {
    const finalContainer = document.getElementById('final-bear-container');
    finalContainer.innerHTML = document.querySelector('.bear-frame').innerHTML;
    switchScreen('result-screen');
};

retryBtn.onclick = () => switchScreen('play-screen');
resetBtn.onclick = () => location.reload();

// 초기화 실행
init();
