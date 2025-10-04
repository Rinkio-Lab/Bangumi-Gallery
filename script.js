const gallery = document.getElementById('gallery');
const searchInput = document.getElementById('searchInput');
const tagSearchInput = document.getElementById('tagSearchInput');
const tagSuggestions = document.getElementById('tagSuggestions');
const sortSelect = document.getElementById('sortSelect');
const themeToggle = document.getElementById('themeToggle');
const batchModeToggle = document.getElementById('batchModeToggle');
const selectedTagsRow = document.getElementById('selectedTags');
const statusCheckboxes = Array.from(document.querySelectorAll('.status-filters input'));
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

const ORIGINAL = BANGUMI_DATA.map(x => ({
    ...x
}));
let favorites = new Set(JSON.parse(localStorage.getItem('rin_favs') || '[]'));
let activeTags = new Set();
let batchMode = false;
let selectedIds = new Set();
const collator = new Intl.Collator(['ja-JP'], {
    usage: 'sort',
    numeric: true,
    sensitivity: 'variant'
});
const allTags = [...new Set(ORIGINAL.flatMap(b => b.tags))].sort((a, b) => collator.compare(a, b));

function saveFav() {
    localStorage.setItem('rin_favs', JSON.stringify([...favorites]));
}

function toggleFav(id) {
    favorites.has(id) ? favorites.delete(id) : favorites.add(id);
    saveFav();
}

function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[c]));
}

/* ========== 渲染卡片 ========== */
function createCard(b) {
    const wrap = document.createElement('div');
    wrap.className = 'card-wrapper';
    wrap.dataset.id = b.id;

    // 强推处理
    if (b.isRecommended) {
        wrap.style.outline = '5px solid var(--accent-two)';
        wrap.style.outlineOffset = '3px';
        wrap.style.borderRadius = '12px';
    }

    const fav = favorites.has(b.id);
    const high = b.rating >= 8;
    const st = b.status;
    const badges = [];
    if (fav) badges.push('<span class="material-icons">favorite</span>');
    if (high) badges.push('<span class="material-icons">star</span>');
    if (st === 'watching') badges.push('<span class="material-icons">tv</span>');
    if (st === 'finished') badges.push('<span class="material-icons">check</span>');
    if (st === 'planned') badges.push('<span class="material-icons">schedule</span>');

    wrap.innerHTML = `
    <div class="card">
      <div class="cover-wrapper" style="position: relative;">
        <img src="${b.cover}" class="cover-img">
        ${b.isRecommended ? `<div class="rec-banner" style="
            position: absolute;
            top: 8px;
            left: 8px;
            background-color: var(--accent);
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            z-index: 10;
          ">强推</div>` : ''}
      </div>
      <div class="card-body">
        <div class="title">${escapeHtml(b.mainTitle)}</div>
        <div class="meta">${b.year} · ${b.rating} · ${b.episodes}话</div>
        <div class="tags">${b.tags.slice(0, 4).map(t => `<span class='tag'>${t}</span>`).join('')}</div>
        <div class="badges">${badges.join(' ')}</div>
      </div>
    </div>
    <button class="fav-icon">${fav ? '<span class="material-icons">favorite</span>' : '<span class="material-icons">favorite_border</span>'}</button>
    `;

    // 点击隐藏横幅
    const banner = wrap.querySelector('.rec-banner');
    if (banner) banner.onclick = e => { e.stopPropagation(); banner.style.display = 'none'; };

    // 收藏按钮
    wrap.querySelector('.fav-icon').onclick = e => {
        e.stopPropagation();
        toggleFav(b.id);
        updateGallery();
    };

    // 点击卡片
    wrap.querySelector('.card').onclick = () => {
        if (batchMode) toggleBatch(b.id, wrap);
        else openModal(b);
    };

    return wrap;
}


/* ========== Modal ========== */
function openModal(b) {
    modal.dataset.id = b.id;
    modalCover.src = b.cover;
    modalCover.onclick = () => window.open(b.cover, '_blank');
    modalTitle.textContent = b.mainTitle;
    modalMeta.innerHTML = `${b.year} · ${b.episodes}话 · <span class="material-icons">star</span> ${b.rating}`;
    modalOther.textContent = b.otherTitle?.join(' / ') || '';
    modalTags.innerHTML = b.tags.map(t => `<span class='tag'>${t}</span>`).join(' ');
    modalDesc.textContent = b.desc;
    modalStatus.textContent = `状态：${b.status || '—'}`;
    syncFav();

    // ✅ 添加 Bangumi 打开按钮
    let bangumiBtn = modal.querySelector('#modal-bangumi');
    if (!bangumiBtn) {
        bangumiBtn = document.createElement('button');
        bangumiBtn.id = 'modal-bangumi';
        bangumiBtn.className = 'bangumi-btn';
        bangumiBtn.innerHTML = '<span class="material-icons">open_in_new</span> 在 Bangumi 打开';
        bangumiBtn.style.marginLeft = '8px'; // 和收藏按钮间距
        modalFavBtn.insertAdjacentElement('afterend', bangumiBtn);
    }
    bangumiBtn.onclick = () => {
        const url = `https://chii.in/subject/${b.id}`;
        window.open(url, '_blank');
    };

    modal.classList.remove('hidden');
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

/* 横向滚轮支持 */
modalTags.addEventListener('wheel', e => {
    if (e.deltaY !== 0) {
        modalTags.scrollLeft += e.deltaY * 0.5;
        e.preventDefault();
    }
});

/* ========== 批量 ========== */
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

function showBar() {
    const bar = document.createElement('div');
    bar.id = 'batchBar';
    bar.innerHTML = `
        <button id="bf" class="btn"><span class="material-icons">favorite</span> 收藏</button>
        <button id="bu" class="btn"><span class="material-icons">favorite_border</span> 取消</button>
        <button id="bs" class="btn"><span class="material-icons">tv</span> 状态</button>
        <button id="bx" class="btn"><span class="material-icons">close</span> 退出</button>
    `;
    document.body.appendChild(bar);
    bar.querySelector('#bf').onclick = () => {
        selectedIds.forEach(id => favorites.add(id));
        saveFav();
        updateGallery();
    };
    bar.querySelector('#bu').onclick = () => {
        selectedIds.forEach(id => favorites.delete(id));
        saveFav();
        updateGallery();
    };
    bar.querySelector('#bs').onclick = () => {
        showStatusModal(status => {
            ORIGINAL.forEach(b => {
                if (selectedIds.has(b.id)) b.status = status;
            });
            updateGallery();
        });
    };
    bar.querySelector('#bx').onclick = () => disableBatch();
}

/* ========== 标签自动补全搜索 ========== */
tagSearchInput.addEventListener('input', () => {
    const v = tagSearchInput.value.trim().toLowerCase();
    if (!v) {
        tagSuggestions.style.display = 'none';
        return;
    }
    const matches = allTags.filter(t => t.toLowerCase().includes(v) && !activeTags.has(t)).slice(0, 10);
    tagSuggestions.innerHTML = matches.map(t => `<div>${t}</div>`).join('');
    tagSuggestions.style.display = matches.length ? 'block' : 'none';
});
tagSuggestions.addEventListener('click', e => {
    if (e.target.tagName !== 'DIV') return;
    const tag = e.target.textContent;
    activeTags.add(tag);
    tagSearchInput.value = '';
    tagSuggestions.style.display = 'none';
    renderTagChips();
    updateGallery();
});

function renderTagChips() {
    selectedTagsRow.innerHTML = '';
    [...activeTags].forEach(t => {
        const chip = document.createElement('span');
        chip.className = 'tag-chip';
        chip.innerHTML = '<span class="material-icons">label</span> ' + t + ' <span class="material-icons">close</span>';
        chip.onclick = () => {
            activeTags.delete(t);
            renderTagChips();
            updateGallery();
        };
        selectedTagsRow.appendChild(chip);
    });
}

/* ========== 排序 / 筛选 ========== */
function currentFiltered() {
    const kw = searchInput.value.trim().toLowerCase();
    let res = [...ORIGINAL];

    // 状态筛选
    const selectedStates = statusCheckboxes.filter(ch => ch.checked).map(ch => ch.dataset.status);
    if (selectedStates.length > 0 && selectedStates.length < statusCheckboxes.length) {
        // 只有部分状态选中时才过滤
        res = res.filter(b => selectedStates.includes(b.status));
    }

    // 关键词筛选
    if (kw) res = res.filter(b =>
        b.mainTitle.toLowerCase().includes(kw) ||
        (b.otherTitle || []).some(o => o.toLowerCase().includes(kw))
    );

    // 标签筛选
    if (activeTags.size > 0) res = res.filter(b => [...activeTags].every(t => b.tags.includes(t)));

    // 排序
    switch (sortSelect.value) {
        case 'year-desc': res.sort((a, b) => b.year - a.year); break;
        case 'year-asc': res.sort((a, b) => a.year - b.year); break;
        case 'rating-desc': res.sort((a, b) => b.rating - a.rating); break;
        case 'rating-asc': res.sort((a, b) => a.rating - b.rating); break;
        default: res.sort((a, b) => collator.compare(a.mainTitle, b.mainTitle));
    }

    return res;
}

function updateGallery() {
    gallery.innerHTML = '';
    currentFiltered().forEach(b => gallery.appendChild(createCard(b)));
}

/* ========== 初始化绑定 ========== */
themeToggle.onclick = () => document.body.classList.toggle('light');
batchModeToggle.onclick = () => batchMode ? disableBatch() : enableBatch();
sortSelect.onchange = updateGallery;
searchInput.oninput = updateGallery;
statusCheckboxes.forEach(ch => ch.addEventListener('change', updateGallery));

updateGallery();
renderTagChips();