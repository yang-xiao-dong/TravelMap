/* 地图模块：SVG 渲染、省份缩放动画、点位形状（圆=自然 菱形=人文）与图例 */
(function (M) {
  'use strict';
  var model = null, geo = null;
  var mapEl, svg, world, dotLayer, selLayer, topLayer;
  var W = 0, H = 0, baseP = null;
  var CHINA_BOUNDS = null;
  var view = { k: 1, tx: 0, ty: 0 };
  var animId = null;
  var curProv = null;         // 当前地图视口对应的省份（null=全国）

  var SVGNS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent) {
    var e = document.createElementNS(SVGNS, tag);
    for (var a in attrs) if (attrs.hasOwnProperty(a)) e.setAttribute(a, attrs[a]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function hex2rgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  var LO = hex2rgb('#e9eff8'), HI = hex2rgb('#1f5fa8');
  function ramp(t) {
    var r = Math.round(LO[0] + (HI[0] - LO[0]) * t), g = Math.round(LO[1] + (HI[1] - LO[1]) * t), b = Math.round(LO[2] + (HI[2] - LO[2]) * t);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }
  function tFor(n) { return n <= 0 ? 0 : Math.pow(n / model.maxCount, 0.7); }

  function ringPath(ring) {
    var d = '', p;
    for (var i = 0; i < ring.length; i++) {
      p = baseP(ring[i][0], ring[i][1]);
      d += (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1);
    }
    return d + 'Z';
  }
  function featPath(geom) {
    var c = geom.coordinates, out = [];
    if (geom.type === 'Polygon') { for (var i = 0; i < c.length; i++) out.push(ringPath(c[i])); }
    else { for (var i = 0; i < c.length; i++) for (var j = 0; j < c[i].length; j++) out.push(ringPath(c[i][j])); }
    return out.join('');
  }

  /* ---------- 缩放 ---------- */
  function targetViewFor(provName) {
    if (!provName) return { k: 1, tx: 0, ty: 0 };
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    (function walk(c) {
      if (typeof c[0] === 'number' && typeof c[1] === 'number') {
        var p = baseP(c[0], c[1]);
        x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]);
        x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]);
        return;
      }
      for (var i = 0; i < c.length; i++) walk(c[i]);
    })(model.featIdx[provName].geometry.coordinates);
    var pad = 42, w = x1 - x0, h = y1 - y0;
    var k = Math.max(1, Math.min(Math.min((W - 2 * pad) / w, (H - 2 * pad) / h), 9));
    return { k: k, tx: W / 2 - k * (x0 + w / 2), ty: H / 2 - k * (y0 + h / 2) };
  }
  function applyView() {
    world.setAttribute('transform', 'translate(' + view.tx.toFixed(2) + ',' + view.ty.toFixed(2) + ') scale(' + view.k.toFixed(4) + ')');
    var rr = Math.max(1.8, 3.2 / view.k);
    var rs = Math.max(3.8, 5.4 / view.k);
    var hr = Math.max(4, 9 / view.k);
    var dim = view.k > 1.15;
    var filter = M.state.catFilter;
    dotLayer.querySelectorAll('g.spotg').forEach(function (g) {
      var cat = g.getAttribute('data-cat');
      if (filter !== 'all' && cat !== filter) { g.style.display = 'none'; return; }
      g.style.display = '';
      var vis = g.querySelector('.vis'), hit = g.querySelector('.hit');
      hit.setAttribute('r', hr);
      if (vis.tagName === 'circle') vis.setAttribute('r', rr);
      else {
        var cx = +vis.getAttribute('data-cx'), cy = +vis.getAttribute('data-cy');
        vis.setAttribute('x', (cx - rs / 2).toFixed(1));
        vis.setAttribute('y', (cy - rs / 2).toFixed(1));
        vis.setAttribute('width', rs.toFixed(1));
        vis.setAttribute('height', rs.toFixed(1));
      }
      var p = g.getAttribute('data-prov');
      var inProv = !dim || p === curProv || (p === '兵团' && curProv === '新疆');
      vis.setAttribute('fill-opacity', (dim && !inProv) ? 0.15 : 0.92);
    });
  }
  function stopAnim() { if (animId) { cancelAnimationFrame(animId); animId = null; } }
  function animateTo(target, dur) {
    stopAnim();
    /* 兜底：隐藏页签下 rAF 停摆时直接就位 */
    var guard = setTimeout(function () {
      stopAnim();
      view.k = target.k; view.tx = target.tx; view.ty = target.ty;
      applyView();
    }, (dur || 620) + 80);
    var from = { k: view.k, tx: view.tx, ty: view.ty };
    var t0 = performance.now();
    function ease(u) { return u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; }
    function frame(now) {
      var u = Math.min(1, (now - t0) / (dur || 620));
      var e = ease(u);
      view.k = from.k + (target.k - from.k) * e;
      view.tx = from.tx + (target.tx - from.tx) * e;
      view.ty = from.ty + (target.ty - from.ty) * e;
      applyView();
      if (u < 1) animId = requestAnimationFrame(frame);
      else { animId = null; clearTimeout(guard); }
    }
    animId = requestAnimationFrame(frame);
  }

  function pulseAt(lon, lat) {
    var base = baseP(lon, lat);
    var t0 = performance.now(), dur = 3200;
    function frame(now) {
      var u = (now - t0) / dur;
      topLayer.innerHTML = '';
      if (u >= 1) return;
      var cyc = (u * 3) % 1;
      el('circle', {
        cx: (view.k * base[0] + view.tx).toFixed(1),
        cy: (view.k * base[1] + view.ty).toFixed(1),
        r: (5 + cyc * 22).toFixed(1),
        fill: 'none', stroke: '#e5484d', 'stroke-width': 2.2,
        opacity: (0.9 * (1 - cyc)).toFixed(2)
      }, topLayer);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---------- 绘制 ---------- */
  function drawBase() {
    var rect = mapEl.getBoundingClientRect();
    W = Math.max(320, Math.round(rect.width));
    H = Math.max(380, Math.round(rect.height));
    baseP = geo.fitProjector(CHINA_BOUNDS, W, H, 6);
    mapEl.innerHTML = '';
    svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': '全国5A级旅游景区分布地图，共' + model.distinct + '家' }, mapEl);
    var defs = el('defs', {}, svg);
    var grad = el('linearGradient', { id: 'sea', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: '0%', 'stop-color': '#f6f8fb' }, grad);
    el('stop', { offset: '100%', 'stop-color': '#edf1f6' }, grad);
    el('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#sea)' }, svg);
    world = el('g', {}, svg);
    topLayer = el('g', { 'pointer-events': 'none' }, svg);

    model.china.features.forEach(function (f) {
      var name = f.properties.name, n = model.counts[name] || 0;
      var p = el('path', {
        d: featPath(f.geometry),
        fill: n > 0 ? ramp(tFor(n)) : '#f0f2f6',
        stroke: '#ffffff', 'stroke-width': 1, 'vector-effect': 'non-scaling-stroke',
        'data-tooltip': name + ' · ' + n + ' 家5A'
      }, world);
      p.style.cursor = 'pointer';
      p.style.transition = 'fill .25s';
      p.addEventListener('mouseenter', function () { p.setAttribute('stroke', '#7ea4d2'); });
      p.addEventListener('mouseleave', function () { p.setAttribute('stroke', '#ffffff'); });
      p.addEventListener('click', function () { M.app.onProvClick(name); });
    });

    selLayer = el('g', {}, world);
    dotLayer = el('g', { id: 'dots' }, world);
    model.spots.forEach(function (s) { drawSpot(s); });

    var t = curProv ? targetViewFor(curProv) : { k: 1, tx: 0, ty: 0 };
    view = { k: t.k, tx: t.tx, ty: t.ty };
    applyView();
    drawSelStroke();
    drawLegend();
  }

  function drawSpot(s) {
    var xy = baseP(s[3], s[4]);
    var cx = +xy[0].toFixed(1), cy = +xy[1].toFixed(1);
    var cat = s[5], meta = model.CATC[cat] || model.CATC.N;
    var g = el('g', { 'data-prov': s[1], 'data-cat': cat, 'class': 'spotg' }, dotLayer);
    var shapeG = el('g', { 'class': 'shape' }, g);
    var common = {
      'class': 'vis', 'data-cx': cx, 'data-cy': cy,
      fill: meta.color, 'fill-opacity': .92,
      stroke: '#fff', 'stroke-width': 0.8, 'stroke-opacity': .95, 'vector-effect': 'non-scaling-stroke',
      'pointer-events': 'none'
    };
    if (cat === 'C') {
      el('rect', mixin({ x: cx - 2.7, y: cy - 2.7, width: 5.4, height: 5.4, transform: 'rotate(45 ' + cx + ' ' + cy + ')' }, common), shapeG);
    } else {
      el('circle', mixin({ r: 3.2 }, common), shapeG);
    }
    var shared = s[0].indexOf('壶口') >= 0 ? '（晋陕合评）' : '';
    var hit = el('circle', {
      'class': 'hit',
      cx: cx, cy: cy, r: 9, fill: 'transparent',
      'data-tooltip': meta.label + ' · ' + s[0] + shared + '\n' + s[1] + ' · ' + s[2] + '年 · ' + M.app.fmtCoord(s[3], s[4])
    }, g);
    hit.style.cursor = 'pointer';
    hit.addEventListener('mouseenter', function () {
      shapeG.setAttribute('transform', 'translate(' + cx + ',' + cy + ') scale(1.8) translate(' + (-cx) + ',' + (-cy) + ')');
    });
    hit.addEventListener('mouseleave', function () { shapeG.removeAttribute('transform'); });
    hit.addEventListener('click', function (e) { e.stopPropagation(); M.app.onSpotClick(s); });
  }
  function mixin(a, b) { var o = {}; for (var k in b) o[k] = b[k]; for (var k2 in a) o[k2] = a[k2]; return o; }

  function drawSelStroke() {
    if (!selLayer) return;
    selLayer.innerHTML = '';
    if (!curProv) return;
    el('path', {
      d: featPath(model.featIdx[curProv].geometry),
      fill: 'none', stroke: '#173a63', 'stroke-width': 2,
      'vector-effect': 'non-scaling-stroke', 'pointer-events': 'none'
    }, selLayer);
    world.appendChild(dotLayer);
  }

  function drawLegend() {
    var lg = document.getElementById('legend');
    lg.innerHTML = '5A 家数';
    [[1, 5], [6, 10], [11, 15], [16, 99]].forEach(function (st) {
      var it = document.createElement('span');
      it.className = 'it';
      var sw = document.createElement('span');
      sw.className = 'sw';
      sw.style.background = ramp(tFor((st[0] + Math.min(st[1], model.maxCount)) / 2));
      it.appendChild(sw);
      it.appendChild(document.createTextNode(st[1] > model.maxCount ? st[0] + '+' : st[0] + '–' + st[1]));
      lg.appendChild(it);
    });
    var dv = document.createElement('span');
    dv.className = 'divider';
    lg.appendChild(dv);
    var itN = document.createElement('span'); itN.className = 'it';
    var swN = document.createElement('span'); swN.className = 'sw';
    swN.style.background = model.CATC.N.color; swN.style.borderRadius = '50%';
    itN.appendChild(swN); itN.appendChild(document.createTextNode('自然'));
    lg.appendChild(itN);
    var itC = document.createElement('span'); itC.className = 'it';
    var swC = document.createElement('span'); swC.className = 'sw';
    swC.style.background = model.CATC.C.color; swC.style.transform = 'rotate(45deg)'; swC.style.borderRadius = '2px';
    itC.appendChild(swC); itC.appendChild(document.createTextNode('人文'));
    lg.appendChild(itC);
  }

  /* ---------- 对外接口 ---------- */
  M.map = {
    init: function (container) {
      model = M.model; geo = M.geo;
      mapEl = container;
      CHINA_BOUNDS = geo.boundsOf(model.china.features);
      drawBase();
    },
    redraw: drawBase,
    /* 切换省份视口；name 为 null 回全国 */
    setViewProv: function (name, instant) {
      curProv = name;
      var t = targetViewFor(name);
      if (instant) { stopAnim(); view = { k: t.k, tx: t.tx, ty: t.ty }; applyView(); drawSelStroke(); }
      else { animateTo(t); drawSelStroke(); }
    },
    applyFilter: applyView,
    pulse: pulseAt,
    get currentProv() { return curProv; }
  };
})(window.M5A = window.M5A || {});
