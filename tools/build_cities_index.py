# -*- coding: utf-8 -*-
"""城市专题索引：data/cities/manifest.json + data/cities/*.json -> data/cities.js。
上线状态由 data/cities/<pinyin>.json 是否存在动态判定。
用法：python tools/build_cities_index.py
"""
import json, io, os

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CDIR = os.path.join(HERE, 'data', 'cities')

# 103 城中心坐标（近似，WGS84）——仅供总览图落点
COORDS = {
    "beijing": [39.904, 116.407], "tianjin": [39.084, 117.201], "shanghai": [31.230, 121.474],
    "chongqing": [29.563, 106.551],
    "shijiazhuang": [38.042, 114.515], "tangshan": [39.630, 118.183], "qinhuangdao": [39.935, 119.598], "chengde": [40.976, 117.963],
    "taiyuan": [37.870, 112.549], "datong": [40.076, 113.300], "yuncheng": [35.026, 111.008],
    "huhehaote": [40.842, 111.750], "baotou": [40.658, 109.841], "hulunbeier": [49.212, 119.766], "eerduosi": [39.609, 109.781],
    "shenyang": [41.806, 123.432], "dalian": [38.914, 121.615], "dandong": [40.129, 124.379],
    "changchun": [43.817, 125.324], "jilin": [43.844, 126.549], "yanji": [42.891, 129.510],
    "haerbin": [45.804, 126.535], "mudanjiang": [44.552, 129.633], "qiqihaer": [47.354, 123.918],
    "nanjing": [32.059, 118.797], "suzhou": [31.299, 120.585], "wuxi": [31.491, 120.312], "yangzhou": [32.397, 119.421],
    "hangzhou": [30.247, 120.156], "ningbo": [29.878, 121.549], "wenzhou": [28.001, 120.672],
    "hefei": [31.821, 117.227], "huangshan": [29.714, 118.312], "wuhu": [31.352, 118.433],
    "fuzhou": [26.074, 119.297], "xiamen": [24.480, 118.089], "quanzhou": [24.874, 118.676],
    "nanchang": [28.681, 115.858], "ganzhou": [25.831, 114.935], "jiujiang": [29.705, 116.001],
    "jinan": [36.651, 117.120], "qingdao": [36.067, 120.383], "yantai": [37.464, 121.448], "weihai": [37.513, 122.120],
    "zhengzhou": [34.747, 113.625], "luoyang": [34.619, 112.454], "kaifeng": [34.797, 114.348], "anyang": [36.098, 114.393],
    "wuhan": [30.593, 114.305], "yichang": [30.692, 111.286], "xiangyang": [32.009, 112.122],
    "changsha": [28.228, 112.939], "zhangjiajie": [29.117, 110.479], "yueyang": [29.357, 113.129],
    "guangzhou": [23.129, 113.264], "shenzhen": [22.544, 114.058], "chaozhou": [23.657, 116.623], "zhuhai": [22.271, 113.577],
    "nanning": [22.817, 108.366], "guilin": [25.274, 110.290], "beihai": [21.481, 109.120],
    "haikou": [20.044, 110.199], "sanya": [18.253, 109.512], "danzhou": [19.521, 109.577],
    "chengdu": [30.573, 104.067], "leshan": [29.552, 103.766], "xichang": [27.887, 102.258],
    "guiyang": [26.647, 106.630], "zunyi": [27.725, 106.927], "anshun": [26.246, 105.932],
    "kunming": [25.039, 102.713], "dali": [25.606, 100.268], "lijiang": [26.873, 100.230],
    "lasa": [29.652, 91.172], "rikaze": [29.270, 88.881], "linzhi": [29.650, 94.362],
    "xian": [34.342, 108.940], "yanan": [36.585, 109.490], "hanzhong": [33.068, 107.023],
    "lanzhou": [36.061, 103.834], "dunhuang": [40.142, 94.662], "zhangye": [38.926, 100.449],
    "xining": [36.617, 101.778], "geermu": [36.406, 94.903], "yushu": [33.004, 97.008],
    "yinchuan": [38.487, 106.231], "zhongwei": [37.499, 105.197], "guyuan": [36.004, 106.242],
    "wulumuqi": [43.826, 87.617], "kashi": [39.470, 75.990], "yining": [43.905, 81.281], "tulufan": [42.951, 89.190],
}

def main():
    mf = json.load(io.open(os.path.join(CDIR, 'manifest.json'), encoding='utf-8'))
    out, total, done, provs, provs_done = [], 0, 0, 0, 0
    for p in mf['provinces']:
        provs += 1
        p_done = 0
        for c in p['cities']:
            total += 1
            fp = os.path.join(CDIR, c['pinyin'] + '.json')
            row = {'prov': p['prov'], 'name': c['name'], 'pinyin': c['pinyin'],
                   'capital': bool(c.get('capital')), 'subpro': bool(c.get('subpro')),
                   'lat': COORDS[c['pinyin']][0], 'lon': COORDS[c['pinyin']][1]}
            if os.path.exists(fp):
                d = json.load(io.open(fp, encoding='utf-8'))
                row['done'] = True
                row['n'] = len(d['spots'])
                row['m'] = sum(len(s['subs']) for s in d['spots'])
                done += 1
                p_done += 1
            else:
                row['done'] = False
            out.append(row)
        if p_done == len(p['cities']):
            provs_done += 1
    js = ('var CITIES = ' + json.dumps(
        {'meta': {'total': total, 'done': done, 'provs': provs, 'provsDone': provs_done}, 'list': out},
        ensure_ascii=False, separators=(',', ':')) + ';\n')
    io.open(os.path.join(HERE, 'data', 'cities.js'), 'w', encoding='utf-8', newline='\n').write(js)
    print('data/cities.js written: %d/%d cities online, %d/%d provinces complete' % (done, total, provs_done, provs))

if __name__ == '__main__':
    main()
