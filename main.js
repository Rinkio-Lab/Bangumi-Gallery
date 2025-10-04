// === 可调参数 ===
const PAGE_SIZE = Infinity;   // 或者 Number.MAX_SAFE_INTEGER

// === 状态管理 ===
let state = {
    mode: "grid",            // "grid" 或 "list"
    search: "",
    sortField: "title",      // 保留原本排序可用字段如 rating / year
    sortOrder: "asc",
    selectedTags: [],
    page: 1
};

// 简易 DOM 查询函数
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

// 对比函数，用于排序
function compare(a, b, field, order = "asc") {
    let va = a[field], vb = b[field];
    if (typeof va === "string") va = va.toLowerCase();
    if (typeof vb === "string") vb = vb.toLowerCase();
    const res = va > vb ? 1 : va < vb ? -1 : 0;
    return order === "desc" ? -res : res;
}

// 去重函数
function uniq(arr) {
    return Array.from(new Set(arr));
}

// 打开详情模态框
let modalInst;
document.addEventListener('DOMContentLoaded', () => {
    const modalEl = document.getElementById('detailModal');
    modalInst = M.Modal.init(modalEl);
});

// 获取过滤 & 排序后的数据
function getFilteredSortedData() {
    const kw = state.search.trim().toLowerCase();
    const tags = state.selectedTags.map(t => t.toLowerCase());

    return BANGUMI_DATA.filter(it => {
        const titleMatch =
            !kw ||
            (it.mainTitle && it.mainTitle.toLowerCase().includes(kw)) ||
            (it.otherTitle || []).some(name => name.toLowerCase().includes(kw));

        // 修复标签筛选：当有标签选择时，必须匹配所有选中的标签
        const tagMatch = 
            tags.length === 0 || 
            tags.every(selectedTag => 
                (it.tags || []).some(itemTag => 
                    itemTag.toLowerCase() === selectedTag
                )
            );

        return titleMatch && tagMatch;
    }).sort((a, b) => compare(a, b, state.sortField, state.sortOrder));
}

/* 展开/折叠后通知 Masonry 重新布局 + 可选平滑滚动 */
let scrollQueued = false;
function toggleAlias(wrapper) {
  wrapper.classList.toggle('expanded');
  const grid = wrapper.closest('.grid');
  if (grid?.masonry) grid.masonry.layout();

  if (scrollQueued) return;
  scrollQueued = true;
  requestAnimationFrame(() => {
    const card = wrapper.closest('.card'); // 获取卡片元素
    const top = card.getBoundingClientRect().top + window.pageYOffset - 8;
    window.scrollTo({ top, behavior: 'smooth' });
    scrollQueued = false;
  });
}

// 工具函数：生成折叠译名
function foldAlias(otherTitle = []) {
  const text = otherTitle.join(' / ');
  if (!text) return '';
  return `
    <div class="alias-wrapper" onclick="toggleAlias(this)">
      ${text}
    </div>`;
}

// 根据屏幕宽度设置适当的列数（1-5列）
const setResponsiveColumns = () => {
  const screenWidth = window.innerWidth;
  let columnClass = '';
  
  // 根据屏幕宽度设置不同的列数
  if (screenWidth < 600) {
    // 小屏幕手机 - 1列
    columnClass = 'col s12';
  } else if (screenWidth < 768) {
    // 大屏幕手机 - 2列
    columnClass = 'col s12 m6';
  } else if (screenWidth < 992) {
    // 平板 - 3列
    columnClass = 'col s12 m6 l4';
  } else if (screenWidth < 1440) {
    // 小桌面/笔记本 - 4列
    columnClass = 'col s12 m6 l3';
  } else {
    // 大屏幕/2K及以上 - 5列
    columnClass = 'col s12 m6 l2';
  }
  
  return columnClass;
};

// 渲染网格模式（瀑布流，使用 Masonry.js）
function renderGrid(list, mount) {
  // 1. 创建容器，保留 Materialize 响应式 class，同时加上 Masonry 需要的 grid
  const row = document.createElement('div');
  row.className = 'row grid';
  row.style.margin = '0';
  row.style.padding = '0'; // 完全移除左右边距          // 去掉 Materialize 负 margin，避免偏移

  // 2. 逐个生成卡片
  list.forEach(item => {
    const col = document.createElement('div');
    // 保留响应式断点 + 加 grid-item（Masonry 识别用）
    // 使用与grid-sizer相同的响应式类
col.className = `${setResponsiveColumns()} grid-item`;

    col.innerHTML = `
      <div class="card hoverable">
        <div class="card-image waves-effect waves-block waves-light">
          <img class="activator responsive-img" src="${item.cover}" alt="${item.mainTitle}">
        </div>
        <div class="card-content">
          <span class="card-title activator grey-text" title="">
            ${item.mainTitle}
            <i class="material-icons right">more_vert</i>
          </span>
          <p class="grey-text" style="font-size: 0.9em; margin-bottom:6px;">
            ${foldAlias(item.otherTitle)}
          </p>
          <p class="grey-text">${item.year} · ${item.episodes} 话 · ⭐ ${item.rating}</p>
          <div class="chips" style="margin-top:6px;">
            ${(item.tags || []).slice(0, 3).map(t => `<div class="chip">${t}</div>`).join('')}
          </div>
        </div>
        <div class="card-reveal">
          <span class="card-title grey-text">
            ${item.mainTitle}
            <i class="material-icons right">close</i>
          </span>
          <p class="grey-text">${item.desc || ''}</p>
          <p class="grey-text">状态：${item.status || '—'}</p>
        </div>
      </div>
    `;
    row.appendChild(col);
  });

  mount.appendChild(row);

  // 3. 初始化 Masonry 瀑布流
  
  // 先添加一个网格大小基准元素
  const sizer = document.createElement('div');
  sizer.className = `grid-sizer ${setResponsiveColumns()}`;
  row.prepend(sizer);

  // 确保容器有足够的宽度
  row.style.width = '100%';
  
  // eslint-disable-next-line no-undef
  const msnry = new Masonry(row, {
    itemSelector: '.grid-item',
    gutter: 16,          // 列间距（px）
    fitWidth: false,     // 不使用fitWidth，使用100%宽度
    transitionDuration: '0.2s',
    columnWidth: '.grid-sizer',  // 使用列宽基准元素
    percentPosition: true        // 使用百分比定位
  });

  row.masonry = msnry;
  
  // 监听窗口大小变化，重新设置列数
  window.addEventListener('resize', () => {
    // 更新网格大小基准元素的类
    const gridSizer = row.querySelector('.grid-sizer');
    if (gridSizer) {
      gridSizer.className = `grid-sizer ${setResponsiveColumns()}`;
      // 强制重新布局
      if (msnry) msnry.layout();
    }
  });
  
  // 强制重新布局
  setTimeout(() => {
    if (msnry) msnry.layout();
  }, 100);

  // 4. 图片加载完后重新布局（防止图片未加载完导致错位）
  row.addEventListener('load', (e) => {
    if (e.target.tagName === 'IMG') msnry.layout();
  }, true);
}

// 渲染列表模式（collections）
function renderList(list, mount) {
    const ul = document.createElement("ul");
    ul.className = "collection";

    list.forEach(item => {
        const li = document.createElement("li");
        li.className = "collection-item avatar";
        li.innerHTML = `
      <img src="${item.cover}" alt="${item.mainTitle}" class="circle">
      <span class="title"><strong>${item.mainTitle}</strong></span>
      <p style="font-size:0.9em;">
        ${foldAlias(item.otherTitle)}
      </p>
      <p class="grey-text">
        ${item.year} · ${item.episodes} 话 · ⭐ ${item.rating}
      </p>
      <div>
        ${(item.tags || []).map(t => `<div class="chip">${t}</div>`).join(" ")}
      </div>
      <a href="#!" class="secondary-content detail-btn" title="详情" data-id="${item.id}">
        <i class="material-icons">info_outline</i>
      </a>
    `;

        // 获取到按钮后才绑定事件
        const btn = li.querySelector('.detail-btn');
                if (btn) {
                    btn.addEventListener('click', () => {
                        const data = BANGUMI_DATA.find(x => x.id === item.id);
                        const modalTitle = $('#modalTitle');
                        const modalOther = $('#modalOther');
                        const modalInfo = $('#modalInfo');
                        const modalDesc = $('#modalDesc');
                        
                        if (modalTitle) modalTitle.textContent = data.mainTitle;
                        if (modalOther) modalOther.textContent = (data.otherTitle || []).join(' / ');
                        if (modalInfo) modalInfo.textContent = `${data.year} · ${data.episodes} 话 · ⭐ ${data.rating}`;
                        if (modalDesc) modalDesc.textContent = data.desc || '—';
                        
                        if (modalInst) modalInst.open();
                    });
                }

        ul.appendChild(li);
    });

    mount.appendChild(ul);
}

// 渲染分页按钮
function renderPagination(total, pageSize, current, onGoto) {
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const pag = $("#pagination");
    pag.innerHTML = "";

    function mkLi(label, page, disabled = false, active = false, icon = null) {
        const li = document.createElement("li");
        li.className = disabled ? "disabled" : active ? "active teal" : "waves-effect";
        const a = document.createElement("a");
        a.href = "#!";
        a.setAttribute("aria-label", label);
        a.innerHTML = icon ? `<i class="material-icons">${icon}</i>` : `${label}`;
        if (!disabled && !active) {
            a.addEventListener("click", () => onGoto(page));
        }
        li.appendChild(a);
        return li;
    }

    pag.appendChild(mkLi("上一页", Math.max(1, current - 1), current === 1, false, "chevron_left"));

    const windowSize = 5;
    const start = Math.max(1, current - Math.floor(windowSize / 2));
    const end = Math.min(pages, start + windowSize - 1);
    for (let p = start; p <= end; p++) {
        pag.appendChild(mkLi(`第 ${p} 页`, p, false, p === current, null));
    }

    pag.appendChild(mkLi("下一页", Math.min(pages, current + 1), current === pages, false, "chevron_right"));
}

// 主渲染：一次性输出全部卡片（无分页）
function render() {
  const mount = $('#contentArea');
  mount.innerHTML = '';

  // 获取过滤+排序后的完整数据
  const list = getFilteredSortedData();

  // 整批渲染
  if (state.mode === 'grid') {
    renderGrid(list, mount);
  } else {
    renderList(list, mount);
  }

  // 清空分页控件
  // $('#pagination').innerHTML = '';
}

// 初始化控件与事件
document.addEventListener("DOMContentLoaded", () => {
    // 初始化 Materialize 选择器
    const elems = document.querySelectorAll('select');
    M.FormSelect.init(elems);

    // 模式按钮逻辑
    const gridBtn = document.getElementById("gridBtn");
    const listBtn = document.getElementById("listBtn");

    function updateModeUI() {
        // 互斥：只有当前模式按钮带 active-mode
        const isGrid = state.mode === "grid";
        gridBtn.classList.toggle("active-mode", isGrid);
        listBtn.classList.toggle("active-mode", !isGrid);
    }

    // 点击绑定
    gridBtn.addEventListener("click", () => {
        if (state.mode !== "grid") {
            state.mode = "grid";
            state.page = 1;
            updateModeUI();
            render();
        }
    });

    listBtn.addEventListener("click", () => {
        if (state.mode !== "list") {
            state.mode = "list";
            state.page = 1;
            updateModeUI();
            render();
        }
    });

    // 初始化一次（开始时网格亮）
    updateModeUI();

    // 搜索输入事件
    $("#searchInput").addEventListener("input", e => {
        state.search = e.target.value;
        state.page = 1;
        render();
    });

    // 排序字段与方向事件
    $("#sortField").addEventListener("change", e => {
        state.sortField = e.target.value;
        state.page = 1;
        render();
    });
    $("#sortOrder").addEventListener("change", e => {
        state.sortOrder = e.target.value;
        state.page = 1;
        render();
    });

    // 标签 Chips 初始化与同步
    const allTags = uniq(BANGUMI_DATA.flatMap(it => it.tags || [])).sort((a, b) => a.localeCompare(b));
    const chipEl = $("#tagChips");
    const chipInst = M.Chips.init(chipEl, {
        placeholder: "添加标签筛选…",
        secondaryPlaceholder: "标签…",
        autocompleteOptions: {
            data: Object.fromEntries(allTags.map(t => [t, null])),
            limit: Infinity,
            minLength: 0
        },
        onChipAdd: syncChips,
        onChipDelete: syncChips
    });

    chipEl.addEventListener("click", () => chipEl.querySelector("input")?.focus());

    function syncChips() {
        state.selectedTags = chipInst.chipsData.map(c => c.tag);
        state.page = 1;
        render();
    }

    // 首次渲染
    render();
});
