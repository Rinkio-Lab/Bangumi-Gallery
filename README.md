# Bangumi Gallery

一个使用 Materialize CSS 构建的番剧展示页面，支持**网格 / 列表**切换、**搜索 / 排序 / 标签筛选 / 分页**与 **深色 / 浅色**主题切换。

## 功能亮点

- **两种展示模式**：网格卡片 (Grid) 与列表 (List)
- **多方式搜索**：支持主标题、其他译名与标签搜索
- **排序与分页**：支持按标题、评分、年份、话数排序，分页展示
- **标签筛选**、**详情弹窗**
- **深色 / 浅色主题切换**，支持系统主题偏好与 URL 参数记忆

## 如何运行

```bash
# 克隆项目
git clone <repository-url>
cd <project-folder>

# 打开 index.html 即可运行
````

或使用本地静态服务器（如 VSCode Live Server）

## 项目结构

```
├── index.html
├── main.css
├── main.js
├── assets/
│   ├── bangumi.js
│   ├── posters/…
│   └── materialize.min.css/js
└── README.md
```

## 主题控制方式

* 页面首次加载依据系统偏好或 `?theme=` 参数设置主题
* 点击主题切换会更新图标，添加淡入过渡动画
* 通过 URL 参数 `?theme=dark` 或 `?theme=light` 引导主题展示

---

## 作者

由 **Rinkio-Lab** 制作

欢迎提交 issue 与 pull request 进一步优化体验，谢谢支持！

