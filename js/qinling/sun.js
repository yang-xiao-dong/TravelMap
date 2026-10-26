/* ============================================================
   QIN.sun — 太阳位置模块
   NOAA 简化算法：给定年积日、北京时间（UTC+8）小时数与经纬度，
   返回 { az, el }：方位角（北 0°，顺时针）、高度角（度，可为负）。
   摄影用途：判断顺光/逆光、日落方向、黄金时刻。
   ============================================================ */
window.QIN = window.QIN || {};
QIN.sun = (function () {
  'use strict';
  var RAD = Math.PI / 180;

  function position(dayOfYear, hour8, lat, lon) {
    /* 年分数（用 UTC 小时） */
    var g = 2 * Math.PI / 365 * (dayOfYear - 1 + (hour8 - 8) / 24);
    /* 均时差（分钟）与赤纬（弧度） */
    var eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g)
      - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    var dec = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g)
      - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g)
      - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    /* 真太阳时 -> 时角 */
    var tst = hour8 * 60 + eq + 4 * lon - 480;
    var ha = (tst / 4 - 180) * RAD;
    var la = lat * RAD;
    var cz = Math.sin(la) * Math.sin(dec) + Math.cos(la) * Math.cos(dec) * Math.cos(ha);
    cz = Math.max(-1, Math.min(1, cz));
    var zen = Math.acos(cz), el = 90 - zen / RAD;
    /* 方位角用 ENU 向量法（acos 形式在高/低高度角处会钳位失真） */
    var east = -Math.cos(dec) * Math.sin(ha);
    var north = Math.cos(la) * Math.sin(dec) - Math.sin(la) * Math.cos(dec) * Math.cos(ha);
    var az = Math.atan2(east, north) / RAD;
    return { az: (az + 360) % 360, el: el };
  }

  return { position: position };
})();
