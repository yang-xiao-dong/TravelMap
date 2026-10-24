/* 地图模块：SVG 渲染、省份缩放动画、点位形状（圆=自然 菱形=人文）与图例 */
(function (M) {
  'use strict';
  var model = null, geo = null;
  var mapEl, svg, world, dotLayer, photogLayer, selLayer, topLayer, labelLayer;
  var provLabels = [], spotLabels = [], photogLabels = [], baseSpotPts = [];
  var dragOn = false, dragMoved = false, dragStart = null;
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
    /* 尺寸按“屏幕像素”定义再除以 k：放大时点位屏幕大小恒定（仅轻微增大），不再膨胀 */
    var scrR = 3.3 + 0.3 * Math.min(Math.max(view.k - 1, 0), 4);
    var rr = scrR / view.k;
    var rs = 2 * scrR / view.k;
    var hr = 10 / view.k;
    var dim = view.k > 1.15 && !!curProv;
    var filter = M.state.catFilter;
    dotLayer.querySelectorAll('g.spotg').forEach(function (g) {
      var cat = g.getAttribute('data-cat');
      if (filter !== 'all' && cat !== filter) { g.style.display = 'none'; return; }
      g.style.display = '';
      var vis = g.querySelector('.vis'), halo = g.querySelector('.halo'), hit = g.querySelector('.hit');
      hit.setAttribute('r', hr);
      var cx = +vis.getAttribute('data-cx'), cy = +vis.getAttribute('data-cy');
      if (vis.tagName === 'circle') {
        vis.setAttribute('r', rr);
        halo.setAttribute('r', (rr + 1.3 / view.k).toFixed(2));
      } else {
        vis.setAttribute('x', (cx - rs / 2).toFixed(1));
        vis.setAttribute('y', (cy - rs / 2).toFixed(1));
        vis.setAttribute('width', rs.toFixed(1));
        vis.setAttribute('height', rs.toFixed(1));
        var hs = rs + 2.6 / view.k;
        halo.setAttribute('x', (cx - hs / 2).toFixed(1));
        halo.setAttribute('y', (cy - hs / 2).toFixed(1));
        halo.setAttribute('width', hs.toFixed(1));
        halo.setAttribute('height', hs.toFixed(1));
      }
      var p = g.getAttribute('data-prov');
      var inProv = !dim || p === curProv || (p === '兵团' && curProv === '新疆');
      vis.setAttribute('fill-opacity', (dim && !inProv) ? 0.15 : 0.92);
    });
    if (photogLayer) {
      photogLayer.style.display = M.state.photogOn ? '' : 'none';
      photogLayer.setAttribute('opacity', dim ? 0.35 : 1);
      var pr = Math.max(1, 1 / view.k);
      photogLayer.querySelectorAll('.pt-dot').forEach(function (c) { c.setAttribute('r', (1.6 * pr).toFixed(2)); });
      photogLayer.querySelectorAll('.pt-ring').forEach(function (c) { c.setAttribute('r', ((+c.getAttribute('data-r')) / view.k).toFixed(2)); });
      photogLayer.querySelectorAll('.pt-hit').forEach(function (c) { c.setAttribute('r', ((+c.getAttribute('data-hr')) / view.k).toFixed(2)); });
    }
    if (labelLayer) {
      var fs1 = (13 / view.k).toFixed(2), fs2 = (11 / view.k).toFixed(2);
      var sw1 = (3 / view.k).toFixed(2), sw2 = (2.6 / view.k).toFixed(2);
      var op1 = Math.max(0, Math.min(1, (view.k - 2.2) / 0.8));
      var op2 = Math.max(0, Math.min(1, (view.k - 4.2) / 1.2));
      var op3 = Math.max(0, Math.min(1, (view.k - 3.4) / 1.0));
      provLabels.forEach(function (t) { t.el.setAttribute('font-size', fs1); t.el.setAttribute('stroke-width', sw1); });
      spotLabels.forEach(function (t) { t.el.setAttribute('font-size', fs2); t.el.setAttribute('stroke-width', sw2); });
      photogLabels.forEach(function (t) { t.el.setAttribute('font-size', fs2); t.el.setAttribute('stroke-width', sw2); });
      declutter(op1, op3, op2);
    }
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

  function featureCenter(f) {
    var b = geo.boundsOf([f]);
    return baseP((b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2);
  }

  /* ---------- 自由导航：滚轮缩放 / 拖拽平移 ---------- */
  function svgPoint(e) {
    var r = svg.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }
  function zoomAt(mx, my, factor) {
    stopAnim();
    var k2 = Math.min(36, Math.max(1, view.k * factor));
    if (k2 === 1) { view = { k: 1, tx: 0, ty: 0 }; }
    else {
      var wx = (mx - view.tx) / view.k, wy = (my - view.ty) / view.k;
      view = { k: k2, tx: mx - wx * k2, ty: my - wy * k2 };
    }
    if (view.k <= 1.001) { view = { k: 1, tx: 0, ty: 0 }; curProv = null; drawSelStroke(); }
    applyView();
    updateBackBtn();
  }
  function freeNav() {
    if (curProv) { curProv = null; drawSelStroke(); }
    updateBackBtn();
  }
  function updateBackBtn() {
    var btn = document.getElementById('zoomBack');
    if (btn) btn.classList.toggle('show', view.k > 1.05);
  }
  function bindNav() {
    svg.addEventListener('wheel', function (e) {
      e.preventDefault();
      var pt = svgPoint(e);
      zoomAt(pt[0], pt[1], Math.pow(1.0016, -e.deltaY));
    }, { passive: false });
    svg.addEventListener('pointerdown', function (e) {
      dragOn = true; dragMoved = false;
      dragStart = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty };
    });
    svg.addEventListener('pointermove', function (e) {
      if (!dragOn) return;
      var dx = e.clientX - dragStart.x, dy = e.clientY - dragStart.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) {
        dragMoved = true;
        view.tx = dragStart.tx + dx;
        view.ty = dragStart.ty + dy;
        applyView();
      }
    });
    function endDrag() {
      if (!dragOn) return;
      dragOn = false;
      if (dragMoved) freeNav();
      setTimeout(function () { dragMoved = false; }, 60);
    }
    svg.addEventListener('pointerup', endDrag);
    svg.addEventListener('pointerleave', endDrag);
    svg.addEventListener('click', function (e) {
      if (dragMoved) { e.stopPropagation(); }
    }, true);
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
    photogLayer = el('g', { id: 'photog' }, world);
    model.photog.forEach(function (x) { drawPhotog(x); });

    var t = curProv ? targetViewFor(curProv) : { k: 1, tx: 0, ty: 0 };
    view = { k: t.k, tx: t.tx, ty: t.ty };
    buildLabels();
    applyView();
    drawSelStroke();
    drawLegend();
    updateBackBtn();
    bindNav();
  }

  function labelName(n) {
    /* 剥两层行政区划前缀：如“九江市庐山市庐山风景名胜区”→“庐山风景名胜区” */
    var rx = /^[^市州盟县]{1,12}?(市|地区|自治州|州|盟|县)/;
    var t = n.replace(rx, '').replace(rx, '');
    return t.length > 10 ? t.slice(0, 10) + '\u2026' : t;
  }
  function buildLabels() {
    provLabels = []; spotLabels = []; photogLabels = [];
    baseSpotPts = model.spots.map(function (s) { return baseP(s[3], s[4]); });
    labelLayer = el('g', { id: 'labels', 'pointer-events': 'none' }, world);
    model.china.features.forEach(function (f) {
      var c = featureCenter(f);
      var t = el('text', {
        x: c[0].toFixed(1), y: c[1].toFixed(1), 'text-anchor': 'middle',
        'class': 'm-label prov-label', fill: '#3d4a63'
      }, labelLayer);
      t.textContent = f.properties.name;
      provLabels.push({ el: t, x: c[0], y: c[1], len: f.properties.name.length + 2 });
    });
    /* 年份早者优先标注（2007 首批最经典），其余让位 */
    var order = model.spots.map(function (s, i) { return i; })
      .sort(function (a, b) { return model.spots[a][2] - model.spots[b][2]; });
    order.forEach(function (i) {
      var s = model.spots[i], xy = baseSpotPts[i];
      var meta = model.CATC[s[5]] || model.CATC.N;
      var t = el('text', {
        x: xy[0].toFixed(1), y: (xy[1] + 3.5).toFixed(1),
        'class': 'm-label spot-label', fill: meta.color
      }, labelLayer);
      var txt = labelName(s[0]);
      t.textContent = txt;
      spotLabels.push({ el: t, x: xy[0], y: xy[1], len: txt.length, cat: s[5] });
    });
    model.photog.forEach(function (x) {
      var xy = baseP(x.lon, x.lat);
      var t = el('text', {
        x: xy[0].toFixed(1), y: (xy[1] + 4).toFixed(1),
        'class': 'm-label photog-label', fill: '#5b48c8'
      }, labelLayer);
      var txt = '\u25ce ' + x.n + ' ' + x.cnt;
      t.textContent = txt;
      photogLabels.push({ el: t, x: xy[0], y: xy[1], len: txt.length });
    });
  }

  /* 屏幕空间标注抽稀：省名 → 点位障碍 → 实拍名 → 景区名，放不下即隐藏；
     标注坐标逐帧换算为屏幕位置，保证任意缩放级别都紧贴点位 */
  function declutter(opProv, opPhotog, opSpot) {
    var placed = [];
    function hit(r) {
      for (var i = 0; i < placed.length; i++) {
        var q = placed[i];
        if (!(r.x1 < q.x0 || r.x0 > q.x1 || r.y1 < q.y0 || r.y0 > q.y1)) return true;
      }
      return false;
    }
    function tryPlace(lab, anchorLeft, fs, targetOp) {
      if (targetOp <= 0.02) { lab.el.style.opacity = 0; return; }
      var sx = view.k * lab.x + view.tx, sy = view.k * lab.y + view.ty;
      var w = lab.len * fs + 12, h = fs + 8;
      var x0 = anchorLeft ? sx + 9 : sx - w / 2;
      var y0 = sy - h / 2;
      if (x0 < 2 || x0 + w > W - 2 || y0 < 2 || y0 + h > H - 2) { lab.el.style.opacity = 0; return; }
      var r = { x0: x0, y0: y0, x1: x0 + w, y1: y0 + h };
      if (hit(r)) { lab.el.style.opacity = 0; return; }
      placed.push(r);
      lab.el.style.opacity = targetOp;
      var wx = (x0 - view.tx) / view.k;
      if (!anchorLeft) wx = (x0 + w / 2 - view.tx) / view.k;
      var wy = (y0 + h / 2 + fs * 0.36 - view.ty) / view.k;
      lab.el.setAttribute('x', wx.toFixed(2));
      lab.el.setAttribute('y', wy.toFixed(2));
    }
    provLabels.forEach(function (l) { tryPlace(l, false, 13, opProv); });
    /* 可见点位本身作为障碍，避免标注压住别的点 */
    var f = M.state.catFilter;
    spotLabels.forEach(function (l) {
      if (f !== 'all' && l.cat !== f) { l.el.style.opacity = 0; return; }
      var sx = view.k * l.x + view.tx, sy = view.k * l.y + view.ty;
      /* 菱形旋转后边界框更宽，避让盒按形状取半宽：菱形 9px、圆点 7px */
      var m = l.cat === 'C' ? 9 : 7;
      placed.push({ x0: sx - m, y0: sy - m, x1: sx + m, y1: sy + m });
    });
    if (M.state.photogOn) photogLabels.forEach(function (l) { tryPlace(l, true, 11, opPhotog); });
    else photogLabels.forEach(function (l) { l.el.style.opacity = 0; });
    spotLabels.forEach(function (l) {
      if (f !== 'all' && l.cat !== f) return;
      tryPlace(l, true, 11, opSpot);
    });
  }

  function drawSpot(s) {
    var xy = baseP(s[3], s[4]);
    var cx = +xy[0].toFixed(1), cy = +xy[1].toFixed(1);
    var cat = s[5], meta = model.CATC[cat] || model.CATC.N;
    var g = el('g', { 'data-prov': s[1], 'data-cat': cat, 'class': 'spotg' }, dotLayer);
    var shapeG = el('g', { 'class': 'shape' }, g);
    /* 白色光晕底衬：保证点在任何省份填色上都醒目 */
    var halo = {
      'class': 'halo', 'data-cx': cx, 'data-cy': cy,
      fill: '#ffffff', 'fill-opacity': .88, 'pointer-events': 'none'
    };
    var common = {
      'class': 'vis', 'data-cx': cx, 'data-cy': cy,
      fill: meta.color, 'fill-opacity': .95,
      stroke: '#ffffff', 'stroke-width': 1, 'vector-effect': 'non-scaling-stroke',
      'pointer-events': 'none'
    };
    if (cat === 'C') {
      el('rect', mixin({ x: cx - 4.2, y: cy - 4.2, width: 8.4, height: 8.4, transform: 'rotate(45 ' + cx + ' ' + cy + ')' }, halo), shapeG);
      el('rect', mixin({ x: cx - 2.8, y: cy - 2.8, width: 5.6, height: 5.6, transform: 'rotate(45 ' + cx + ' ' + cy + ')' }, common), shapeG);
    } else {
      el('circle', mixin({ cx: cx, cy: cy, r: 4.6 }, halo), shapeG);
      el('circle', mixin({ cx: cx, cy: cy, r: 3.4 }, common), shapeG);
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
  function drawPhotog(x) {
    var xy = baseP(x.lon, x.lat);
    var cx = +xy[0].toFixed(1), cy = +xy[1].toFixed(1);
    var ringR = 4.2 + 3.8 * Math.pow(x.cnt / model.photogMax, 0.6);
    var g = el('g', { 'class': 'photog-item' }, photogLayer);
    el('circle', {
      'class': 'pt-ring', cx: cx, cy: cy, r: ringR.toFixed(1), 'data-r': ringR.toFixed(1),
      fill: 'none', stroke: '#6d5ae0', 'stroke-width': 1.4, 'stroke-opacity': .85,
      'vector-effect': 'non-scaling-stroke', 'pointer-events': 'none'
    }, g);
    el('circle', {
      'class': 'pt-dot', cx: cx, cy: cy, r: 1.6,
      fill: '#6d5ae0', 'pointer-events': 'none'
    }, g);
    var hit = el('circle', {
      'class': 'pt-hit', cx: cx, cy: cy, r: Math.max(9, ringR + 3), 'data-hr': Math.max(9, ringR + 3), fill: 'transparent',
      'data-tooltip': '◎ Thomas 实拍坐标\n' + x.n + ' · ' + x.cnt + ' 张作品 · ' + M.app.fmtCoord(x.lon, x.lat)
    }, g);
    hit.style.cursor = 'pointer';
    hit.addEventListener('click', function (e) {
      e.stopPropagation();
      window.open('https://cn.chuweimin.com/spot-gallery', '_blank', 'noopener');
    });
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
    var f = M.state.catFilter;
    var itN = document.createElement('span'); itN.className = 'it' + (f === 'C' ? ' dim' : '');
    var swN = document.createElement('span'); swN.className = 'sw';
    swN.style.background = model.CATC.N.color; swN.style.borderRadius = '50%';
    itN.appendChild(swN); itN.appendChild(document.createTextNode('自然'));
    lg.appendChild(itN);
    var f2 = M.state.photogOn;
    var itP = document.createElement('span'); itP.className = 'it' + (f2 ? '' : ' dim');
    var swP = document.createElement('span'); swP.className = 'sw';
    swP.style.background = 'none'; swP.style.border = '2px solid #6d5ae0'; swP.style.borderRadius = '50%';
    itP.appendChild(swP); itP.appendChild(document.createTextNode('实拍'));
    lg.appendChild(itP);
    var itC = document.createElement('span'); itC.className = 'it' + (f === 'N' ? ' dim' : '');
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
    redrawLegend: drawLegend,
    currentK: function () { return view.k; },
    zoomStep: function (factor) { zoomAt(W / 2, H / 2, factor); },
    resetView: function () {
      stopAnim();
      curProv = null;
      animateTo({ k: 1, tx: 0, ty: 0 });
      drawSelStroke();
      updateBackBtn();
    },
    pulse: pulseAt,
    get currentProv() { return curProv; }
  };
})(window.M5A = window.M5A || {});
