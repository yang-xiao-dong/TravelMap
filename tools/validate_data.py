# -*- coding: utf-8 -*-
"""采风数据契约校验：坐标缺失/越界、cat 非法、字段类型，输出坏行。"""
import json, io, sys

STD = {'bloom', 'fall', 'leaf', 'cloud', 'lake', 'bird', 'culture'}

def ok_num(v):
    return isinstance(v, (int, float)) and -180 <= v <= 180

def check(path):
    d = json.load(io.open(path, encoding='utf-8'))
    errs = []
    cats = set(STD) | set(d.get('cat_extra') or {})
    for s in d['spots']:
        sid = s.get('id'); nm = s.get('name', '?')
        if not ok_num(s.get('lon')) or not ok_num(s.get('lat')):
            errs.append('spot %s %s 主坐标缺失/非法: %s,%s' % (sid, nm, s.get('lon'), s.get('lat')))
        if s.get('cat') not in cats:
            errs.append('spot %s %s cat 非法: %s' % (sid, nm, s.get('cat')))
        for t in s.get('themes', []):
            if t not in cats:
                errs.append('spot %s %s theme 非法: %s' % (sid, nm, t))
        for u in s.get('subs', []):
            if not ok_num(u.get('lon')) or not ok_num(u.get('lat')):
                errs.append('  spot %s %s sub「%s」坐标缺失: %s,%s' % (sid, nm, u.get('n'), u.get('lon'), u.get('lat')))
            if not u.get('tip'):
                errs.append('  spot %s %s sub「%s」缺 tip' % (sid, nm, u.get('n')))
    for u in d.get('lodging', []):
        if not ok_num(u.get('lon')) or not ok_num(u.get('lat')):
            errs.append('lodging「%s」坐标缺失' % u.get('n'))
    for u in d.get('local', []):
        if not u.get('n') or not u.get('type') or not u.get('tip'):
            errs.append('local「%s」缺 n/type/tip' % u.get('n'))
        if u.get('lon') is not None and (not ok_num(u.get('lon')) or not ok_num(u.get('lat'))):
            errs.append('local「%s」坐标非法' % u.get('n'))
    print(path, 'spots=%d subs=%d' % (len(d['spots']), sum(len(s['subs']) for s in d['spots'])))
    if errs:
        print('\n'.join(errs))
    else:
        print('  ALL OK')
    return len(errs)

if __name__ == '__main__':
    sys.exit(0 if all(check(p) == 0 for p in sys.argv[1:]) else 1)
