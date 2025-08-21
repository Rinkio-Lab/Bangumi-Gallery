#!/usr/bin/env python3
# coding: utf-8
"""
bangumi_importer.py - 从 chii.in(bangumi) 的 subject 页面抓取信息，输出可粘贴到 HTML 的 JS 段
用法:
  uv add requests beautifulsoup4
  python .\bangumi_importer.py https://chii.in/subject/9912
或者:
  python .\bangumi_importer.py 9912
输出示例:
  // 由 bangumi_importer.py 生成
  const BANGUMI_DATA = [ ... ];
"""

from typing import List, Dict, Optional
import sys
import re
import json
import requests
from bs4 import BeautifulSoup

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible)"}


def fetch_html(url: str) -> str:
    """请求页面并返回 HTML 文本（设置合理编码）"""
    r = requests.get(url, headers=HEADERS, timeout=15)
    r.raise_for_status()
    # 让 requests 尽量用推断编码
    r.encoding = r.apparent_encoding or r.encoding or "utf-8"
    return r.text


def text_excluding_label(li) -> str:
    """取 li 中除去 <span class='tip'> 标签文本后的其它文本（把碎片拼接成单行）"""
    label_span = li.find("span", class_="tip")
    label_text = label_span.get_text(strip=True) if label_span else None
    parts = []
    for s in li.stripped_strings:
        # 跳过 label 本身
        if label_text and s.strip() == label_text:
            continue
        # 去掉 '：' 或 '：' 形式残留
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


def parse_subject(url_or_id: str) -> Dict:
    """根据 URL 或 ID 抓取并解析数据，返回一个 dict"""
    # 允许直接传 9912 或 完整 url
    if re.match(r"^\d+$", url_or_id):
        url = f"https://chii.in/subject/{url_or_id}"
        subject_id = url_or_id
    else:
        url = url_or_id
        m = re.search(r"/subject/(\d+)", url)
        subject_id = m.group(1) if m else url

    html = fetch_html(url)
    soup = BeautifulSoup(html, "html.parser")

    # --- 标题（按你要求使用选择器） ---
    main_title_el = soup.select_one("#headerSubject > h1 > a")
    if not main_title_el:
        # 兼容回退
        main_title_el = soup.select_one("h1.nameSingle a")
    main_title = main_title_el.get_text(strip=True) if main_title_el else ""

    # --- 简介（#subject_summary） ---
    desc_el = soup.select_one("#subject_summary")
    desc = desc_el.get_text(" ", strip=True) if desc_el else ""

    # --- 封面（infobox 的图片） ---
    cover = ""
    cover_el = soup.select_one("#bangumiInfo .infobox img") or soup.select_one(".infobox img")
    if cover_el and cover_el.get("src"):
        cover = cover_el.get("src").strip()
        # 完整化 protocol-relative URL
        if cover.startswith("//"):
            cover = "https:" + cover

    # --- 评分（优先 .global_score .number） ---
    rating = None
    score_el = soup.select_one(".global_score .number") or soup.select_one(".global_rating .number") or soup.select_one(".global_score") or soup.select_one(".global_rating")
    if score_el:
        txt = score_el.get_text(" ", strip=True)
        m = re.search(r"(\d+(?:\.\d+)?)", txt)
        if m:
            try:
                rating = float(m.group(1))
            except:
                rating = None

    # --- infobox 中的字段：话数 / 放送开始（取年份） / 中文名 / 别名 ---
    year = None
    episodes = None
    chinese_name = None
    # 遍历 infobox li 来解析字段（不使用 :contains）
    for li in soup.select("#infobox li"):
        tip = li.find("span", class_="tip")
        tip_text = tip.get_text(strip=True) if tip else ""
        val = text_excluding_label(li)
        if "话数" in tip_text:
            m = re.search(r"(\d+)", val)
            if m:
                episodes = int(m.group(1))
        elif "放送开始" in tip_text or "首播" in tip_text:
            m = re.search(r"(\d{4})", val)
            if m:
                year = int(m.group(1))
        elif "中文名" in tip_text:
            chinese_name = val or None

    # 别名：infobox 内的 sub_container 中的 li
    other_titles: List[str] = []
    if chinese_name:
        other_titles.append(chinese_name)

    for sub_li in soup.select("#infobox .sub_container ul li"):
        # 每个 li 可能是 "别名: Nichijou" 或 "にちじょう"
        txt = sub_li.get_text(" ", strip=True)
        # 去掉可能的前缀 "别名:" 或 "别名"
        txt = re.sub(r"^\s*别名[:：]?\s*", "", txt)
        txt = txt.strip()
        if txt:
            other_titles.append(txt)

    other_titles = unique_preserve_order(other_titles)

    # --- 标签：.subject_tag_section .inner a 只取 <span> 的文本（去掉 small 的人数） ---
    tags = []
    for a in soup.select(".subject_tag_section .inner a"):
        span = a.find("span")
        if span:
            t = span.get_text(" ", strip=True)
        else:
            # 兜底：删掉尾部数字（人数）
            t = a.get_text(" ", strip=True)
            t = re.sub(r"\s*\d+\s*$", "", t)
        t = t.strip()
        if t:
            tags.append(t)
    tags = unique_preserve_order(tags)

    # --- 最终组装 ---
    data = {
        "id": subject_id,
        "mainTitle": main_title,
        "otherTitle": other_titles,
        "year": year or 0,
        "episodes": episodes or 0,
        "rating": rating if rating is not None else None,
        "tags": tags,
        "cover": cover,
        "status": "planned",
        "desc": desc,
    }
    return data


def to_js_snippet(obj: Dict) -> str:
    """把数据输出成 JS 段，可直接粘到网页的导入框"""
    arr = [obj]
    # 用 JSON（键被引号包围）是兼容的：浏览器 eval/JSON.parse 都能处理
    json_str = json.dumps(arr, ensure_ascii=False, indent=2)
    header = "// 由 bangumi_importer.py 生成\n"
    return header + "const BANGUMI_DATA = " + json_str + ";"


def main():
    if len(sys.argv) < 2:
        print("用法: python bangumi_importer.py <subject url or id>")
        print("示例: python bangumi_importer.py https://chii.in/subject/9912")
        return
    arg = sys.argv[1].strip()
    try:
        data = parse_subject(arg)
    except Exception as e:
        print("抓取或解析失败：", e)
        raise

    # print(to_js_snippet(data))
    import pyperclip as clipboard

    clipboard.copy(to_js_snippet(data))
    print("数据已复制到剪贴板。请粘贴到网页的导入框中。")
    # 另打印 JSON 备份（可重定向到文件）
    # print(json.dumps(data, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
