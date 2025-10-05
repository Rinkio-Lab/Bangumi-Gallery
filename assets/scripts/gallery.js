const gallery = document.getElementById('gallery');
const ORIGINAL = BANGUMI_DATA.map(x => ({...x}));
let favorites = new Set(JSON.parse(localStorage.getItem('rin_favs') || '[]'));

function saveFav() {
    localStorage.setItem('rin_favs', JSON.stringify([...favorites]));
}

//切换指定ID的收藏状态
function toggleFav(id) {
    favorites.has(id) ? favorites.delete(id) : favorites.add(id);
    saveFav();
}

// 将字符串中的特殊HTML字符进行转义，以防止XSS攻击
function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[c]));
}

/**
 * 创建一个卡片元素，用于展示动画/番剧信息
 * @param {Object} b - 包含番剧信息的对象
 * @param {string} b.id - 番剧的唯一标识符
 * @param {string} b.cover - 番剧封面的图片URL
 * @param {string} b.mainTitle - 番剧的主标题
 * @param {number} b.year - 番剧的播出年份
 * @param {number} b.rating - 番剧的评分
 * @param {number} b.episodes - 番剧的集数
 * @param {Array<string>} b.tags - 番剧的标签数组
 * @param {string} b.status - 番剧的状态（unprepared/watching/finished/abandoned/planned）
 * @param {boolean} [b.isRecommended=false] - 是否为推荐番剧
 * @returns {HTMLDivElement} 返回创建的卡片元素
 */

// 卡片配置常量
const CARD_CONFIG = {
    className: 'card-wrapper',
    recommended: {
        outline: '5px solid var(--accent-two)',
        outlineOffset: '3px',
        borderRadius: '12px',
        banner: {
            position: 'absolute',
            top: '8px',
            left: '8px',
            backgroundColor: 'var(--accent)',
            color: 'white',
            padding: '2px 6px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            zIndex: '10',
            text: '强推'
        }
    },
    status: {
        unprepared: { icon: 'help', text: '未分类/未准备', style: 'font-size: 12px; margin-left: 4px;' },
        watching: { icon: 'tv' },
        finished: { icon: 'check' },
        abandoned: { icon: 'block' },
        planned: { icon: 'schedule' }
    },
    rating: {
        high: 8,
        icon: 'star'
    },
    favorite: {
        active: 'favorite',
        inactive: 'favorite_border'
    },
    metaSeparator: ' · ',
    maxTags: 4
};

// 创建徽章元素
function createBadge(config) {
    const fragment = document.createDocumentFragment();
    
    const icon = document.createElement('span');
    icon.className = 'material-icons';
    icon.textContent = config.icon;
    fragment.appendChild(icon);
    
    if (config.text) {
        const text = document.createElement('span');
        if (config.style) text.style.cssText = config.style;
        text.textContent = config.text;
        fragment.appendChild(text);
    }
    
    return fragment;
}

// 创建推荐横幅
function createRecommendedBanner() {
    const banner = document.createElement('div');
    banner.className = 'rec-banner';
    Object.assign(banner.style, CARD_CONFIG.recommended.banner);
    banner.textContent = CARD_CONFIG.recommended.banner.text;
    return banner;
}

// 创建标签元素
function createTagElement(tag) {
    const span = document.createElement('span');
    span.className = 'tag';
    span.textContent = tag;
    return span;
}

// 创建卡片主体
function createCardBody(data) {
    const body = document.createElement('div');
    body.className = 'card-body';
    
    // 标题
    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = data.mainTitle;
    body.appendChild(title);
    
    // 元信息
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = [
        data.year,
        data.rating,
        `${data.episodes}话`
    ].join(CARD_CONFIG.metaSeparator);
    body.appendChild(meta);
    
    // 标签
    const tags = document.createElement('div');
    tags.className = 'tags';
    data.tags.slice(0, CARD_CONFIG.maxTags).forEach(tag => {
        tags.appendChild(createTagElement(tag));
    });
    body.appendChild(tags);
    
    // 徽章
    const badges = document.createElement('div');
    badges.className = 'badges';
    
    // 收藏徽章
    if (favorites.has(data.id)) {
        badges.appendChild(createBadge({ icon: CARD_CONFIG.favorite.active }));
    }
    
    // 高分徽章
    if (data.rating >= CARD_CONFIG.rating.high) {
        badges.appendChild(createBadge({ icon: CARD_CONFIG.rating.icon }));
    }
    
    // 状态徽章
    const statusConfig = CARD_CONFIG.status[data.status];
    if (statusConfig) {
        badges.appendChild(createBadge(statusConfig));
    }
    
    body.appendChild(badges);
    return body;
}

// 创建卡片
function createCard(data) {
    try {
        // 验证输入数据
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid card data');
        }
        
        // 创建包装器
        const wrap = document.createElement('div');
        wrap.className = CARD_CONFIG.className;
        wrap.dataset.id = data.id;
        
        // 设置推荐样式
        if (data.isRecommended) {
            Object.assign(wrap.style, {
                outline: CARD_CONFIG.recommended.outline,
                outlineOffset: CARD_CONFIG.recommended.outlineOffset,
                borderRadius: CARD_CONFIG.recommended.borderRadius
            });
        }
        
        // 创建卡片内容
        const card = document.createElement('div');
        card.className = 'card';
        
        // 创建封面包装器
        const coverWrapper = document.createElement('div');
        coverWrapper.className = 'cover-wrapper';
        coverWrapper.style.position = 'relative';
        
        // 创建封面图片
        const img = document.createElement('img');
        img.src = 'assets/loading.gif';
        img.dataset.src = data.cover;
        img.className = 'cover-img lazy';
        coverWrapper.appendChild(img);
        
        // 添加推荐横幅
        if (data.isRecommended) {
            coverWrapper.appendChild(createRecommendedBanner());
        }
        
        card.appendChild(coverWrapper);
        card.appendChild(createCardBody(data));
        wrap.appendChild(card);
        
        // 创建收藏按钮
        const favButton = document.createElement('button');
        favButton.className = 'fav-icon';
        const favIcon = document.createElement('span');
        favIcon.className = 'material-icons';
        favIcon.textContent = favorites.has(data.id) 
            ? CARD_CONFIG.favorite.active 
            : CARD_CONFIG.favorite.inactive;
        favButton.appendChild(favIcon);
        wrap.appendChild(favButton);
        
        // 添加事件监听
        favButton.onclick = e => {
            e.stopPropagation();
            toggleFav(data.id);
            updateGallery();
        };
        
        card.onclick = () => {
            if (batchMode) toggleBatch(data.id, wrap);
            else openModal(data);
        };
        
        return wrap;
    } catch (error) {
        console.error('Error creating card:', error);
        return null;
    }
}

function updateGallery() {
    gallery.innerHTML = '';
    const filtered = currentFiltered();
    filtered.forEach(b => gallery.appendChild(createCard(b)));
    updateFooterStats(filtered);
    lazyLoad();
}

console.log('%c[2/8]%c Gallery script loaded.', styles.step, styles.info);