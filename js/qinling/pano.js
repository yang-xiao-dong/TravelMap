/* ============================================================
   QIN.pano — 机位人视模拟模块
   站在机位上，用真实 DEM 渲染眼前能看到的地平线山形：
   逐列视线积分（体素地平线法）+ 地球曲率 + 太阳方位光照
   + 大气透视 + 景点视线遮挡判断（LOS）+ 方位罗盘。
   交互：拖拽环顾/俯仰、滚轮变焦、时间/视高（人眼~无人机）、
        自动环顾、方向键微调、Esc 关闭。
   依赖：QIN.dem、QIN.sun
   对外：QIN.pano.open(opt) / set(opt) / state() / close()
   ============================================================ */
window.QIN = window.QIN || {};
QIN.pano = (function () {
  'use strict';
  var RAD = Math.PI / 180, DEG = 180 / Math.PI;
  var CURV = 7.8486e-8;            /* 1/(2R)：曲率每米²落差 */
  var M_LON = 0, M_LAT = 110574;   /* 每度经/纬的米数（按视点纬度定） */
  var st = null, D = {}, lastOpt = null;

  /* ---------- 工具 ---------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function angD(d) { d = (d + 180) % 360; if (d < 0) d += 360; return d - 180; }
  function lerp3(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function dirName(az) { return ['北', '东北', '东', '东南', '南', '西南', '西', '西北'][Math.round(((az % 360) + 360) % 360 / 45) % 8]; }
  function bearing(la1, lo1, la2, lo2) {
    var y = Math.sin((lo2 - lo1) * RAD) * Math.cos(la2 * RAD);
    var x = Math.cos(la1 * RAD) * Math.sin(la2 * RAD) - Math.sin(la1 * RAD) * Math.cos(la2 * RAD) * Math.cos((lo2 - lo1) * RAD);
    return Math.atan2(y, x) * DEG;
  }
  function distM(la1, lo1, la2, lo2) {
    var x = (lo2 - lo1) * M_LON, y = (la2 - la1) * M_LAT;
    return Math.sqrt(x * x + y * y);
  }
  function hhmm(h) {
    var m = Math.round(h * 60);
    return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2);
  }

  /* ---------- 配色（优先卫星影像纹理，回退秦岭垂直带谱 + 天光） ---------- */
  function skyColors(el) {
    if (el >= 20) return { top: [74, 120, 178], hor: [188, 208, 222] };
    if (el >= 4) { var t = (el - 4) / 16;
      return { top: lerp3([70, 102, 158], [74, 120, 178], t), hor: lerp3([246, 192, 138], [188, 208, 222], t) }; }
    if (el >= -6) { var t2 = (el + 6) / 10;
      return { top: lerp3([36, 44, 76], [70, 102, 158], t2), hor: lerp3([150, 110, 104], [246, 192, 138], t2) }; }
    return { top: [22, 28, 52], hor: [110, 92, 100] };
  }
  function terrBase(h) {
    if (h < 900) return [128, 130, 98];    /* 山麓农田灌丛 */
    if (h < 1600) return [98, 124, 76];    /* 阔叶林带 */
    if (h < 2300) return [70, 104, 66];    /* 针阔混交 */
    if (h < 2700) return [92, 104, 72];    /* 桦林/针叶 */
    if (h < 3000) return [140, 130, 96];   /* 亚高山草甸/岩屑 */
    return [170, 162, 146];                /* 高山流石滩 */
  }

  /* ---------- 视线步进距离（几何级数：近密远疏） ---------- */
  var DS = (function () { var a = [], d = 2.5; while (d < 26000) { a.push(d); d *= 1.0175; } return a; })();
  var GX = 38; /* 求坡向的法向采样间距（米） */

  /* ---------- DOM ---------- */
  function ensureStyle() {
    if (document.getElementById('qin-pano-style')) return;
    var s = document.createElement('style');
    s.id = 'qin-pano-style';
    s.textContent = [
      '.p3d-mask{position:fixed;inset:0;z-index:9000;background:#0b0f16;display:flex;flex-direction:column}',
      '.p3d-top{display:flex;align-items:center;gap:14px;padding:8px 14px;background:#101722;color:#dbe4f0;border-bottom:1px solid #22304a;flex-wrap:wrap}',
      '.p3d-x{flex:none;border:none;background:#22304a;color:#dbe4f0;font-size:14px;width:30px;height:30px;border-radius:7px;cursor:pointer}',
      '.p3d-x:hover{background:#e5484d;color:#fff}',
      '.p3d-title{min-width:220px;max-width:34vw}',
      '.p3d-title b{font-size:14px;line-height:1.3}',
      '.p3d-stat{font-size:11.5px;color:#9fb0c8;display:block;min-height:17px;margin-top:2px;font-variant-numeric:tabular-nums}',
      '.p3d-stat.err{color:#ff9d9d}',
      '.p3d-ctl{display:flex;gap:16px;align-items:center;margin-left:auto;flex-wrap:wrap}',
      '.p3d-ctl label{display:flex;align-items:center;gap:7px;font-size:12px;color:#c7d3e4;white-space:nowrap}',
      '.p3d-ctl input[type=range]{width:118px;accent-color:#4f8fd6}',
      '.p3d-ctl .p3d-v{font-variant-numeric:tabular-nums;min-width:44px;color:#e8eef7}',
      '.p3d-auto{border:1px solid #37507a;background:#16233a;color:#cfe0f5;font-size:12px;border-radius:7px;padding:4px 12px;cursor:pointer}',
      '.p3d-auto.on{background:#2f9e44;border-color:#2f9e44;color:#fff}',
      '.p3d-retry{margin-left:8px;border:none;background:#e5484d;color:#fff;font-size:11px;border-radius:5px;padding:2px 9px;cursor:pointer}',
      '.p3d-stage{position:relative;flex:1;min-height:0;cursor:grab;overflow:hidden}',
      '.p3d-stage:active{cursor:grabbing}',
      '.p3d-t{position:absolute;inset:0;width:100%;height:100%;display:block}',
      '.p3d-h{position:absolute;inset:0;display:block}',
      '.p3d-hint{position:absolute;left:50%;transform:translateX(-50%);bottom:56px;font-size:11.5px;color:rgba(255,255,255,.72);background:rgba(8,12,18,.55);padding:3px 13px;border-radius:999px;pointer-events:none;white-space:nowrap}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function buildDom() {
    ensureStyle();
    var m = document.createElement('div');
    m.className = 'p3d-mask';
    m.innerHTML =
      '<div class="p3d-top">'
      + '<button class="p3d-x" title="关闭 (Esc)">✕</button>'
      + '<div class="p3d-title"><b></b><span class="p3d-stat"></span></div>'
      + '<div class="p3d-ctl">'
      + '<label>时间<input type="range" class="p3d-hr" min="4.5" max="20.5" step="0.05"><span class="p3d-v p3d-hrv"></span></label>'
      + '<label>视高<input type="range" class="p3d-eh" min="0" max="1" step="0.002"><span class="p3d-v p3d-ehv"></span></label>'
      + '<button class="p3d-auto">▶ 自动环顾</button>'
      + '</div></div>'
      + '<div class="p3d-stage"><canvas class="p3d-t"></canvas><canvas class="p3d-h"></canvas>'
      + '<div class="p3d-hint">拖动环顾 / 上下俯仰 · 滚轮变焦 · 方向键微调（Shift 加速）· Esc 关闭</div></div>';
    document.body.appendChild(m);
    D = {
      mask: m, stage: m.querySelector('.p3d-stage'),
      t: m.querySelector('.p3d-t'), h: m.querySelector('.p3d-h'),
      tctx: null, hctx: null,
      title: m.querySelector('.p3d-title b'), stat: m.querySelector('.p3d-stat'),
      hr: m.querySelector('.p3d-hr'), hrv: m.querySelector('.p3d-hrv'),
      eh: m.querySelector('.p3d-eh'), ehv: m.querySelector('.p3d-ehv'),
      auto: m.querySelector('.p3d-auto'), x: m.querySelector('.p3d-x')
    };
    D.tctx = D.t.getContext('2d');
    D.hctx = D.h.getContext('2d');
    D.title.textContent = st.name + ' · 人视模拟';
    D.hr.value = st.hour;
    D.eh.value = Math.log(st.eyeH / 1.7) / Math.log(300);
    sizeCanvases();
    syncCtl();
  }

  function sizeCanvases() {
    var w = D.stage.clientWidth || 900, h = D.stage.clientHeight || 520;
    var tW = clamp(Math.round(w * 0.5), 360, 840);
    var tH = clamp(Math.round(tW * h / w), 200, 800);
    D.t.width = tW; D.t.height = tH;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    D.h.width = Math.round(w * dpr); D.h.height = Math.round(h * dpr);
    D.hctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    D.cssW = w; D.cssH = h;
  }

  function status(msg, isErr) {
    D.stat.className = 'p3d-stat' + (isErr ? ' err' : '');
    D.stat.textContent = msg;
    if (isErr) {
      var b = document.createElement('button');
      b.className = 'p3d-retry'; b.textContent = '重试';
      b.onclick = function () { if (lastOpt) open(lastOpt); };
      D.stat.appendChild(document.createTextNode(' '));
      D.stat.appendChild(b);
    }
  }
  function syncCtl() {
    D.hrv.textContent = hhmm(st.hour);
    D.ehv.textContent = (st.eyeH < 10 ? st.eyeH.toFixed(1) : Math.round(st.eyeH)) + ' m';
  }

  /* ---------- 可见性（LOS：机位到各景点是否被山体遮挡） ---------- */
  function losClear(lo1, la1, h1, lo2, la2, h2, d) {
    var g = st.grid, N = 72;
    for (var i = 1; i < N; i++) {
      var t = i / N;
      var hT = g.sample(lo1 + (lo2 - lo1) * t, la1 + (la2 - la1) * t);
      if (hT !== hT) continue;
      var hL = h1 + (h2 - h1) * t - t * (1 - t) * d * d * CURV;
      if (hT + 2 > hL) return false;
    }
    return true;
  }
  function computeVis() {
    var out = [];
    st.targets.forEach(function (t) {
      var d = distM(st.lat, st.lon, t.lat, t.lon);
      if (d < 400 || d > 48000) return;
      var h = st.grid.sample(t.lon, t.lat);
      if (h !== h) return;
      if (losClear(st.lon, st.lat, st.hEye, t.lon, t.lat, h + 8, d)) {
        out.push({ name: t.name, az: bearing(st.lat, st.lon, t.lat, t.lon), d: d, h: h });
      }
    });
    out.sort(function (a, b) { return a.d - b.d; });
    st.vis = out;
  }

  /* ---------- 地形渲染 ---------- */
  function segColor(lon, lat, h, d, g, sdx, sdy, sdz, amb, lc, hor) {
    var hx2 = g.sample(lon + GX / M_LON, lat), hx1 = g.sample(lon - GX / M_LON, lat);
    var hy2 = g.sample(lon, lat + GX / M_LAT), hy1 = g.sample(lon, lat - GX / M_LAT);
    var gx = (hx1 === hx1 && hx2 === hx2) ? (hx2 - hx1) / (2 * GX) : 0;
    var gy = (hy1 === hy1 && hy2 === hy2) ? (hy2 - hy1) / (2 * GX) : 0;
    var nl = Math.sqrt(gx * gx + gy * gy + 1);
    var lam = clamp((-gx * sdx - gy * sdy + sdz) / nl, 0, 1);
    var li = amb + (1 - amb) * lam;
    /* 优先卫星影像反照率（湖面/湿地/城市真实呈现）：
       双线性已消像素块；轻提亮 + 与海拔色带混色 35%，避免色块跳变 */
    var a = st.tex ? st.tex.sample(lon, lat) : null, b, t, base = terrBase(h);
    if (a) {
      var m = 0.65;
      b = [clamp(((a[0] - 128) * 1.05 + 132) * m + base[0] * (1 - m), 0, 255),
           clamp(((a[1] - 128) * 1.05 + 132) * m + base[1] * (1 - m), 0, 255),
           clamp(((a[2] - 128) * 1.05 + 132) * m + base[2] * (1 - m), 0, 255)];
      t = (1 - Math.exp(-d / 9000)) * 0.8;
    } else {
      b = base;
      t = (1 - Math.exp(-d / 9000)) * 0.88;
    }
    var r = b[0] * li * lc[0] / 255, gg = b[1] * li * lc[1] / 255, bb = b[2] * li * lc[2] / 255;
    r += (hor[0] - r) * t; gg += (hor[1] - gg) * t; bb += (hor[2] - bb) * t;
    return 'rgb(' + (r | 0) + ',' + (gg | 0) + ',' + (bb | 0) + ')';
  }

  function render() {
    var W = D.t.width, H = D.t.height, g = st.grid, ctx = D.tctx;
    var sun = QIN.sun.position(st.day, st.hour, st.lat, st.lon);
    var sc = skyColors(sun.el);

    /* 天空 */
    var grd = ctx.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, 'rgb(' + sc.top.join(',') + ')');
    grd.addColorStop(1, 'rgb(' + sc.hor.join(',') + ')');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);

    var f = (W / 2) / Math.tan(st.fov * RAD / 2);
    var cy = H / 2 + f * Math.tan(st.pitch * RAD);

    /* 太阳光晕（画在地形之前，山体自然遮挡） */
    var sd = angD(sun.az - st.yaw);
    if (Math.abs(sd) < st.fov / 2 + 6 && sun.el > -4) {
      var sx = W / 2 + f * Math.tan(sd * RAD), sy = cy - f * Math.tan(sun.el * RAD);
      var rr = Math.max(6, f * 0.05), warm = sun.el < 15;
      var sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, rr * 4);
      sg.addColorStop(0, warm ? 'rgba(255,214,150,.95)' : 'rgba(255,248,230,.95)');
      sg.addColorStop(.25, warm ? 'rgba(255,180,110,.55)' : 'rgba(255,240,210,.5)');
      sg.addColorStop(1, 'rgba(255,200,140,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(sx - rr * 4, sy - rr * 4, rr * 8, rr * 8);
    }

    /* 平行光方向与光色（黄昏暖 / 白天白 / 晨昏冷） */
    var su = Math.max(sun.el, -5);
    var lc = sun.el >= 15 ? [255, 252, 244]
      : sun.el >= 0 ? lerp3([255, 190, 130], [255, 252, 244], sun.el / 15)
      : lerp3([150, 155, 190], [255, 190, 130], clamp((sun.el + 8) / 8, 0, 1));
    var sdx = Math.sin(sun.az * RAD) * Math.cos(su * RAD);
    var sdy = Math.cos(sun.az * RAD) * Math.cos(su * RAD);
    var sdz = Math.sin(su * RAD);
    var amb = sun.el > 0 ? 0.34 : 0.26;

    /* 逐列视线积分：ytop 从画布底部起（而非地平线），
       保证峰顶俯瞰时视平线以下的近坡也会被近处地面填满 */
    var lon0 = st.lon, lat0 = st.lat, hEye = st.hEye;
    var ytop = new Float32Array(W);
    for (var x = 0; x < W; x++) ytop[x] = H + 1;
    for (x = 0; x < W; x++) {
      var ang = (st.yaw + Math.atan2(x - W / 2, f) * DEG) * RAD;
      var sa = Math.sin(ang), ca = Math.cos(ang);
      var yb = ytop[x];
      for (var i = 0; i < DS.length; i++) {
        var d = DS[i];
        var h = g.sample(lon0 + sa * d / M_LON, lat0 + ca * d / M_LAT);
        if (h !== h) continue;
        var y = cy - f * (h - d * d * CURV - hEye) / d;
        if (y < yb - 0.02) {
          ctx.fillStyle = segColor(lon0 + sa * d / M_LON, lat0 + ca * d / M_LAT, h, d, g, sdx, sdy, sdz, amb, lc, sc.hor);
          ctx.fillRect(x, y, 1, yb - y + 0.5);
          yb = y;
          if (y < -2) break;
        }
      }
    }
    renderHud(sun);
    D.stat.className = 'p3d-stat';
    D.stat.textContent = '海拔 ' + Math.round(st.hEye) + ' m · 视向 ' + Math.round((st.yaw + 360) % 360) + '° ' + dirName(st.yaw)
      + ' · 视场 ' + Math.round(st.fov) + '° · ' + hhmm(st.hour)
      + ' 太阳 az ' + Math.round(sun.az) + '° / 高 ' + Math.round(sun.el) + '°'
      + (st.tex ? ' · 影像纹理' : '')
      + (st.ready ? ' · 可见地标 ' + st.vis.length + ' 处' : '');
  }

  /* ---------- HUD（罗盘 / 太阳标记 / 可见景点标注） ---------- */
  function renderHud(sun) {
    var ctx = D.hctx, W = D.cssW, H = D.cssH;
    ctx.clearRect(0, 0, W, H);
    var f = (W / 2) / Math.tan(st.fov * RAD / 2);
    var cy = H / 2 + f * Math.tan(st.pitch * RAD);
    var i, dl, x, y;

    /* 罗盘条 */
    var y0 = H - 44;
    ctx.fillStyle = 'rgba(8,12,18,.58)';
    ctx.fillRect(0, y0, W, 44);
    ctx.strokeStyle = 'rgba(255,255,255,.38)';
    ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(255,255,255,.88)';
    ctx.font = '11px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center';
    ctx.beginPath();
    for (var az = 0; az < 360; az += 15) {
      dl = angD(az - st.yaw);
      if (Math.abs(dl) > st.fov / 2 * 1.04) continue;
      x = W / 2 + f * Math.tan(dl * RAD);
      var big = az % 45 === 0;
      ctx.moveTo(x, y0 + (big ? 6 : 11));
      ctx.lineTo(x, y0 + (big ? 16 : 14));
      if (big) ctx.fillText(dirName(az), x, y0 + 31);
    }
    ctx.stroke();
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.moveTo(W / 2, y0 + 2); ctx.lineTo(W / 2 - 5, y0 - 6); ctx.lineTo(W / 2 + 5, y0 - 6);
    ctx.closePath(); ctx.fill();

    /* 可见景点标注（近者优先，横向防重叠） */
    var lastX = -1e9, shown = 0;
    ctx.font = '12px "PingFang SC","Microsoft YaHei",sans-serif';
    for (i = 0; i < st.vis.length && shown < 10; i++) {
      var v = st.vis[i];
      dl = angD(v.az - st.yaw);
      if (Math.abs(dl) > st.fov / 2 * 0.96) continue;
      x = W / 2 + f * Math.tan(dl * RAD);
      if (x - lastX < 92 && lastX - x < 92) continue;
      var ey = Math.atan2(v.h - st.hEye - v.d * v.d * CURV, v.d);
      y = cy - f * Math.tan(ey);
      if (y < -20 || y > H - 60) continue;
      var label = v.name + ' ' + (v.d / 1000).toFixed(1) + ' km';
      var tw = ctx.measureText(label).width + 14;
      ctx.strokeStyle = 'rgba(255,209,102,.95)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, 3.2, 0, 6.3); ctx.stroke();
      ctx.fillStyle = 'rgba(10,16,26,.74)';
      ctx.fillRect(x - tw / 2, y - 29, tw, 18);
      ctx.fillStyle = '#ffd166';
      ctx.fillText(label, x, y - 16);
      lastX = x; shown++;
    }

    /* 太阳方位标记 */
    dl = angD(sun.az - st.yaw);
    if (Math.abs(dl) < st.fov / 2) {
      x = W / 2 + f * Math.tan(dl * RAD);
      y = cy - f * Math.tan(sun.el * RAD);
      if (y > -12 && y < H - 60) {
        ctx.fillStyle = 'rgba(255,220,120,.95)';
        ctx.beginPath(); ctx.arc(x, y, 4, 0, 6.3); ctx.fill();
        ctx.font = '11px "PingFang SC","Microsoft YaHei",sans-serif';
        ctx.fillText('太阳', x, y - 10);
      }
    }
  }

  /* ---------- 渲染驱动 ----------
     不依赖 rAF（内嵌页签可能停摆）：交互处同步 poke() 立即出帧，
     setInterval 兜底驱动自动环顾与迟到的脏标记。 */
  function poke() {
    if (!st || !st.ready || !st.dirty) return;
    st.dirty = false;
    try { render(); } catch (e) { if (window.console) console.error('pano render', e); }
  }
  function driver() {
    if (!st || st.dead) return;
    var now = Date.now();
    var dt = Math.min(100, now - (st.lastT || now));
    st.lastT = now;
    if (st.auto && st.ready) {
      st.yaw = (st.yaw + dt * 0.012) % 360;
      if (st.yaw < 0) st.yaw += 360;
      st.dirty = true;
    }
    poke();
  }

  /* ---------- 事件 ---------- */
  function bindEvents() {
    D.x.onclick = close;
    D.auto.onclick = function () {
      st.auto = !st.auto;
      D.auto.textContent = st.auto ? '⏸ 停止环顾' : '▶ 自动环顾';
      D.auto.className = 'p3d-auto' + (st.auto ? ' on' : '');
      st.dirty = true;
    };
    D.hr.oninput = function () { st.hour = +D.hr.value; st.dirty = true; syncCtl(); poke(); };
    D.eh.oninput = function () {
      st.eyeH = 1.7 * Math.pow(300, +D.eh.value);
      if (st.ready) { st.hEye = st.hGround + st.eyeH; computeVis(); }
      st.dirty = true; syncCtl(); poke();
    };
    var drag = null;
    D.stage.addEventListener('pointerdown', function (e) {
      drag = { x: e.clientX, y: e.clientY };
      try { D.stage.setPointerCapture(e.pointerId); } catch (x) {}
    });
    D.stage.addEventListener('pointermove', function (e) {
      if (!drag || !st) return;
      var k = 0.14 * st.fov / 62;
      st.yaw = (st.yaw - (e.clientX - drag.x) * k + 720) % 360;
      st.pitch = clamp(st.pitch + (e.clientY - drag.y) * k, -16, 34);
      drag = { x: e.clientX, y: e.clientY };
      st.dirty = true; poke();
    });
    st.up = function () { drag = null; };
    window.addEventListener('pointerup', st.up);
    D.stage.addEventListener('wheel', function (e) {
      e.preventDefault();
      st.fov = clamp(st.fov * Math.exp((e.deltaY > 0 ? 1 : -1) * 0.1), 26, 95);
      st.dirty = true; poke();
    }, { passive: false });
    st.onKey = function (e) {
      if (!st) return;
      if (e.key === 'Escape') { close(); return; }
      if (e.target && e.target.tagName === 'INPUT') return;
      var step = e.shiftKey ? 5 : 1.4;
      if (e.key === 'ArrowLeft') { st.yaw = (st.yaw - step + 360) % 360; st.dirty = true; }
      else if (e.key === 'ArrowRight') { st.yaw = (st.yaw + step) % 360; st.dirty = true; }
      else if (e.key === 'ArrowUp') { st.pitch = clamp(st.pitch + step * .6, -16, 34); st.dirty = true; }
      else if (e.key === 'ArrowDown') { st.pitch = clamp(st.pitch - step * .6, -16, 34); st.dirty = true; }
      else if (e.key === '+' || e.key === '=') { st.fov = clamp(st.fov - 3, 26, 95); st.dirty = true; }
      else if (e.key === '-') { st.fov = clamp(st.fov + 3, 26, 95); st.dirty = true; }
    };
    window.addEventListener('keydown', st.onKey);
    st.onResize = function () { if (!st) return; sizeCanvases(); st.dirty = true; };
    window.addEventListener('resize', st.onResize);
  }

  /* ---------- 对外接口 ---------- */
  function open(opt) {
    close();
    lastOpt = opt;
    M_LON = 111320 * Math.cos(opt.lat * RAD);
    var now = new Date();
    st = {
      name: opt.name || '机位', lat: opt.lat, lon: opt.lon,
      yaw: ((opt.yaw || 0) % 360 + 360) % 360, pitch: 2, fov: 62,
      eyeH: opt.eyeH || 1.7, hour: opt.hour || 10,
      day: Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 864e5),
      targets: opt.targets || [], auto: false,
      grid: null, hGround: 0, hEye: 0, vis: [], tex: null, texReady: false,
      ready: false, dead: false, dirty: true, lastT: 0, iv: 0
    };
    buildDom();
    bindEvents();
    status('正在加载高程数据…');
    st.iv = setInterval(driver, 100);
    QIN.dem.load(opt.lat, opt.lon, 12, 5, function (a, b) {
      if (st && !st.ready) status('正在加载高程数据 ' + a + '/' + b);
    }).then(function (g) {
      if (!st || st.dead) return;
      st.grid = g;
      st.hGround = g.sample(opt.lon, opt.lat);
      st.hEye = st.hGround + st.eyeH;
      st.ready = true;
      computeVis();
      st.dirty = true;
      /* 影像纹理：不阻塞首帧，到达后自动重绘（湖水/湿地/城市真实着色） */
      if (window.QIN && QIN.tex) {
        QIN.tex.load(opt.lat, opt.lon, 13, 5, function (a, b) {
          if (st && !st.texReady && !st.dead) status('高程就绪 · 正在加载影像纹理 ' + a + '/' + b);
        }).then(function (t) {
          if (!st || st.dead) return;
          st.tex = t && t.sample ? t : null;
          st.texReady = true;
          st.dirty = true;
        });
      }
    }).catch(function (e) {
      if (!st || st.dead) return;
      status('高程数据加载失败：' + (e && e.message || e), true);
    });
  }

  function close() {
    if (!st) return;
    st.dead = true;
    if (st.iv) clearInterval(st.iv);
    window.removeEventListener('keydown', st.onKey);
    window.removeEventListener('resize', st.onResize);
    window.removeEventListener('pointerup', st.up);
    if (D.mask && D.mask.parentNode) D.mask.parentNode.removeChild(D.mask);
    st = null;
  }

  function set(o) {
    if (!st) return;
    for (var k in o) st[k] = o[k];
    st.yaw = ((st.yaw % 360) + 360) % 360;
    if (('eyeH' in o) && st.ready) { st.hEye = st.hGround + st.eyeH; computeVis(); }
    st.dirty = true;
    poke();
  }

  function state() {
    if (!st) return null;
    return {
      ready: st.ready, yaw: st.yaw, pitch: st.pitch, fov: st.fov,
      eyeH: st.eyeH, hour: st.hour, hEye: st.hEye, tex: !!st.tex,
      visCount: st.vis.length, vis: st.vis.map(function (v) { return v.name; })
    };
  }

  return { open: open, close: close, set: set, state: state };
})();
