# -*- coding: utf-8 -*-
"""给 4 张手写专题页(qinling/hubei/henan/yellow-river)打自动标注补丁"""
import io, os, re

CSS = u'''.slabel{background:transparent!important;border:none!important;box-shadow:none!important;font:600 11px "PingFang SC","Microsoft YaHei",sans-serif;color:#22304a;text-shadow:0 0 3px #fff,0 0 5px #fff,0 0 7px #fff;padding:0;margin:0 0 0 4px!important}
.leaflet-tooltip.slabel::before{display:none}
'''
JS_ANCHOR = u"map.on('zoomend', syncSubLayers);"
JS_NEW = u"""map.on('zoomend', syncSubLayers);
var tipSubs = [];
SPOTS.forEach(function(s){
  markers[s.id].bindTooltip(s.name, {direction:'right', className:'slabel', offset:[8,-6]});
  tipSubs.push(markers[s.id]);
  s.subs.forEach(function(u){
    subLayers[s.id].eachLayer(function(ly){
      if (ly.getLatLng && Math.abs(ly.getLatLng().lat - u.lat) < 1e-6 && ly.getTooltip === undefined && !ly._tipDone) {
        ly._tipDone = true;
        ly.bindTooltip(u.n, {direction:'right', className:'slabel', offset:[7,-5]});
        tipSubs.push(ly);
      }
    });
  });
});
function syncTips(){
  var z = map.getZoom();
  tipSubs.forEach(function(m){
    var isSub = m.getIcon && m.getIcon().options.iconSize && m.getIcon().options.iconSize[0] <= 15;
    var want = z >= (isSub ? 12 : 8);
    if (want && map.hasLayer(m)) m.openTooltip(); else m.closeTooltip();
  });
}
map.on('zoomend', syncTips);"""

PARK_OLD = u"""  markers[s.id] = L.marker([s.lat, s.lon], {icon:icon, title:s.name}).addTo(map)
    .bindPopup(parkPopup(s), {maxWidth:295});"""
PARK_NEW = PARK_OLD

CSS_ANCHOR = u".subrow .sn .p3dopen{float:right;font-size:11px;padding:0 7px;line-height:19px;border-radius:5px}"

for f in ['qinling-map.html', 'hubei-map.html', 'henan-map.html', 'yellow-river-map.html']:
    p = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'maps', f)
    s = io.open(p, encoding='utf-8').read()
    if 'syncTips' in s:
        print('skip(already)', f); continue
    assert CSS_ANCHOR in s and JS_ANCHOR in s, f
    s = s.replace(CSS_ANCHOR, CSS_ANCHOR + '\n' + CSS, 1)
    s = s.replace(JS_ANCHOR, JS_NEW, 1)
    io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
    print('patched', f)
