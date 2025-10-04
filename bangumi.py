#!/usr/bin/env python3
# coding: utf-8
"""
bangumi_importer.py - 支持搜索、选择、状态交互的 bangumi 导入工具
依赖：
    uv add requests beautifulsoup4 questionary pyperclip
"""

from typing import List, Dict
import sys, re, json, requests
from bs4 import BeautifulSoup
import questionary
import pyperclip

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible)"}

# 全局状态选项
STATUS_OPTIONS = ["unprepared", "planned", "watching", "abandoned", "finished"]


def fetch_html(url: str) -> str:
    r = requests.get(url, headers=HEADERS, timeout=15)
    r.raise_for_status()
    r.encoding = r.apparent_encoding or r.encoding or "utf-8"
    return r.text


def text_excluding_label(li) -> str:
    label_span = li.find("span", class_="tip")
    label_text = label_span.get_text(strip=True) if label_span else None
    parts = []
    for s in li.stripped_strings:
        if label_text and s.strip() == label_text:
            continue
        if s.strip() in (":", "："):
            continue
        parts.append(s.strip())
    return " ".join(parts).strip()


def unique_preserve_order(seq: List[str]) -> List[str]:
    seen = set()
    out = []
    for s in seq:
        if s and s not in seen:
            seen.add(s)
            out.append(s)
    return out


def parse_subject(url_or_id: str, status: str = "planned") -> Dict:
    if re.match(r"^\d+$", url_or_id):
        url = f"https://chii.in/subject/{url_or_id}"
        subject_id = url_or_id
    else:
        url = url_or_id
        m = re.search(r"/subject/(\d+)", url)
        subject_id = m.group(1) if m else url

    html = fetch_html(url)
    soup = BeautifulSoup(html, "html.parser")

    main_title_el = soup.select_one("#headerSubject > h1 > a") or soup.select_one(
        "h1.nameSingle a"
    )
    main_title = main_title_el.get_text(strip=True) if main_title_el else ""

    desc_el = soup.select_one("#subject_summary")
    desc = desc_el.get_text(" ", strip=True) if desc_el else ""

    cover_el = soup.select_one("#bangumiInfo .infobox img") or soup.select_one(
        ".infobox img"
    )
    cover = cover_el.get("src").strip() if cover_el and cover_el.get("src") else ""
    if cover.startswith("//"):
        cover = "https:" + cover

    rating = None
    score_el = (
        soup.select_one(".global_score .number")
        or soup.select_one(".global_rating .number")
        or soup.select_one(".global_score")
        or soup.select_one(".global_rating")
    )
    if score_el:
        m = re.search(r"(\d+(?:\.\d+)?)", score_el.get_text(" ", strip=True))
        if m:
            try:
                rating = float(m.group(1))
            except:
                rating = None

    year = None
    episodes = None
    chinese_name = None
    for li in soup.select("#infobox li"):
        tip_text = (
            li.find("span", class_="tip").get_text(strip=True)
            if li.find("span", class_="tip")
            else ""
        )
        val = text_excluding_label(li)
        if "话数" in tip_text:
            m = re.search(r"(\d+)", val)
            episodes = int(m.group(1)) if m else None
        elif "放送开始" in tip_text or "首播" in tip_text:
            m = re.search(r"(\d{4})", val)
            year = int(m.group(1)) if m else None
        elif "中文名" in tip_text:
            chinese_name = val or None

    other_titles: List[str] = []
    if chinese_name:
        other_titles.append(chinese_name)
    for sub_li in soup.select("#infobox .sub_container ul li"):
        txt = sub_li.get_text(" ", strip=True)
        txt = re.sub(r"^\s*别名[:：]?\s*", "", txt).strip()
        if txt:
            other_titles.append(txt)
    other_titles = unique_preserve_order(other_titles)

    tags = []
    for a in soup.select(".subject_tag_section .inner a"):
        span = a.find("span")
        t = (
            span.get_text(" ", strip=True)
            if span
            else re.sub(r"\s*\d+\s*$", "", a.get_text(" ", strip=True)).strip()
        )
        if t:
            tags.append(t)
    tags = unique_preserve_order(tags)

    data = {
        "id": subject_id,
        "mainTitle": main_title,
        "otherTitle": other_titles,
        "year": year or 0,
        "episodes": episodes or 0,
        "rating": rating if rating is not None else None,
        "tags": tags,
        "cover": cover,
        "status": status,
        "desc": desc,
    }
    return data


def search_subject(keyword: str) -> List[Dict]:
    """根据关键词搜索 bangumi，返回列表 [{'id':..., 'title':..., 'subtitle':...}]"""
    url = f"https://chii.in/subject_search/{keyword}?cat=2"
    html = fetch_html(url)
    soup = BeautifulSoup(html, "html.parser")
    results = []
    for li in soup.select("#browserItemList li.item"):
        a_main = li.select_one("h3 a.l")
        a_sub = li.select_one("h3 small.grey")
        if a_main:
            results.append(
                {
                    "id": re.search(r"/subject/(\d+)", a_main.get("href")).group(1),
                    "title": a_main.get_text(strip=True),
                    "subtitle": a_sub.get_text(strip=True) if a_sub else "",
                }
            )
    return results


def to_js_snippet(obj: Dict) -> str:
    arr = [obj]
    json_str = json.dumps(arr, ensure_ascii=False, indent=2)
    return "// 由 bangumi_importer.py 生成\nconst BANGUMI_DATA = " + json_str + ";"


def main():
    # 1. 输入关键词
    keyword = questionary.text("请输入搜索关键词（Bangumi 名称）:").ask()
    if not keyword:
        print("未输入关键词，退出。")
        return

    # 2. 搜索结果选择
    results = search_subject(keyword)
    if not results:
        print("未找到任何结果。")
        return
    choices = [f"{r['title']} ({r['subtitle']}) [ID:{r['id']}]" for r in results]
    selected = questionary.select("请选择要导入的作品:", choices=choices).ask()
    # 提取 ID
    selected_id = re.search(r"ID:(\d+)", selected).group(1)

    # 3. 状态选择
    status = questionary.select(
        "请选择状态:", choices=STATUS_OPTIONS, default="unprepared"
    ).ask()

    # 4. 抓取并生成 JS
    data = parse_subject(selected_id, status=status)
    pyperclip.copy(to_js_snippet(data))
    print(f"数据已复制到剪贴板，状态为 '{status}'。请粘贴到网页的导入框中。")


if __name__ == "__main__":
    while True:
        try:
            main()

        # requests.exceptions.ConnectionError: ('Connection aborted.', ConnectionResetError(10054, '远程主机强迫关闭了一个现有的连接。', None, 10054, None))
        except requests.exceptions.RequestException as e:
            print(f"网络请求错误: {e}")
            print("请检查网络连接，稍后重试。\n可能是网络问题或访问过于频繁。")
            retry = questionary.confirm("是否重试？").ask()
            if not retry:
                break

        except KeyboardInterrupt:
            print("\n用户中断，退出。")
            break
