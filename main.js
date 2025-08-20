// === 可调参数 ===
const PAGE_SIZE = 12;

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

        const tagMatch =
            tags.length === 0 ||
            (it.tags || []).some(t => tags.includes(t.toLowerCase()));

        return titleMatch && tagMatch;
    }).sort((a, b) => compare(a, b, state.sortField, state.sortOrder));
}

// 渲染网格模式（cards）
function renderGrid(list, mount) {
    const row = document.createElement("div");
    row.className = "row";

    list.forEach(item => {
        const col = document.createElement("div");
        col.className = "col s12 m6 l3";
        col.innerHTML = `
      <div class="card hoverable">
        <div class="card-image waves-effect waves-block waves-light">
          <img class="activator responsive-img" src="${item.cover}" alt="${item.mainTitle}">
        </div>
        <div class="card-content">
          <span class="card-title activator grey-text text-darken-4" title="">
            ${item.mainTitle}
            <i class="material-icons right">more_vert</i>
          </span>
          <p class="grey-text" style="font-size: 0.9em; margin-bottom:6px;">
            ${(item.otherTitle || []).join(" / ")}
          </p>
          <p class="grey-text">${item.year} · ${item.episodes} 话 · ⭐ ${item.rating}</p>
          <div class="chips" style="margin-top:6px;">
            ${(item.tags || []).slice(0, 3).map(t => `<div class="chip">${t}</div>`).join("")}
          </div>
        </div>
        <div class="card-reveal">
          <span class="card-title grey-text text-darken-4">
            ${item.mainTitle}
            <i class="material-icons right">close</i>
          </span>
          <p class="grey-text">${item.desc || ""}</p>
          <p class="grey-text">状态：${item.status || "—"}</p>
        </div>
      </div>
    `;
        row.appendChild(col);
    });

    mount.appendChild(row);
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
        ${(item.otherTitle || []).join(" / ")}
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
                $('#modalTitle').textContent = data.mainTitle;
                $('#modalOther').textContent = (data.otherTitle || []).join(' / ');
                $('#modalInfo').textContent = `${data.year} · ${data.episodes} 话 · ⭐ ${data.rating}`;
                $('#modalDesc').textContent = data.desc || '—';
                modalInst.open();
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

// 渲染主流程
function render() {
    const mount = $("#contentArea");
    mount.innerHTML = "";

    const list = getFilteredSortedData();
    const total = list.length;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (state.page > pages) state.page = pages;

    const start = (state.page - 1) * PAGE_SIZE;
    const pageData = list.slice(start, start + PAGE_SIZE);

    if (state.mode === "grid") {
        renderGrid(pageData, mount);
    } else {
        renderList(pageData, mount);
    }

    renderPagination(total, PAGE_SIZE, state.page, p => {
        state.page = p;
        render();
    });
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
