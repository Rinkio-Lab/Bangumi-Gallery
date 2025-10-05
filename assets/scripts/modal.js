const modal = document.getElementById('modal');
const modalClose = document.getElementById('modalClose');
const modalCover = document.getElementById('modal-cover');
const modalTitle = document.getElementById('modal-title');
const modalMeta = document.getElementById('modal-meta');
const modalOther = document.getElementById('modal-other');
const modalTags = document.getElementById('modal-tags');
const modalDesc = document.getElementById('modal-desc');
const modalFavBtn = document.getElementById('modal-fav');
const modalStatus = document.getElementById('modal-status');

// 模态框配置常量
const MODAL_CONFIG = {
    bangumiUrl: 'https://chii.in/subject/',
    buttonMargin: '8px',
    defaultStatus: '—',
    metaSeparator: ' · ',
    titleSeparator: ' / '
};

// 创建标签元素
function createTagElement(tag) {
    const span = document.createElement('span');
    span.className = 'tag';
    span.textContent = tag;
    return span;
}

// 创建Bangumi按钮
function createBangumiButton(id) {
    const button = document.createElement('button');
    button.id = 'modal-bangumi';
    button.className = 'bangumi-btn';
    button.style.marginLeft = MODAL_CONFIG.buttonMargin;
    
    const icon = document.createElement('span');
    icon.className = 'material-icons';
    icon.textContent = 'open_in_new';
    
    const text = document.createTextNode(' 在 Bangumi 打开');
    
    button.appendChild(icon);
    button.appendChild(text);
    
    button.onclick = () => {
        const url = MODAL_CONFIG.bangumiUrl + id;
        window.open(url, '_blank', 'noopener,noreferrer');
    };
    
    return button;
}

// 更新模态框内容
function updateModalContent(data) {
    // 验证输入数据
    if (!data || typeof data !== 'object') {
        console.error('Invalid modal data');
        return;
    }

    // 更新基本信息
    modal.dataset.id = data.id;
    modalCover.src = data.cover;
    modalCover.onclick = () => window.open(data.cover, '_blank', 'noopener,noreferrer');
    modalTitle.textContent = data.mainTitle;
    modalDesc.textContent = data.desc;
    modalStatus.textContent = `状态：${data.status || MODAL_CONFIG.defaultStatus}`;

    // 更新元信息
    const metaContent = [
        data.year,
        `${data.episodes}话`,
        `<span class="material-icons">star</span> ${data.rating}`
    ].join(MODAL_CONFIG.metaSeparator);
    modalMeta.innerHTML = metaContent;

    // 更新其他标题
    modalOther.textContent = data.otherTitle?.join(MODAL_CONFIG.titleSeparator) || '';

    // 更新标签
    modalTags.innerHTML = '';
    data.tags?.forEach(tag => {
        modalTags.appendChild(createTagElement(tag));
    });

    // 更新收藏状态
    syncFav();

    // 更新或创建Bangumi按钮
    let bangumiBtn = modal.querySelector('#modal-bangumi');
    if (!bangumiBtn) {
        bangumiBtn = createBangumiButton(data.id);
        modalFavBtn.insertAdjacentElement('afterend', bangumiBtn);
    }
}

// 打开模态框
function openModal(data) {
    try {
        updateModalContent(data);
        modal.classList.remove('hidden');
    } catch (error) {
        console.error('Error opening modal:', error);
    }
}


modalClose.onclick = () => modal.classList.add('hidden');
modal.onclick = e => {
    if (e.target === modal) modal.classList.add('hidden');
};
modalFavBtn.onclick = () => {
    toggleFav(modal.dataset.id);
    syncFav();
    updateGallery();
};

function syncFav() {
    const id = modal.dataset.id;
    if (favorites.has(id)) {
        modalFavBtn.innerHTML = '<span class="material-icons">favorite</span> 已收藏';
        modalFavBtn.classList.add('active');
    } else {
        modalFavBtn.innerHTML = '<span class="material-icons">favorite_border</span> 收藏';
        modalFavBtn.classList.remove('active');
    }
}

modalTags.addEventListener('wheel', e => {
    if (e.deltaY !== 0) {
        modalTags.scrollLeft += e.deltaY * 0.5;
        e.preventDefault();
    }
});

console.log('%c[3/8]%c Modal script loaded.', styles.step, styles.info);