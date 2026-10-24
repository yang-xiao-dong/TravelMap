# -*- coding: utf-8 -*-
"""把模块化源码打包为单文件网页（双击即用、零外部依赖）。

用法: python tools/build.py [输出路径]
默认输出 china-5a-map.html（仓库根目录）。
"""
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX = os.path.join(ROOT, 'index.html')

def build(out_path):
    html = io.open(INDEX, encoding='utf-8').read()
    # 内联样式表
    def css_repl(m):
        p = os.path.join(ROOT, m.group(1).split('?')[0])
        return '<style>\n' + io.open(p, encoding='utf-8').read() + '\n</style>'
    html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', css_repl, html)
    # 内联脚本（保持原顺序）
    def js_repl(m):
        p = os.path.join(ROOT, m.group(1).split('?')[0])
        return '<script>\n' + io.open(p, encoding='utf-8').read() + '\n</script>'
    html = re.sub(r'<script src="([^"]+)"></script>', js_repl, html)
    io.open(out_path, 'w', encoding='utf-8', newline='\n').write(html)
    return os.path.getsize(out_path)

if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'china-5a-map.html')
    size = build(out)
    print('built %s (%d bytes)' % (out, size))
