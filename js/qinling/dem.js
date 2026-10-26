/* ============================================================
   QIN.dem — 高程数据模块
   抓取 Terrarium 编码 DEM 瓦片（AWS Terrain Tiles 公共数据集，
   SRTM/ETOPO 混合，全球无死角），解码为 Float32 高程格网，
   提供 WGS84 经纬度双线性采样。
   对外：QIN.dem.load(latC, lonC, z, r, onProgress) -> Promise
        resolve { sample(lon,lat)->米, size, zoom, bad }
   依赖：无（浏览器原生 Image / canvas）
   ============================================================ */
window.QIN = window.QIN || {};
QIN.dem = (function () {
  'use strict';

  var TILE = 256;
  var BASE = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/';

  /* Web Mercator：经纬度 -> z 级全局像素坐标（浮点） */
  function px(lon, lat, z) {
    var n = TILE * Math.pow(2, z);
    var s = Math.sin(Math.max(-85.051, Math.min(85.051, lat)) * Math.PI / 180);
    return [
      (lon + 180) / 360 * n,
      (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n
    ];
  }

  function loadImg(url) {
    return new Promise(function (res, rej) {
      var im = new Image();
      im.crossOrigin = 'anonymous';
      im.onload = function () { res(im); };
      im.onerror = function () { rej(new Error('瓦片不可达')); };
      im.src = url;
    });
  }

  /* terrarium 编码：h = R*256 + G + B/256 - 32768 */
  function decode(img) {
    var c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    var x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0);
    var d;
    try { d = x.getImageData(0, 0, c.width, c.height).data; }
    catch (e) { throw new Error('瓦片跨域受限(CORS)'); }
    var out = new Float32Array(c.width * c.height);
    for (var i = 0, j = 0; i < out.length; i++, j += 4) {
      out[i] = d[j] * 256 + d[j + 1] + d[j + 2] / 256 - 32768;
    }
    return out;
  }

  /* 以 (latC, lonC) 为中心抓 r*r 瓦片网格；个别瓦片失败按 0m 兜底，
     失败过半才算整体失败。onProgress(done, total) 用于进度提示。 */
  function load(latC, lonC, z, r, onProgress) {
    var p = px(lonC, latC, z);
    var tx0 = Math.floor(p[0] / TILE) - (r >> 1);
    var ty0 = Math.floor(p[1] / TILE) - (r >> 1);
    var total = r * r, bad = 0;
    var jobs = [];
    for (var ty = ty0; ty < ty0 + r; ty++) {
      for (var tx = tx0; tx < tx0 + r; tx++) {
        jobs.push(loadImg(BASE + z + '/' + tx + '/' + ty + '.png').then(
          function (ok) { return ok; },
          function () { bad++; return null; }
        ).then(function (im) {
          if (onProgress) onProgress(jobs.length, total);
          return im;
        }));
      }
    }
    return Promise.all(jobs).then(function (imgs) {
      if (bad * 4 > total) throw new Error('高程瓦片加载失败 ' + bad + '/' + total + '（网络或数据源不可达）');
      var W = TILE * r, grid = new Float32Array(W * W);
      var n = TILE * Math.pow(2, z), ox = tx0 * TILE, oy = ty0 * TILE;
      imgs.forEach(function (im, i) {
        if (!im) return;
        var tx = i % r, ty = (i / r) | 0;
        var h = decode(im);
        for (var y = 0; y < TILE; y++) {
          var dst = (ty * TILE + y) * W + tx * TILE, src = y * TILE;
          for (var xx = 0; xx < TILE; xx++) grid[dst + xx] = h[src + xx];
        }
      });
      function sample(lon, lat) {
        var q = px(lon, lat, z);
        var gx = q[0] - ox, gy = q[1] - oy;
        var x0 = Math.floor(gx), y0 = Math.floor(gy);
        if (x0 < 0 || y0 < 0 || x0 >= W - 1 || y0 >= W - 1) return NaN;
        var fx = gx - x0, fy = gy - y0, i = y0 * W + x0;
        var a = grid[i], b = grid[i + 1], c = grid[i + W], d = grid[i + W + 1];
        return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
      }
      return { sample: sample, size: W, zoom: z, bad: bad };
    });
  }

  return { load: load };
})();
