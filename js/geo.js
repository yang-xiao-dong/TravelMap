/* 地理模块：墨卡托投影与范围计算（不依赖渲染） */
(function (M) {
  'use strict';
  var RAD = Math.PI / 180;

  function rawProj(lon, lat) {
    var cl = Math.max(-85, Math.min(85, lat));
    return [lon * RAD, Math.log(Math.tan(Math.PI / 4 + cl * RAD / 2))];
  }

  function boundsOf(features) {
    var mn = [1e9, 1e9], mx = [-1e9, -1e9];
    function ring(r) {
      for (var i = 0; i < r.length; i++) {
        var p = rawProj(r[i][0], r[i][1]);
        if (p[0] < mn[0]) mn[0] = p[0];
        if (p[1] < mn[1]) mn[1] = p[1];
        if (p[0] > mx[0]) mx[0] = p[0];
        if (p[1] > mx[1]) mx[1] = p[1];
      }
    }
    features.forEach(function (f) {
      var c = f.geometry.coordinates;
      if (f.geometry.type === 'Polygon') c.forEach(ring);
      else c.forEach(function (poly) { poly.forEach(ring); });
    });
    return [mn, mx];
  }

  /* 生成把 bounds 填入 [pad, W-pad]×[pad, H-pad] 的投影函数 */
  function fitProjector(bounds, W, H, pad) {
    var mn = bounds[0], mx = bounds[1];
    var s = Math.min((W - 2 * pad) / (mx[0] - mn[0]), (H - 2 * pad) / (mx[1] - mn[1]));
    var ox = (W - (mx[0] - mn[0]) * s) / 2, oy = (H - (mx[1] - mn[1]) * s) / 2;
    return function (lon, lat) {
      var p = rawProj(lon, lat);
      return [ox + (p[0] - mn[0]) * s, H - oy - (p[1] - mn[1]) * s];
    };
  }

  M.geo = { rawProj: rawProj, boundsOf: boundsOf, fitProjector: fitProjector };
})(window.M5A = window.M5A || {});
