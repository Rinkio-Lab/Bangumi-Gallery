#!/usr/bin/env python3
# coding: utf-8
"""
bangumi_importer.py - 支持搜索、选择、状态交互的 bangumi 导入工具
依赖：
    uv add requests beautifulsoup4 questionary pyperclip
"""

from typing import List, Dict, Optional
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

def extract_basic_info(soup: BeautifulSoup) -> tuple:
    """
    提取基本信息：标题、描述和封面
    
    Args:
        soup: BeautifulSoup对象
    
    Returns:
        包含标题、描述和封面的元组
    """
    # 提取标题
    main_title_el = soup.select_one("#headerSubject > h1 > a") or soup.select_one(
        "h1.nameSingle a"
    )
    main_title = main_title_el.get_text(strip=True) if main_title_el else ""

    # 提取描述
    desc_el = soup.select_one("#subject_summary")
    desc = desc_el.get_text(" ", strip=True) if desc_el else ""

    # 提取封面
    cover_el = soup.select_one("#bangumiInfo .infobox img") or soup.select_one(
        ".infobox img"
    )
    cover = ""
    if cover_el:
        src = cover_el.get("src")
        if src:
            cover = src.strip() # type: ignore
    if cover.startswith("//"):
        cover = "https:" + cover


    return main_title, desc, cover

def extract_rating(soup: BeautifulSoup) -> float:
    """
    提取评分信息
    
    Args:
        soup: BeautifulSoup对象
    
    Returns:
        评分值，如果无法提取则返回None
    """
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
                return float(m.group(1))
            except:
                return 0.0
    return 0.0

def extract_details(soup: BeautifulSoup) -> tuple:
    """
    提取详细信息：年份、集数、中文名
    
    Args:
        soup: BeautifulSoup对象
    
    Returns:
        包含年份、集数和中文名的元组
    """
    year = None
    episodes = None
    chinese_name = None

    for li in soup.select("#infobox li"):
        tip_span = li.find("span", class_="tip")
        tip_text = tip_span.get_text(strip=True) if tip_span else ""
        val = text_excluding_label(li)

        if "话数" in tip_text:
            m = re.search(r"(\d+)", val)
            episodes = int(m.group(1)) if m else None
        elif "放送开始" in tip_text or "首播" in tip_text or "上映年度" in tip_text:
            m = re.search(r"(\d{4})", val)
            year = int(m.group(1)) if m else None
        elif "中文名" in tip_text:
            chinese_name = val or None

    return year, episodes, chinese_name


def extract_other_titles(soup: BeautifulSoup, chinese_name: Optional[str] = None) -> List[str]:
    """
    提取其他标题信息
    
    Args:
        soup: BeautifulSoup对象
        chinese_name: 中文名（可选）
    
    Returns:
        其他标题列表
    """
    other_titles: List[str] = []
    if chinese_name:
        other_titles.append(chinese_name)
    
    for sub_li in soup.select("#infobox .sub_container ul li"):
        txt = sub_li.get_text(" ", strip=True)
        txt = re.sub(r"^\s*别名[:：]?\s*", "", txt).strip()
        if txt:
            other_titles.append(txt)
    
    return unique_preserve_order(other_titles)

def extract_tags(soup: BeautifulSoup) -> List[str]:
    """
    提取标签信息
    
    Args:
        soup: BeautifulSoup对象
    
    Returns:
        标签列表
    """
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
    
    return unique_preserve_order(tags)


def parse_subject(url_or_id: str, status: str = "planned") -> Dict:
    """
    解析bangumi主题页面，提取相关信息
    
    Args:
        url_or_id: 主题URL或ID
        status: 观看状态
 58      
    Returns:
        包含主题信息的字典
    """
    # 解析URL和ID
    if re.match(r"^\d+$", url_or_id):
        url = f"https://chii.in/subject/{url_or_id}"
        subject_id = url_or_id
    else:
        url = url_or_id
        m = re.search(r"/subject/(\d+)", url)
        subject_id = m.group(1) if m else url

    # 获取页面内容
    html = fetch_html(url)
    soup = BeautifulSoup(html, "html.parser")

    # 提取基本信息
    main_title, desc, cover = extract_basic_info(soup)
    
    # 提取评分
    rating = extract_rating(soup)
    
    # 提取详细信息
    year, episodes, chinese_name = extract_details(soup)

    # 提取其他标题
    other_titles = extract_other_titles(soup, chinese_name)

    # 提取标签
    tags = extract_tags(soup)

    # 构建返回数据
    return {
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
            href = a_main.get("href", "")
            match = re.search(r"/subject/(\d+)", href) if href else None # type: ignore
            results.append(
                {
                    "id": match.group(1) if match else "",
                    "title": a_main.get_text(strip=True),
                    "subtitle": a_sub.get_text(strip=True) if a_sub else "",
                }
            )
    return results


def to_js_snippet(obj: Dict) -> str:
    arr = [obj]
    json_str = json.dumps(arr, ensure_ascii=False, indent=2)
    return "// 由 bangumi_importer.py 生成\nconst BANGUMI_DATA = " + json_str + ";"


def main() -> bool:
    # 1. 输入关键词
    keyword = questionary.text("请输入搜索关键词（Bangumi 名称）:").ask()
    if not keyword:
        print("未输入关键词，退出。")
        return False

    # 2. 搜索结果选择
    results = search_subject(keyword)
    if not results:
        print("未找到任何结果。")
        return False

    choices = [f"{r['title']} ({r['subtitle']}) [ID:{r['id']}]" for r in results]
    selected = questionary.select("请选择要导入的作品:", choices=choices).ask()
    # 提取 ID
    match = re.search(r"ID:(\d+)", selected)
    if not match:
        print("未能解析所选作品的ID，退出。")
        return False
    selected_id = match.group(1)

    # 3. 状态选择
    status = questionary.select(
        "请选择状态:", choices=STATUS_OPTIONS, default="unprepared"
    ).ask()

    # 4. 抓取并生成 JS
    data = parse_subject(selected_id, status=status)
    pyperclip.copy(to_js_snippet(data))
    print(f"数据已复制到剪贴板，状态为 '{status}'。请粘贴到网页的导入框中。\n")

    return True


if __name__ == "__main__":
    while True:
        try:
            if main() == False:
                if not questionary.confirm("是否继续导入其他作品？").ask():
                    print("已选择退出程序。")
                    break
            else:
                continue

        # requests.exceptions.ConnectionError: ('Connection aborted.', ConnectionResetError(10054, '远程主机强迫关闭了一个现有的连接。', None, 10054, None))
        except requests.exceptions.RequestException as e:
            print(f"网络请求错误: {e}")
            print("请检查网络连接，稍后重试。\n可能是网络问题或访问过于频繁。")
            if not questionary.confirm("是否重试？").ask():
                print("用户选择不重试，退出程序。")
                break

        except KeyboardInterrupt:
            print("\n用户中断，退出。")
            break
