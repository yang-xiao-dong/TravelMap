/* 面板模块：省份排行、景区清单、搜索与类别筛选视图 */
(function (M) {
  'use strict';
  var model = null, panelEl = null, qEl = null;

  function fmtCoord(lon, lat) { return lon.toFixed(2) + '°E, ' + lat.toFixed(2) + '°N'; }

  function spotRow(s) {
    var catCls = s.cat === 'C' ? 'c' : 'n';
    return '<div class="spot-item">'
      + '<span class="yr ' + catCls + '">' + s.y + '</span>'
      + '<span class="nm" data-locate="' + s.lon + ',' + s.lat + '" title="点击在地图上定位">' + (s.prov === '兵团' ? '兵团·' : '') + s.n + '</span>'
      + '<span class="co">' + fmtCoord(s.lon, s.lat) + '</span>'
      + '<button type="button" class="mini" data-copy="' + s.lon + ',' + s.lat + '">复制坐标</button>'
      + '<a class="mini" target="_blank" rel="noopener" href="https://uri.amap.com/search?keyword=' + encodeURIComponent(s.n) + '">高德</a>'
      + '</div>';
  }

  function renderRanking() {
    var filter = M.state.catFilter;
    var cm = model.catCountsFor(filter);
    var maxV = filter === 'all' ? model.maxCount : Math.max(1, model.maxOf(cm));
    var rows = model.PROV_LIST.slice().sort(function (a, b) { return cm[b] - cm[a] || a.localeCompare(b, 'zh'); });
    var headFilter = filter === 'all' ? '' : ' · ' + model.CATC[filter].label;
    var html = '<div class="panel-head"><h2>省份排行</h2><span class="cnt">31 省区市 + 兵团' + headFilter + '</span></div><div class="rank-list">';
    rows.forEach(function (p, i) {
      var v = cm[p];
      var w = Math.round(v / maxV * 100);
      html += '<button type="button" class="rank-row" data-prov="' + p + '">'
        + '<span class="no">' + (i + 1) + '</span><span class="nm">' + p + '</span>'
        + '<span class="bar"><i data-w="' + w + '"></i></span>'
        + '<span class="val">' + v + '</span></button>';
    });
    html += '</div>';
    panelEl.innerHTML = html;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        panelEl.querySelectorAll('.bar i').forEach(function (b) { b.style.width = b.getAttribute('data-w') + '%'; });
      });
    });
    panelEl.querySelectorAll('.rank-row').forEach(function (btn) {
      btn.addEventListener('click', function () { M.app.onProvClick(btn.getAttribute('data-prov')); });
    });
  }

  function renderProvince(prov) {
    var filter = M.state.catFilter;
    var all = model.listByProv[prov];
    var lst = all.filter(function (s) { return filter === 'all' || s.cat === filter; })
                  .sort(function (a, b) { return b.y - a.y || a.n.localeCompare(b.n, 'zh'); });
    var cnt = filter === 'all'
      ? all.length + ' 家' + (prov === '新疆' ? '（含兵团）' : '')
      : lst.length + ' / ' + all.length + ' 家' + model.CATC[filter].label;
    var html = '<div class="panel-head"><h2>' + prov + '</h2><span class="cnt">' + cnt + '</span>'
      + '<button type="button" class="back">⟵ 全国</button></div><div class="spot-scroll">';
    if (!lst.length) html += '<div class="empty">该省没有这个类别的景区</div>';
    lst.forEach(function (s) { html += spotRow(s); });
    html += '</div>';
    panelEl.innerHTML = html;
    panelEl.querySelector('.back').addEventListener('click', function () { M.app.onProvClick(prov); });
  }

  function renderSearch(q) {
    var filter = M.state.catFilter;
    var hits = [];
    model.spots.forEach(function (s) {
      if (filter !== 'all' && s[5] !== filter) return;
      if (s[0].toLowerCase().indexOf(q) >= 0 || s[1].indexOf(q) >= 0) hits.push(s);
    });
    var html = '<div class="panel-head"><h2>搜索结果</h2><span class="cnt">' + hits.length + ' 家</span></div><div class="spot-scroll">';
    if (!hits.length) html += '<div class="empty">没有匹配的景区</div>';
    hits.slice(0, 120).forEach(function (s) {
      html += spotRow({ n: s[0], prov: s[1], y: s[2], lon: s[3], lat: s[4], cat: s[5] });
    });
    html += '</div>';
    panelEl.innerHTML = html;
  }

  M.panel = {
    init: function (panel, qInput) {
      model = M.model;
      panelEl = panel; qEl = qInput;
      qEl.addEventListener('input', function () { M.state.q = qEl.value.trim().toLowerCase(); M.panel.render(); });
      /* 事件代理：复制坐标 / 名称定位 */
      panelEl.addEventListener('click', function (e) {
        var cp = e.target.closest ? e.target.closest('[data-copy]') : null;
        if (cp) {
          var v = cp.getAttribute('data-copy').split(',');
          M.interact.copyText(v[0] + ',' + v[1], '坐标');
          return;
        }
        var nm = e.target.closest ? e.target.closest('[data-locate]') : null;
        if (nm) {
          var ll = nm.getAttribute('data-locate').split(',');
          var lon = parseFloat(ll[0]), lat = parseFloat(ll[1]);
          for (var i = 0; i < model.spots.length; i++) {
            if (Math.abs(model.spots[i][3] - lon) < 1e-6 && Math.abs(model.spots[i][4] - lat) < 1e-6) {
              M.app.onSpotClick(model.spots[i]);
              return;
            }
          }
        }
      });
    },
    render: function () {
      var q = M.state.q;
      if (q) renderSearch(q);
      else if (M.state.selected) renderProvince(M.state.selected);
      else renderRanking();
    }
  };
})(window.M5A = window.M5A || {});
