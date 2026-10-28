# -*- coding: utf-8 -*-
"""把 docs/spots/*.md 解析为结构化索引，生成 spots-browser.html（单文件、零依赖、双击即用）。

用法: python tools/build_docs_index.py
输入: docs/spots/<拼音>.md（README.md 除外）
输出: browser/spots-browser.html

md 格式锚点（由文档规范保证）:
  # <标题>
  ## 省域速览 / ## 主题速览   —— 季节日历(- 列表) + 节庆表 + 住宿表
  ## 景区目录
  ## NN 景区名 / **区域**… · **坐标**… · **类别**… · **主题**… [· **5A**✅/国家公园✅] [· **海拔**…]
  **最佳窗口**：…
  ### 文化历史 / 风土人情 / 出片要点(tips+机位速查表) / 地方特色 / 实用提示
"""
import datetime
import glob
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(ROOT, 'docs', 'spots')
OUT = os.path.join(ROOT, 'browser', 'spots-browser.html')

CN = {
    'anhui': '安徽', 'beijing': '北京', 'chongqing': '重庆', 'fujian': '福建',
    'gansu': '甘肃', 'guangdong': '广东', 'guangxi': '广西', 'guizhou': '贵州',
    'hainan': '海南', 'hebei': '河北', 'heilongjiang': '黑龙江', 'henan': '河南',
    'hubei': '湖北', 'hunan': '湖南', 'jiangsu': '江苏', 'jiangxi': '江西',
    'jilin': '吉林', 'liaoning': '辽宁', 'neimenggu': '内蒙古', 'ningxia': '宁夏',
    'qinghai': '青海', 'qinling': '秦岭北麓', 'shandong': '山东', 'shanghai': '上海',
    'shanxi': '山西', 'sichuan': '四川', 'tianjin': '天津', 'xinjiang': '新疆',
    'xizang': '西藏', 'yellow-river': '黄河全线', 'yunnan': '云南', 'zhejiang': '浙江',
}
SECTIONS = ['文化历史', '唐宋诗词', '风土人情', '出片要点', '地方特色', '实用提示']
THEME_LABELS = {
    'cloud': '云海雾凇', 'culture': '人文史迹', 'lake': '江湖瀑潮',
    'leaf': '林木秋叶', 'bloom': '花季物候', 'fall': '秋色', 'bird': '候鸟湿地',
}


def paragraphs(block):
    out = []
    for p in re.split(r'\n\s*\n', block):
        p = p.strip()
        if p and not p.startswith('|') and not p.startswith('#'):
            out.append(' '.join(p.split()))
    return out


def bullets(block):
    return [' '.join(m.split()) for m in re.findall(r'^-\s+(.+)$', block, re.M)]


def md_tables(block):
    """返回 [(header_cells, [row_cells...])...]"""
    tables, header, rows = [], None, []
    for line in block.splitlines():
        line = line.strip()
        if line.startswith('|') and line.endswith('|'):
            cells = [c.strip() for c in line[1:-1].split('|')]
            if set(''.join(cells)) <= set('-: '):
                continue  # 分隔行
            if header is None:
                header = cells
            else:
                rows.append(cells)
        elif header is not None:
            tables.append((header, rows))
            header, rows = None, []
    if header is not None:
        tables.append((header, rows))
    return tables


def parse_months(win):
    months = set()
    for m in re.finditer(r'(\d{1,2})\s*[–—-]\s*(\d{1,2})\s*月', win):
        a, b = int(m.group(1)), int(m.group(2))
        for i in range(min(a, b), max(a, b) + 1):
            if 1 <= i <= 12:
                months.add(i)
    for m in re.finditer(r'(\d{1,2})\s*月', win):
        i = int(m.group(1))
        if 1 <= i <= 12:
            months.add(i)
    return sorted(months)


def parse_info_line(line):
    """`**区域**… · **坐标**… · …` → dict；值为 ✅ 的键收集进 badges。"""
    info = {}
    for seg in line.split('·'):
        m = re.match(r'\s*\*\*(.+?)\*\*\s*(.*)$', seg.strip())
        if m:
            info[m.group(1).strip()] = m.group(2).strip()
    return info


def parse_spot(block):
    # 截掉文末 `---` 分隔线之后的内容（本页统计等）
    m = re.search(r'^---\s*$', block, flags=re.M)
    if m:
        block = block[:m.start()]

    lines = block.splitlines()
    info = {}
    win = ''
    for ln in lines[:4]:
        ln = ln.strip()
        if not ln:
            continue
        if ln.startswith('**区域**') and '区域' not in info:
            info = parse_info_line(ln)
        mi = re.match(r'\*\*最佳窗口\*\*\s*[：:]\s*(.+)$', ln)
        if mi:
            win = mi.group(1).strip()

    lon = lat = None
    mc = re.search(r'([\d.]+)\s*[，,]\s*(-?\d+\.?\d*)', info.get('坐标', ''))
    if mc:
        lon, lat = float(mc.group(1)), float(mc.group(2))
    themes = [t.strip() for t in re.split(r'[/,、]', info.get('主题', '')) if t.strip()]
    badges = [k for k, v in info.items() if v == '✅']

    # 五板块切分
    parts = re.split(r'^### (文化历史|唐宋诗词|风土人情|出片要点|地方特色|实用提示)\s*$', block, flags=re.M)
    sec = {k: '' for k in SECTIONS}
    for i in range(1, len(parts) - 1, 2):
        sec[parts[i]] = parts[i + 1]

    # 出片要点 = tips 列表 + 机位速查表
    shot_block = sec['出片要点']
    ms = re.search(r'\*\*机位速查\*\*', shot_block)
    tips = bullets(shot_block[:ms.start()] if ms else shot_block)
    shots = []
    if ms:
        for header, rows in md_tables(shot_block[ms.start():]):
            for r in rows:
                if len(r) >= 4:
                    shots.append({'n': r[0], 'lonlat': r[1], 'yaw': r[2], 'tip': r[3]})
                elif len(r) == 3:
                    shots.append({'n': r[0], 'lonlat': r[1], 'yaw': '—', 'tip': r[2]})

    poems = []
    for b in bullets(sec['唐宋诗词']):
        m = re.match(r'^(\S+?)《(.+?)》（(唐|宋)）：『(.+?)』$', b)
        if m:
            poems.append({'a': m.group(1), 't': m.group(2), 'd': m.group(3), 'l': m.group(4)})
    feat = bullets(sec['地方特色']) or paragraphs(sec['地方特色'])
    spot = {
        'name': '', 'region': info.get('区域', ''), 'lon': lon, 'lat': lat,
        'cat': info.get('类别', ''), 'themes': themes, 'badges': badges,
        'alt': info.get('海拔', '') or None, 'win': win,
        'months': parse_months(win),
        'hist': paragraphs(sec['文化历史']),
        'poems': poems,
        'folk': paragraphs(sec['风土人情']),
        'tips': tips, 'shots': shots, 'feat': feat,
        'note': paragraphs(sec['实用提示']),
    }
    return spot


def parse_overview(text):
    m = re.search(r'^## (省域|主题)速览\s*$$(.*?)^## 景区目录', text, flags=re.M | re.S)
    if not m:
        return [], [], []
    block = m.group(2)
    calendar = [' '.join(x.split()) for x in re.findall(r'^-\s+(.+)$', block, re.M)]
    local, lodging = [], []
    for header, rows in md_tables(block):
        h = ''.join(header)
        if '节庆' in h or '时间' in h:
            local = rows
        elif '名称' in h or '住宿' in h:
            lodging = rows
    return calendar, local, lodging


def parse_doc(path):
    key = os.path.basename(path)[:-3]
    text = io.open(path, encoding='utf-8').read()
    title = (re.search(r'^# (.+)$', text, flags=re.M) or [None, key])[1].strip()
    calendar, local, lodging = parse_overview(text)
    body = re.split(r'^## 景区目录\s*$', text, flags=re.M)[-1]
    spots = []
    parts = re.split(r'^## (\d{2})\s+(.+?)\s*$', body, flags=re.M)
    for i in range(1, len(parts) - 1, 3):
        spot = parse_spot(parts[i + 2])
        spot['id'] = parts[i]
        spot['name'] = parts[i + 1].strip()
        spots.append(spot)
    maphtml = None
    if os.path.exists(os.path.join(ROOT, 'maps', key + '-map.html')):
        maphtml = 'maps/' + key + '-map.html'
    return {
        'key': key, 'cn': CN.get(key, key), 'title': title,
        'calendar': calendar, 'local': local, 'lodging': lodging,
        'map': maphtml, 'spots': spots,
    }


def build():
    files = sorted(f for f in glob.glob(os.path.join(DOCS, '*.md'))
                   if os.path.basename(f) != 'README.md')
    provinces = [parse_doc(f) for f in files]
    for p in provinces:
        for s in p['spots']:
            blob = ' '.join([
                p['cn'], s['name'], s['region'], s['cat'], s['win'],
                ' '.join(s['themes']), ' '.join(s['hist']),
                ' '.join(x['a'] + ' ' + x['t'] + ' ' + x['l'] for x in s['poems']), ' '.join(s['folk']),
                ' '.join(s['tips']), ' '.join(sh['n'] + ' ' + sh['tip'] for sh in s['shots']),
                ' '.join(s['feat']), ' '.join(s['note']),
            ])
            s['blob'] = blob

    data = {
        'generated': datetime.date.today().isoformat(),
        'themeLabels': THEME_LABELS,
        'poemCount': sum(len(s['poems']) for p in provinces for s in p['spots']),
        'provinces': provinces,
    }
    payload = json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
    tpl = io.open(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                               'spots_browser_template.html'), encoding='utf-8').read()
    html_out = tpl.replace('__DATA__', payload)
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(html_out)

    n_spots = sum(len(p['spots']) for p in provinces)
    n_shots = sum(len(s['shots']) for p in provinces for s in p['spots'])
    print('parsed %d docs / %d provinces / %d spots / %d shots -> %s (%.1f KB)' % (
        len(files), len(provinces), n_spots, n_shots,
        os.path.relpath(OUT, ROOT), os.path.getsize(OUT) / 1024))
    # 抽样自检：无空名/缺板块的景区
    bad = [(p['key'], s['id'], s['name']) for p in provinces for s in p['spots']
           if not s['name'] or not (s['hist'] and s['note'])]
    if bad:
        print('WARN incomplete spots:', bad[:10])
        sys.exit(1)


if __name__ == '__main__':
    build()
