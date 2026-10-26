# -*- coding: utf-8 -*-
"""主题采风图生成器：data/<pinyin>.json -> <pinyin>-map.html
模板与 henan-map.html 同构（层级/筛选/人视模拟/异形住宿层）。
用法：python tools/gen_theme_map.py data/shanxi.json
"""
import json, io, sys, os

TPL = u"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>__TITLE__</title>
<link rel="stylesheet" href="lib/leaflet.css">
<style>
:root{ --accent:__ACCENT__; --ink:#22304a; --sub:#64748b; --line:#e2e8f0; --bg:#f6f8fb;
  --bloom:#d6336c; --fall:#0e9aa7; --leaf:#e8590c; --cloud:#7048e8; --lake:#2f9e44; --bird:#1c7ed6; --stay:#9c36b5; }
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%}
body{font-family:"PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif;color:var(--ink);background:var(--bg)}
.layout{display:grid;grid-template-columns:330px 1fr;grid-template-rows:auto 1fr;height:100vh}
header{grid-column:1/-1;display:flex;align-items:baseline;gap:14px;padding:12px 18px 10px;border-bottom:1px solid var(--line);background:#fff;flex-wrap:wrap}
header h1{font-family:Georgia,"Songti SC",serif;font-size:21px;color:var(--accent);letter-spacing:.5px}
header .sub{font-size:12px;color:var(--sub);flex:1}
header .sub a{color:var(--accent);text-decoration:none}
header .sub a.cur{font-weight:700;border-bottom:2px solid var(--accent)}
header a.back{font-size:13px;color:var(--accent);text-decoration:none;border:1px solid var(--accent);border-radius:6px;padding:3px 10px;white-space:nowrap}
header a.back:hover{background:var(--accent);color:#fff}
aside{overflow-y:auto;border-right:1px solid var(--line);background:#fff;padding:12px 14px 20px}
aside h2{font-size:13px;color:var(--sub);font-weight:600;margin:4px 0 8px;letter-spacing:.5px}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}
.chip{font-size:12px;padding:3px 10px;border:1px solid var(--line);border-radius:999px;cursor:pointer;background:#fff;user-select:none}
.chip.on{color:#fff;border-color:transparent}
.zhint{font-size:11px;color:var(--sub);margin-bottom:8px;line-height:1.5}
.cal{background:#f0f6ff;border:1px solid #d4e4f7;border-radius:8px;padding:6px 10px;margin-bottom:10px}
.cal h3{font-size:11px;color:var(--accent);margin-bottom:3px;letter-spacing:1px}
.cal p{font-size:11px;color:var(--ink);line-height:1.7}
.cal b{color:var(--accent);font-weight:600}
.grp{font-size:12px;color:var(--sub);margin:12px 0 4px;font-weight:600;letter-spacing:1px}
.item{border:1px solid transparent;border-radius:9px;cursor:pointer}
.item:hover{background:var(--bg)}
.item .row{display:flex;gap:9px;padding:8px 8px;align-items:flex-start}
.item .num{flex:none;width:22px;height:22px;border-radius:50%;color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;margin-top:1px;box-shadow:0 0 0 2px #fff,0 0 0 3.5px rgba(34,48,74,.12)}
.item .nm{font-size:13.5px;font-weight:600;line-height:1.35}
.item .meta{font-size:11.5px;color:var(--sub);margin-top:2px;line-height:1.5}
.item .arrow{flex:none;margin-left:auto;font-size:10px;color:var(--sub);transition:transform .15s;margin-top:4px}
.item.open .arrow{transform:rotate(90deg)}
.subs{display:none;padding:0 6px 8px 39px}
.item.open .subs{display:block}
.subrow{padding:5px 6px;border-left:2.5px solid var(--sc,#999);margin:3px 0;border-radius:0 6px 6px 0;cursor:pointer;background:#fafbfd}
.subrow:hover{background:var(--bg)}
.subrow .sn{font-size:12.5px;font-weight:600}
.subrow .st{font-size:11px;color:var(--sub);line-height:1.45;margin-top:1px}
.badge{display:inline-block;font-size:10px;padding:1px 6px;border-radius:4px;margin-left:5px;vertical-align:1px}
.b5a{background:#fff4d6;color:#a06b00;border:1px solid #f0d48a}
.bnp{background:#e5f0ff;color:#1f5fa8;border:1px solid #bcd4f0}
.stayrow{padding:6px 8px;border-left:2.5px solid var(--stay);margin:3px 0;border-radius:0 6px 6px 0;background:#fbf6fd}
.stayrow .sn{font-size:12.5px;font-weight:600;color:#862e9c}
.stayrow .st{font-size:11px;color:var(--sub);line-height:1.45;margin-top:1px}
#map{height:100%;background:#dfe6ee;z-index:1}
.leaflet-container{font-family:inherit}
.leaflet-popup-content{font-size:13px;line-height:1.6;margin:10px 14px;width:258px!important}
.pp-name{font-size:15px;font-weight:700}
.pp-region{color:var(--sub);font-size:12px;margin:2px 0 6px}
.pp-note{background:#fdf3e7;border:1px solid #f3ddc0;border-radius:6px;padding:5px 9px;font-size:12px;margin:5px 0;color:#7a5200}
.pp-story{background:#f6f1e4;border-left:3px solid #8a5a00;border-radius:0 6px 6px 0;padding:5px 9px;font-size:12px;margin:5px 0;color:#5c4a1a;line-height:1.55}
.pp-row{font-size:12.5px;margin:3px 0}
.pp-row b.k{color:var(--sub);font-weight:600}
.pp-coord{display:flex;align-items:center;gap:8px;background:var(--bg);border-radius:6px;padding:4px 8px;margin:6px 0;font-variant-numeric:tabular-nums}
.pp-coord button{border:none;background:var(--accent);color:#fff;font-size:11px;border-radius:5px;padding:2px 8px;cursor:pointer}
.pp-tips{margin:6px 0 4px;padding-left:17px}
.pp-tips li{margin:3px 0;font-size:12.5px}
.pp-subs{margin:5px 0 2px;padding-left:0;list-style:none}
.pp-subs li{margin:2px 0;font-size:12.5px}
.pp-subs li:before{content:'▸ ';color:var(--accent)}
.pp-links{margin-top:8px;display:flex;gap:10px}
.pp-links a{font-size:12px;color:var(--accent);text-decoration:none;border-bottom:1px dashed var(--accent)}
.p3dopen{border:1px solid var(--accent);background:#fff;color:var(--accent);font-size:12px;border-radius:6px;padding:2px 10px;cursor:pointer}
.p3dopen:hover{background:var(--accent);color:#fff}
.subrow .sn .p3dopen{float:right;font-size:11px;padding:0 7px;line-height:19px;border-radius:5px}
.slabel{background:transparent!important;border:none!important;box-shadow:none!important;font:600 11px "PingFang SC","Microsoft YaHei",sans-serif;color:#22304a;text-shadow:0 0 3px #fff,0 0 5px #fff,0 0 7px #fff;padding:0;margin:0 0 0 4px!important}
.leaflet-tooltip.slabel::before{display:none}
@media (max-width:760px){.layout{grid-template-columns:1fr;grid-template-rows:auto 34vh 1fr}aside{border-right:none;border-bottom:1px solid var(--line)}}
</style>
</head>
<body>
<div class="layout">
  <header>
    <h1>__H1__</h1>
    <span class="sub">__SUBHEAD__ · 坐标 WGS84 近似参考点，导航以景区大门为准 · <a href="index.html">← 规划中心</a></span>
  </header>
  <aside>
    <h2>按拍摄题材筛选</h2>
    <div class="chips" id="chips"></div>
    <div class="zhint">缩放到 z≥11 展开小景点__STAYHINT__</div>
    <div class="cal"><h3>__CALTITLE__</h3><p>__CALENDAR__</p></div>
    <div id="list"></div>
  </aside>
  <div id="map"></div>
</div>

<script src="lib/leaflet.js"></script>
<script src="js/qinling/dem.js?v=1"></script>
<script src="js/qinling/sun.js?v=2"></script>
<script src="js/qinling/texture.js?v=2"></script>
<script src="js/qinling/pano.js?v=5"></script>
<script>
var CAT = __CAT__;
var SPOTS = __SPOTS__;
var LODGING = __LODGING__;
var LOCAL = __LOCAL__;
var REGION_ORDER = __REGION_ORDER__;

var map = L.map('map', { zoomControl:true, minZoom:__MINZOOM__, maxZoom:18 }).setView([__CLAT__, __CLON__], __ZINIT__);
var sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  { maxZoom:18, attribution:'影像 © Esri, Maxar, Earthstar Geographics' }).addTo(map);
var topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
  { maxZoom:17, subdomains:'abc', attribution:'© OpenStreetMap 贡献者, SRTM | © OpenTopoMap (CC-BY-SA)' });
var osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  { maxZoom:19, attribution:'© OpenStreetMap 贡献者' });
L.control.layers({'卫星影像':sat,'等高线地形':topo,'OSM 街道':osm}, null, {position:'topright'}).addTo(map);
L.control.scale({imperial:false, position:'bottomleft'}).addTo(map);

function coordTxt(lat, lon){ return lat.toFixed(4) + ', ' + lon.toFixed(4); }
function amapLink(s){ return 'https://uri.amap.com/search?keyword=' + encodeURIComponent(s.name.replace(/（.*?）/g,'')); }
function copyBtn(t){ return '<button data-cp="' + t + '">复制坐标</button>'; }
function bearingDeg(la1, lo1, la2, lo2){
  var y = Math.sin((lo2-lo1)*Math.PI/180) * Math.cos(la2*Math.PI/180);
  var x = Math.cos(la1*Math.PI/180)*Math.sin(la2*Math.PI/180) - Math.sin(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.cos((lo2-lo1)*Math.PI/180);
  return Math.atan2(y,x)*180/Math.PI;
}
function subDefaultYaw(s, u){
  var i = s.subs.indexOf(u), t = s.subs[i+1] || s.subs[i-1];
  return t ? (bearingDeg(u.lat, u.lon, t.lat, t.lon) + 360) % 360 : 0;
}
function allTargets(){
  var a = [];
  SPOTS.forEach(function(s){
    a.push({name:s.name, lat:s.lat, lon:s.lon});
    s.subs.forEach(function(u){ a.push({name:u.n, lat:u.lat, lon:u.lon}); });
  });
  return a;
}
function parkPopup(s){
  var h = '<div class="pp-name">' + s.name + (s.g5 ? '<span class="badge b5a">5A</span>' : '') + (s.np ? '<span class="badge bnp">国家公园</span>' : '') + '</div>'
    + '<div class="pp-region">' + s.region + (s.alt ? ' · ' + s.alt : '') + '</div>'
    + (s.story ? '<div class="pp-story">' + s.story + '</div>' : '')
    + (s.note ? '<div class="pp-note">' + s.note + '</div>' : '')
    + '<div class="pp-row"><b class="k">最佳窗口</b>　' + s.win + '</div>'
    + '<div class="pp-row"><b class="k">题材</b>　' + s.themes.map(function(t){return CAT[t].label;}).join(' / ') + '</div>'
    + '<div class="pp-coord"><span>' + coordTxt(s.lat, s.lon) + '</span>' + copyBtn(coordTxt(s.lat, s.lon)) + '</div>'
    + (s.tips ? '<ul class="pp-tips">' + s.tips.map(function(t){ return '<li>' + t + '</li>'; }).join('') + '</ul>' : '')
    + '<div class="pp-row"><b class="k">小景点（' + s.subs.length + '）</b></div>'
    + '<ul class="pp-subs">' + s.subs.map(function(u){ return '<li>' + u.n + '</li>'; }).join('') + '</ul>'
    + '<div class="pp-links"><a href="' + amapLink(s) + '" target="_blank" rel="noopener">高德地图导航 →</a><a href="https://cn.bing.com/maps?q=' + coordTxt(s.lat, s.lon) + '" target="_blank" rel="noopener">Bing 卫星对照 →</a></div>';
  return h;
}
function subPopup(s, u){
  var yaw = u.yaw != null ? u.yaw : subDefaultYaw(s, u);
  return '<div class="pp-name" style="font-size:14px">' + u.n + '</div>'
    + '<div class="pp-region">' + s.name + ' · 小景点/机位</div>'
    + '<div class="pp-coord"><span>' + coordTxt(u.lat, u.lon) + '</span>' + copyBtn(coordTxt(u.lat, u.lon)) + '</div>'
    + '<div class="pp-row"><b class="k">机位要点</b>　' + u.tip + '</div>'
    + '<div style="margin:7px 0 4px"><button class="p3dopen" data-lat="' + u.lat + '" data-lon="' + u.lon + '" data-name="' + u.n + '" data-yaw="' + yaw.toFixed(0) + '">👁 人视模拟 · 环顾山形</button></div>'
    + '<div class="pp-links"><a href="https://cn.bing.com/maps?q=' + coordTxt(u.lat, u.lon) + '" target="_blank" rel="noopener">Bing 卫星对照 →</a></div>';
}
function stayPopup(u){
  return '<div class="pp-name" style="font-size:14px;color:#862e9c">🛖 ' + u.n + '</div>'
    + '<div class="pp-region">异形住宿 · ' + u.type + '</div>'
    + '<div class="pp-coord"><span>' + coordTxt(u.lat, u.lon) + '</span>' + copyBtn(coordTxt(u.lat, u.lon)) + '</div>'
    + '<div class="pp-row"><b class="k">要点</b>　' + u.tip + '</div>'
    + '<div class="pp-links"><a href="https://cn.bing.com/maps?q=' + coordTxt(u.lat, u.lon) + '" target="_blank" rel="noopener">Bing 卫星对照 →</a></div>';
}
function localPopup(u){
  return '<div class="pp-name" style="font-size:14px;color:#8a5a00">✦ ' + u.n + '</div>'
    + '<div class="pp-region">地方特色 · ' + u.type + (u.month ? ' · ' + u.month : '') + '</div>'
    + (u.region ? '<div class="pp-region">' + u.region + '</div>' : '')
    + (u.lon != null ? '<div class="pp-coord"><span>' + coordTxt(u.lat, u.lon) + '</span>' + copyBtn(coordTxt(u.lat, u.lon)) + '</div>' : '')
    + '<div class="pp-row" style="line-height:1.55">' + u.tip + '</div>';
}
var markers = {}, subLayers = {}, stayLayer = L.layerGroup(), localLayer = L.layerGroup();
var tipSubs = [];   /* 自动标注：公园名 z≥8，机位名 z≥12 */
SPOTS.forEach(function(s){
  var c = CAT[s.cat].color;
  var icon = L.divIcon({ className:'', iconSize:[24,24], iconAnchor:[12,12], popupAnchor:[0,-12],
    html:'<div style="width:24px;height:24px;border-radius:50%;background:'+c+';color:#fff;font:700 12px/24px PingFang SC,Microsoft YaHei,sans-serif;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.45),0 0 0 2.5px #fff">' + s.id + '</div>' });
  markers[s.id] = L.marker([s.lat, s.lon], {icon:icon, title:s.name}).addTo(map)
    .bindPopup(parkPopup(s), {maxWidth:295})
    .bindTooltip(s.name, {direction:'right', className:'slabel', offset:[8,-6]});
  tipSubs.push(markers[s.id]);
  var g = L.layerGroup();
  var line = s.subs.map(function(u){ return [u.lat, u.lon]; });
  L.polyline(line, {color:c, weight:2.5, opacity:.8, dashArray:'6 7'})
    .bindTooltip(s.name + ' 游览/拍摄线').addTo(g);
  s.subs.forEach(function(u){
    var di = L.divIcon({ className:'', iconSize:[15,15], iconAnchor:[7.5,7.5], popupAnchor:[0,-8],
      html:'<div style="width:15px;height:15px;border-radius:50%;background:'+c+';opacity:.92;box-shadow:0 0 0 2px #fff,0 1px 3px rgba(0,0,0,.4)"></div>' });
    var _m = L.marker([u.lat, u.lon], {icon:di, title:u.n}).addTo(g)
      .bindPopup(subPopup(s, u), {maxWidth:280})
      .bindTooltip(u.n, {direction:'right', className:'slabel', offset:[7,-5]});
    tipSubs.push(_m);
  });
  subLayers[s.id] = g;
});
LODGING.forEach(function(u){
  var di = L.divIcon({ className:'', iconSize:[18,18], iconAnchor:[9,9], popupAnchor:[0,-9],
    html:'<div style="width:18px;height:18px;transform:rotate(45deg);background:#9c36b5;opacity:.94;box-shadow:0 0 0 2px #fff,0 1px 3px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(-45deg);color:#fff;font:700 11px/1 sans-serif">🛖</span></div>' });
  L.marker([u.lat, u.lon], {icon:di, title:u.n}).bindPopup(stayPopup(u), {maxWidth:280}).addTo(stayLayer);
});
if (LODGING.length) stayLayer.addTo(map);
LOCAL.forEach(function(u){
  if (u.lon == null) return;
  var di = L.divIcon({ className:'', iconSize:[18,18], iconAnchor:[9,9], popupAnchor:[0,-9],
    html:'<div style="width:18px;height:18px;border-radius:50%;background:#f5e6c8;border:2px solid #8a5a00;box-shadow:0 1px 3px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;color:#8a5a00;font:700 11px/1 sans-serif">✦</div>' });
  L.marker([u.lat, u.lon], {icon:di, title:u.n}).bindPopup(localPopup(u), {maxWidth:280}).addTo(localLayer);
});
if (LOCAL.some(function(u){ return u.lon != null; })) localLayer.addTo(map);

var gb = L.latLngBounds(SPOTS.concat(LODGING).map(function(s){ return [s.lat, s.lon]; }));
function fitAll(){ map.invalidateSize(); map.setView(gb.getCenter(), map.getBoundsZoom(gb, true, L.point(46,46)), {animate:false}); }
fitAll();
window.addEventListener('load', function(){ setTimeout(fitAll, 80); });
setTimeout(fitAll, 600);

function syncSubLayers(){
  var show = map.getZoom() >= 11;
  SPOTS.forEach(function(s){
    var g = subLayers[s.id];
    var pass = curFilter === 'all' || s.themes.indexOf(curFilter) >= 0;
    var want = show && pass;
    if (want) { if (!map.hasLayer(g)) g.addTo(map); }
    else if (map.hasLayer(g)) map.removeLayer(g);
  });
}
map.on('zoomend', syncSubLayers);
function syncTips(){
  var z = map.getZoom();
  tipSubs.forEach(function(m){
    var isSub = m.getIcon && m.getIcon().options.iconSize && m.getIcon().options.iconSize[0] <= 15;
    var want = z >= (isSub ? 12 : 8);
    if (want && map.hasLayer(m)) m.openTooltip(); else m.closeTooltip();
  });
}
map.on('zoomend', syncTips);

var curFilter = 'all';
var chipsEl = document.getElementById('chips');
var listEl = document.getElementById('list');
function buildChips(){
  chipsEl.innerHTML = '';
  var all = [['all','全部']].concat(Object.keys(CAT).map(function(k){ return [k, CAT[k].label]; }));
  all.forEach(function(p){
    var d = document.createElement('span');
    d.className = 'chip' + (curFilter === p[0] ? ' on' : '');
    d.textContent = p[1];
    if (curFilter === p[0] && p[0] !== 'all') d.style.background = CAT[p[0]].color;
    else if (curFilter === p[0]) d.style.background = 'var(--ink)';
    d.onclick = function(){ curFilter = p[0]; render(); };
    chipsEl.appendChild(d);
  });
}
function regionKey(s){
  for (var i = 0; i < REGION_ORDER.length; i++) if (s.region.indexOf(REGION_ORDER[i]) >= 0) return REGION_ORDER[i];
  return '其他';
}
function buildList(){
  listEl.innerHTML = '';
  var groups = {};
  SPOTS.forEach(function(s){
    if (curFilter !== 'all' && s.themes.indexOf(curFilter) < 0) return;
    var k = regionKey(s);
    (groups[k] = groups[k] || []).push(s);
  });
  REGION_ORDER.concat(['其他']).forEach(function(rg){
    if (!groups[rg] || !groups[rg].length) return;
    var g = document.createElement('div'); g.className = 'grp'; g.textContent = rg;
    listEl.appendChild(g);
    groups[rg].forEach(function(s){
      var d = document.createElement('div'); d.className = 'item'; d.dataset.pid = s.id;
      var row = document.createElement('div'); row.className = 'row';
      row.innerHTML = '<div class="num" style="background:' + CAT[s.cat].color + '">' + s.id + '</div>'
        + '<div><div class="nm">' + s.name + (s.g5 ? '<span class="badge b5a">5A</span>' : '') + (s.np ? '<span class="badge bnp">国家公园</span>' : '') + '</div>'
        + '<div class="meta">' + s.win + '</div></div>'
        + '<div class="arrow">▶</div>';
      d.appendChild(row);
      var subs = document.createElement('div'); subs.className = 'subs'; subs.style.setProperty('--sc', CAT[s.cat].color);
      s.subs.forEach(function(u){
        var r = document.createElement('div'); r.className = 'subrow';
        var yw = u.yaw != null ? u.yaw : subDefaultYaw(s, u);
        r.innerHTML = '<div class="sn">' + u.n
          + '<button class="p3dopen" title="人视模拟" data-lat="' + u.lat + '" data-lon="' + u.lon + '" data-name="' + u.n + '" data-yaw="' + yw.toFixed(0) + '">👁 人视</button></div>'
          + '<div class="st">' + u.tip + '</div>';
        r.onclick = function(ev){
          if (ev.target.closest && ev.target.closest('.p3dopen')) return;
          ev.stopPropagation();
          map.flyTo([u.lat, u.lon], Math.max(map.getZoom(), 13), {duration:.8});
          subLayers[s.id].addTo(map);
          setTimeout(function(){
            subLayers[s.id].eachLayer(function(ly){
              if (ly.getLatLng && Math.abs(ly.getLatLng().lat - u.lat) < 1e-6) ly.openPopup();
            });
          }, 850);
        };
        subs.appendChild(r);
      });
      d.appendChild(subs);
      row.onclick = function(){
        var open = d.classList.toggle('open');
        if (open) { map.flyTo([s.lat, s.lon], Math.max(map.getZoom(), 11), {duration:.8}); syncSubLayers(); }
      };
      listEl.appendChild(d);
    });
  });
  if (LODGING.length) {
    var sg = document.createElement('div'); sg.className = 'grp'; sg.textContent = '🛖 异形住宿';
    listEl.appendChild(sg);
    LODGING.forEach(function(u){
      var r = document.createElement('div'); r.className = 'stayrow';
      r.innerHTML = '<div class="sn">🛖 ' + u.n + '</div><div class="st">' + u.type + ' · ' + u.tip + '</div>';
      r.onclick = function(){
        map.flyTo([u.lat, u.lon], 13, {duration:.8});
        stayLayer.eachLayer(function(ly){
          if (ly.getLatLng && Math.abs(ly.getLatLng().lat - u.lat) < 1e-6) ly.openPopup();
        });
      };
      listEl.appendChild(r);
    });
  }
  if (LOCAL.length) {
    var lg = document.createElement('div'); lg.className = 'grp'; lg.textContent = '✦ 地方特色 · 节庆风物';
    listEl.appendChild(lg);
    LOCAL.forEach(function(u){
      var r = document.createElement('div'); r.className = 'stayrow';
      r.style.borderLeftColor = '#8a5a00'; r.style.background = '#faf6ec';
      r.innerHTML = '<div class="sn" style="color:#8a5a00">✦ ' + u.n + (u.month ? ' <span style="font-weight:400;color:#a08a5a">(' + u.month + ')</span>' : '') + '</div>'
        + '<div class="st">' + u.type + (u.region ? ' · ' + u.region : '') + ' · ' + u.tip + '</div>';
      r.onclick = function(){
        if (u.lon == null) return;
        map.flyTo([u.lat, u.lon], 11, {duration:.8});
        localLayer.eachLayer(function(ly){
          if (ly.getLatLng && Math.abs(ly.getLatLng().lat - u.lat) < 1e-6) ly.openPopup();
        });
      };
      listEl.appendChild(r);
    });
  }
  if (!listEl.children.length) listEl.innerHTML = '<div style="font-size:12px;color:var(--sub);padding:20px 4px">该题材暂无点位</div>';
}
function syncMarkers(){
  SPOTS.forEach(function(s){
    var show = curFilter === 'all' || s.themes.indexOf(curFilter) >= 0;
    if (show) { if (!map.hasLayer(markers[s.id])) markers[s.id].addTo(map); }
    else if (map.hasLayer(markers[s.id])) map.removeLayer(markers[s.id]);
  });
}
function render(){ buildChips(); buildList(); syncMarkers(); syncSubLayers(); }
render();

document.addEventListener('click', function(e){
  var b = e.target.closest ? e.target.closest('button[data-cp]') : null;
  if (!b) return;
  var txt = b.getAttribute('data-cp');
  function done(){ b.textContent = '已复制'; setTimeout(function(){ b.textContent = '复制坐标'; }, 1400); }
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, done);
  else { var ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); try{document.execCommand('copy');}catch(x){} document.body.removeChild(ta); done(); }
});
document.addEventListener('click', function(e){
  var b = e.target.closest ? e.target.closest('.p3dopen') : null;
  if (!b) return;
  if (!window.QIN || !QIN.pano) return;
  map.closePopup();
  QIN.pano.open({
    name: b.getAttribute('data-name'),
    lat: +b.getAttribute('data-lat'), lon: +b.getAttribute('data-lon'),
    yaw: +b.getAttribute('data-yaw') || 0,
    targets: allTargets()
  });
});
</script>
</body>
</html>
"""

STD_CATS = {
    "bloom": {"label": u"花海·山花", "color": "#d6336c"},
    "fall":  {"label": u"瀑布溪流", "color": "#0e9aa7"},
    "leaf":  {"label": u"红叶秋色", "color": "#e8590c"},
    "cloud": {"label": u"云海日出·星空", "color": "#7048e8"},
    "lake":  {"label": u"峡谷水体·地质", "color": "#2f9e44"},
    "bird":  {"label": u"冬季候鸟", "color": "#1c7ed6"},
    "culture": {"label": u"人文史迹·同框", "color": "#8a5a00"},
}

def main(path):
    d = json.load(io.open(path, encoding='utf-8'))
    if isinstance(d.get('calendar'), list):
        d['calendar'] = u'<br>'.join(d['calendar'])
    cats = dict(STD_CATS)
    for k, v in (d.get('cat_extra') or {}).items():
        cats[k] = v
    # 白名单字段（多余的 coord_confidence 等调试字段不进页面）
    keep_spot = ('id','name','region','lon','lat','alt','g5','np','cat','themes','win','note','tips','story','subs')
    keep_sub = ('n','lon','lat','yaw','tip')
    spots = []
    for s in d['spots']:
        s2 = {k: s[k] for k in keep_spot if k in s}
        s2['subs'] = [{k: u[k] for k in keep_sub if k in u} for u in s['subs']]
        spots.append(s2)
    lodging = [{k: u[k] for k in ('n','lon','lat','type','tip') if k in u} for u in (d.get('lodging') or [])]
    local = [{k: u[k] for k in ('n','type','region','month','tip','lon','lat') if k in u} for u in (d.get('local') or [])]
    html = (TPL
        .replace('__TITLE__', d['title'])
        .replace('__H1__', d['h1'])
        .replace('__ACCENT__', d['accent'])
        .replace('__SUBHEAD__', d['subhead'] % {'n': len(spots), 'm': sum(len(s['subs']) for s in spots), 'k': len(lodging)})
        .replace('__STAYHINT__', u'；🛖 为异形住宿' if lodging else '')
        .replace('__CALTITLE__', d.get('cal_title', u'季节日历'))
        .replace('__CALENDAR__', d['calendar'])
        .replace('__CAT__', json.dumps(cats, ensure_ascii=False))
        .replace('__SPOTS__', json.dumps(spots, ensure_ascii=False))
        .replace('__LODGING__', json.dumps(lodging, ensure_ascii=False))
        .replace('__LOCAL__', json.dumps(local, ensure_ascii=False))
        .replace('__REGION_ORDER__', json.dumps(d['region_order'], ensure_ascii=False))
        .replace('__MINZOOM__', str(d.get('min_zoom', 6)))
        .replace('__CLAT__', str(d['center'][0]))
        .replace('__CLON__', str(d['center'][1]))
        .replace('__ZINIT__', str(d.get('z_init', 7))))
    out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                       d['pinyin'] + '-map.html')
    io.open(out, 'w', encoding='utf-8', newline='\n').write(html)
    print('written', out, len(spots), u'景区', sum(len(s["subs"]) for s in spots), u'机位')

if __name__ == '__main__':
    main(sys.argv[1])
