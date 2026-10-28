# -*- coding: utf-8 -*-
"""国道走廊聚合：data/g*.json -> data/roads.js（首页总览图叠加走向线用）。
用法：python tools/gen_roads_js.py
"""
import json, io, os, glob, re

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def main():
    out = []
    for p in sorted(glob.glob(os.path.join(HERE, 'data', 'g*.json'))):
        if not re.search(r'[/\\]g\d{3}\.json$', p):
            continue
        d = json.load(io.open(p, encoding='utf-8'))
        spots = d['spots']
        out.append({
            'id': d['pinyin'],
            'name': d.get('route_name', d['pinyin'].upper()),
            'label': d['title'].split(' ', 1)[1].split(' · ')[0] if ' ' in d['title'] else '',
            'color': d['accent'],
            'page': d['pinyin'] + '-map.html',
            'n': len(spots),
            'm': sum(len(s['subs']) for s in spots),
            'route': d.get('route') or [],
        })
    js = 'var ROADS = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n'
    io.open(os.path.join(HERE, 'data', 'roads.js'), 'w', encoding='utf-8', newline='\n').write(js)
    print('data/roads.js written:', len(out), u'条国道',
          sum(x['n'] for x in out), u'景区', sum(x['m'] for x in out), u'机位')

if __name__ == '__main__':
    main()
