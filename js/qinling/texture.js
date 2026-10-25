/* ============================================================
   QIN.tex — 卫星影像纹理模块
   抓取 Esri World Imagery 瓦片（与地图底图同源），解码为像素网格，
   提供 WGS84 经纬度 -> [r,g,b] 采样，供人视模拟做真实地物着色
   （湖泊/湿地/城市自动呈现，不再只有高程色带）。
   对外：QIN.tex.load(latC, lonC, z, r, onProgress) -> Promise
        resolve { sample(lon,lat)->[r,g,b] | null, bad }
   依赖：无。瓦片不可达或跨域受限时 sample 为 null，调用方回退色带。
   ============================================================ */
window.QIN = window.QIN || {};
QIN.tex = (function () {
  'use strict';

  var TILE = 256;
  var BASE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/';
  var cache = {};   /* 'z/tx/ty' -> ImageData | null（失败也缓存，避免反复重试） */

  function px(lon, lat, z) {
    var n = TILE * Math.pow(2, z);
    var s = Math.sin(Math.max(-85.051, Math.min(85.051, lat)) * Math.PI / 180);
    return [
      (lon + 180) / 360 * n,
      (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n
    ];
  }

  function loadImg(url) {
    return new Promise(function (res) {
      var im = new Image();
      im.crossOrigin = 'anonymous';
      im.onload = function () { res(im); };
      im.onerror = function () { res(null); };
      im.src = url;
    });
  }

  function decode(im) {
    var c = document.createElement('canvas');
    c.width = im.width; c.height = im.height;
    var x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(im, 0, 0);
    try { return x.getImageData(0, 0, c.width, c.height); }
    catch (e) { return null; }   /* 跨域受限 */
  }

  /* 以 (latC, lonC) 为中心抓 r*r 瓦片网格（XYZ 瓦片，同 Leaflet 底图） */
  function load(latC, lonC, z, r, onProgress) {
    var p = px(lonC, latC, z);
    var tx0 = Math.floor(p[0] / TILE) - (r >> 1);
    var ty0 = Math.floor(p[1] / TILE) - (r >> 1);
    var keys = [], jobs = [];
    for (var ty = ty0; ty < ty0 + r; ty++) {
      for (var tx = tx0; tx < tx0 + r; tx++) {
        var key = z + '/' + tx + '/' + ty;
        keys.push(key);
        if (cache[key] !== undefined) { jobs.push(Promise.resolve(cache[key])); continue; }
        jobs.push(loadImg(BASE + z + '/' + ty + '/' + tx).then(function (im) {
          var d = im ? decode(im) : null;
          cache[key] = d;
          return d;
        }));
      }
    }
    var done = 0;
    var tracked = jobs.map(function (jp) {
      return jp.then(function (d) { done++; if (onProgress) onProgress(done, jobs.length); return d; });
    });
    return Promise.all(tracked).then(function (imgs) {
      var okCnt = 0;
      imgs.forEach(function (d) { if (d) okCnt++; });
      if (okCnt === 0) return { sample: null, bad: jobs.length };
      var n = TILE * Math.pow(2, z), ox = tx0 * TILE, oy = ty0 * TILE;
      function sample(lon, lat) {
        var q = px(lon, lat, z);
        var gx = q[0] - ox, gy = q[1] - oy;
        var tx = Math.floor(gx / TILE), ty = Math.floor(gy / TILE);
        if (tx < 0 || ty < 0 || tx >= r || ty >= r) return null;
        var d = imgs[ty * r + tx];
        if (!d) return null;
        var i = ((gy - ty * TILE) * TILE + (gx - tx * TILE)) * 4 | 0;
        return [d.data[i], d.data[i + 1], d.data[i + 2]];
      }
      return { sample: sample, bad: jobs.length - okCnt };
    });
  }

  return { load: load };
})();
