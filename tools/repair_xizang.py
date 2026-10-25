# -*- coding: utf-8 -*-
"""xizang.json 修复：中文 themes 归一到标准 cat 码、id 重编号 1..N、cat 校正。"""
import json, io

MAP = {
    '雪山': 'cloud', '神山': 'cloud', '8000米级': 'cloud', '8000米级群峰': 'cloud',
    '日照金山': 'cloud', '星空': 'cloud', '云海': 'cloud', '蓝冰': 'lake',
    '圣湖': 'lake', '神湖': 'lake', '湖泊': 'lake', '冰湖': 'lake', '湿地': 'lake',
    '冰川': 'lake', '冰川湖泊': 'lake', '土林': 'lake', '地质': 'lake', '深湖': 'lake',
    '峡谷': 'lake', '林海': 'lake', '牧场': 'lake', '森林': 'lake',
    '桃花': 'bloom', '杜鹃': 'bloom', '田园': 'bloom', '秋色': 'leaf',
}
STD = {'bloom', 'fall', 'leaf', 'cloud', 'lake', 'bird'}
DROP = {'徒步', '转山', '古堡', '象雄'}

p = r'D:\Program\Travel\data\xizang.json'
d = json.load(io.open(p, encoding='utf-8'))
for i, s in enumerate(d['spots'], 1):
    s['id'] = i
    th = []
    for t in s['themes']:
        if t in STD:
            th.append(t)
        elif t in MAP and MAP[t] not in th:
            th.append(MAP[t])
        elif t not in DROP:
            th.append('lake' if 'lake' not in th else th[0])
    s['themes'] = th
    if s['cat'] not in STD:
        s['cat'] = th[0] if th else 'cloud'
io.open(p, 'w', encoding='utf-8', newline='\n').write(
    json.dumps(d, ensure_ascii=False, indent=1))
print('fixed', len(d['spots']), 'spots')
