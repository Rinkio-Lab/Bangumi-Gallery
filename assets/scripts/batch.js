const batchModeToggle = document.getElementById('batchModeToggle');
let batchMode = false;
let selectedIds = new Set();

function toggleBatch(id, w) {
    selectedIds.has(id) ? selectedIds.delete(id) : selectedIds.add(id);
    w.classList.toggle('selected');
}

function enableBatch() {
    batchMode = true;
    selectedIds.clear();
    document.body.classList.add('batch-mode');
    showBar();
}

function disableBatch() {
    batchMode = false;
    selectedIds.clear();
    document.body.classList.remove('batch-mode');
    document.getElementById('batchBar')?.remove();
    updateGallery();
}

function showStatusModal(callback) {
    const modal = document.getElementById('statusModal');
    modal.classList.remove('hidden');
    modal.querySelectorAll('.status-options button').forEach(btn => {
        btn.onclick = () => {
            callback(btn.dataset.status);
            modal.classList.add('hidden');
        };
    });
    modal.querySelector('#statusCancel').onclick = () => modal.classList.add('hidden');
}

// 批量操作栏配置常量
const BATCH_BAR_CONFIG = {
    id: 'batchBar',
    className: 'batch-bar',
    buttons: [
        {
            id: 'bf',
            className: 'btn',
            icon: 'favorite',
            text: '收藏',
            action: 'favorite'
        },
        {
            id: 'bu',
            className: 'btn',
            icon: 'favorite_border',
            text: '取消',
            action: 'unfavorite'
        },
        {
            id: 'bs',
            className: 'btn',
            icon: 'tv',
            text: '状态',
            action: 'status'
        },
        {
            id: 'bx',
            className: 'btn',
            icon: 'close',
            text: '退出',
            action: 'exit'
        }
    ]
};

// 创建按钮元素
function createButton(config) {
    const button = document.createElement('button');
    button.id = config.id;
    button.className = config.className;
    button.dataset.action = config.action;
    
    const icon = document.createElement('span');
    icon.className = 'material-icons';
    icon.textContent = config.icon;
    
    const text = document.createTextNode(' ' + config.text);
    
    button.appendChild(icon);
    button.appendChild(text);
    
    return button;
}

// 处理批量操作
function handleBatchAction(event) {
    const button = event.target.closest('button');
    if (!button) return;
    
    const action = button.dataset.action;
    switch (action) {
        case 'favorite':
            selectedIds.forEach(id => favorites.add(id));
            saveFav();
            updateGallery();
            break;
            
        case 'unfavorite':
            selectedIds.forEach(id => favorites.delete(id));
            saveFav();
            updateGallery();
            break;
            
        case 'status':
            showStatusModal(status => {
                ORIGINAL.forEach(b => {
                    if (selectedIds.has(b.id)) b.status = status;
                });
                updateGallery();
            });
            break;
            
        case 'exit':
            disableBatch();
            break;
    }
}

// 显示批量操作栏
function showBar() {
    // 检查是否已存在
    let bar = document.getElementById(BATCH_BAR_CONFIG.id);
    if (bar) {
        bar.style.display = 'flex';
        return;
    }
    
    // 创建工具栏
    bar = document.createElement('div');
    bar.id = BATCH_BAR_CONFIG.id;
    bar.className = BATCH_BAR_CONFIG.className;
    
    // 添加按钮
    BATCH_BAR_CONFIG.buttons.forEach(config => {
        bar.appendChild(createButton(config));
    });
    
    // 添加事件委托
    bar.addEventListener('click', handleBatchAction);
    
    // 添加到页面
    document.body.appendChild(bar);
}


batchModeToggle.onclick = () => batchMode ? disableBatch() : enableBatch();

console.log('%c[4/8]%c Batch script loaded.', styles.step, styles.info);