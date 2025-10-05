const searchInput = document.getElementById('searchInput');
const tagSearchInput = document.getElementById('tagSearchInput');
const tagSuggestions = document.getElementById('tagSuggestions');
const sortSelect = document.getElementById('sortSelect');
const selectedTagsRow = document.getElementById('selectedTags');
const statusCheckboxes = Array.from(document.querySelectorAll('.status-filters input'));
const footer = document.createElement('footer');
let activeTags = new Set();
const collator = new Intl.Collator(['ja-JP'], {
    usage: 'sort',
    numeric: true,
    sensitivity: 'variant'
});
const allTags = [...new Set(ORIGINAL.flatMap(b => b.tags))].sort((a, b) => collator.compare(a, b));

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

// 标签芯片配置常量
const TAG_CHIP_CONFIG = {
    className: 'tag-chip',
    iconClass: 'material-icons',
    labelIcon: 'label',
    closeIcon: 'close'
};

// 创建标签芯片元素
function createTagChip(tag) {
    const chip = document.createElement('span');
    chip.className = TAG_CHIP_CONFIG.className;
    
    // 使用安全的DOM操作创建内容
    const labelIcon = document.createElement('span');
    labelIcon.className = TAG_CHIP_CONFIG.iconClass;
    labelIcon.textContent = TAG_CHIP_CONFIG.labelIcon;
    
    const tagText = document.createTextNode(' ' + tag + ' ');
    
    const closeIcon = document.createElement('span');
    closeIcon.className = TAG_CHIP_CONFIG.iconClass;
    closeIcon.textContent = TAG_CHIP_CONFIG.closeIcon;
    
    chip.appendChild(labelIcon);
    chip.appendChild(tagText);
    chip.appendChild(closeIcon);
    
    // 使用事件委托处理点击
    chip.dataset.tag = tag;
    
    return chip;
}

// 更新标签芯片显示
function renderTagChips() {
    // 清空容器
    while (selectedTagsRow.firstChild) {
        selectedTagsRow.removeChild(selectedTagsRow.firstChild);
    }
    
    // 创建文档片段减少重排
    const fragment = document.createDocumentFragment();
    
    // 添加所有标签芯片
    activeTags.forEach(tag => {
        fragment.appendChild(createTagChip(tag));
    });
    
    // 一次性添加到DOM
    selectedTagsRow.appendChild(fragment);
}

// 处理标签删除
function handleTagClick(event) {
    const chip = event.target.closest(`.${TAG_CHIP_CONFIG.className}`);
    if (!chip) return;
    
    const tag = chip.dataset.tag;
    if (tag && activeTags.has(tag)) {
        activeTags.delete(tag);
        renderTagChips();
        updateGallery();
    }
}

// 初始化事件委托
selectedTagsRow.addEventListener('click', handleTagClick);


function currentFiltered() {
    const keyword = searchInput.value.trim().toLowerCase();
    const selectedStates = new Set(
        statusCheckboxes
            .filter(checkbox => checkbox.checked)
            .map(checkbox => checkbox.dataset.status)
    );
    const activeTagsSet = new Set(activeTags);
    const sortType = sortSelect.value;

    return ORIGINAL.filter(item => {
        // 状态筛选
        if (selectedStates.size > 0 && selectedStates.size < statusCheckboxes.length) {
            if (!selectedStates.has(item.status)) return false;
        }

        // 关键词搜索
        if (keyword) {
            const mainTitleMatch = item.mainTitle.toLowerCase().includes(keyword);
            const otherTitleMatch = (item.otherTitle || []).some(
                other => other.toLowerCase().includes(keyword)
            );
            if (!mainTitleMatch && !otherTitleMatch) return false;
        }

        // 标签筛选
        if (activeTagsSet.size > 0) {
            const itemTags = new Set(item.tags);
            if (![...activeTagsSet].every(tag => itemTags.has(tag))) return false;
        }

        return true;
    }).sort((a, b) => {
        switch (sortType) {
            case 'year-desc': return b.year - a.year;
            case 'year-asc': return a.year - b.year;
            case 'rating-desc': return b.rating - a.rating;
            case 'rating-asc': return a.rating - b.rating;
            default: return collator.compare(a.mainTitle, b.mainTitle);
        }
    });
}


// 状态配置常量
const STATUS_CONFIG = {
    unprepared: { icon: 'hourglass_empty', label: '未准备' },
    planned: { icon: 'event', label: '计划看' },
    watching: { icon: 'tv', label: '在看' },
    abandoned: { icon: 'cancel', label: '已放弃' },
    finished: { icon: 'check_circle', label: '已完成' }
};

// 缓存counts计算结果
let cachedCounts = null;
let lastOriginalLength = 0;

function updateFooterStats(list) {
    const footer = document.querySelector('footer');
    if (!footer || !Array.isArray(list)) return;

    const total = ORIGINAL.length;
    const showing = list.length;

    // 只有当ORIGINAL数组长度变化时才重新计算counts
    if (lastOriginalLength !== total) {
        cachedCounts = Object.keys(STATUS_CONFIG).reduce((acc, status) => {
            acc[status] = ORIGINAL.filter(item => item.status === status).length;
            return acc;
        }, {});
        lastOriginalLength = total;
    }

    // 使用DOM API而不是innerHTML
    const statsDiv = document.createElement('div');
    statsDiv.className = 'footer-stats';
    
    const metaDiv = document.createElement('div');
    metaDiv.className = 'footer-meta';

    // 构建统计信息
    const statsContent = [
        createIconElement('bar_chart'),
        document.createTextNode(`当前展示：${showing} / 全部：${total}`)
    ];

    // 添加各状态统计
    Object.entries(STATUS_CONFIG).forEach(([status, config]) => {
        const statusIcon = createIconElement(config.icon, `status-icon ${status}`);
        statsContent.push(
            document.createTextNode(' ｜ '),
            statusIcon,
            document.createTextNode(` ${cachedCounts[status]}`)
        );
    });

    // 构建元信息
    const metaContent = [
        createIconElement('copyright'),
        document.createTextNode(' 2025 LimeBow Studios')
    ];

    // 添加到DOM
    statsContent.forEach(node => statsDiv.appendChild(node));
    metaContent.forEach(node => metaDiv.appendChild(node));
    
    footer.innerHTML = '';
    footer.appendChild(statsDiv);
    footer.appendChild(metaDiv);
}

// 辅助函数：创建图标元素
function createIconElement(iconName, className = '') {
    const icon = document.createElement('span');
    icon.className = `material-icons ${className}`.trim();
    icon.textContent = iconName;
    return icon;
}


sortSelect.onchange = updateGallery;
searchInput.oninput = updateGallery;
statusCheckboxes.forEach(ch => ch.addEventListener('change', updateGallery));

console.log('%c[5/8]%c Filter script loaded.', styles.step, styles.info);