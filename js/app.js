/* 入口模块：全局状态、省份选择/筛选编排、启动装配 */
(function (M) {
  'use strict';
  var model = null;
  M.state = { selected: null, catFilter: 'all', q: '', photogOn: true };

  M.app = {
    fmtCoord: function (lon, lat) { return lon.toFixed(2) + '°E, ' + lat.toFixed(2) + '°N'; },

    /* 点击省份（再次点击同省 = 返回全国） */
    onProvClick: function (name) {
      M.state.selected = (M.state.selected === name) ? null : name;
      M.app.syncView();
    },

    /* 点击红点：选中所在省并脉冲定位 + 信息卡 */
    onSpotClick: function (s) {
      if (M.map.currentK() > 2.2) {
        M.map.pulse(s[3], s[4]);
        M.interact.showPopup(s);
        return;
      }
      var prov = s[1] === '兵团' ? '新疆' : s[1];
      M.state.selected = prov;
      M.app.syncView();
      M.map.pulse(s[3], s[4]);
      M.interact.showPopup(s);
    },

    setFilter: function (f) {
      M.state.catFilter = f;
      document.querySelectorAll('.fchip').forEach(function (c) {
        c.setAttribute('aria-pressed', c.getAttribute('data-f') === f ? 'true' : 'false');
      });
      M.map.applyFilter();
      M.map.redrawLegend();
      M.panel.render();
      var note = document.getElementById('filterNote');
      if (f === 'all') { note.hidden = true; }
      else {
        note.hidden = false;
        note.className = 'filter-note' + (f === 'N' ? ' on-n' : '');
        note.textContent = '仅显示' + model.CATC[f].label + '景观 · 点击查看全部';
      }
    },

    /* 依据状态同步地图视口、返回按钮与面板 */
    resetAll: function () {
      M.state.selected = null;
      document.getElementById('zoomBack').classList.remove('show');
      M.map.resetView();
      M.interact.hidePopup();
      M.panel.render();
    },

    syncView: function () {
      var sel = M.state.selected;
      document.getElementById('zoomBack').classList.toggle('show', !!sel);
      M.map.setViewProv(sel);
      M.interact.hidePopup();
      M.panel.render();
    },

    boot: function () {
      model = M.model;
      /* 统计卡 */
      document.getElementById('st-total').textContent = model.distinct;
      document.getElementById('st-new').textContent = model.newOf2024() + ' 家';
      document.getElementById('st-nat').textContent = model.catDistinct.N;
      document.getElementById('st-cul').textContent = model.catDistinct.C;
      /* 筛选按钮数量 */
      var fall = document.querySelector('.fchip[data-f="all"]');
      fall.textContent = '全部 ' + model.distinct;

      M.map.init(document.getElementById('c5a-map'));
      M.panel.init(document.getElementById('panel'), document.getElementById('q'));
      M.interact.init();

      document.querySelectorAll('.fchip').forEach(function (c) {
        c.addEventListener('click', function () { M.app.setFilter(c.getAttribute('data-f')); });
      });
      document.getElementById('filterNote').addEventListener('click', function () { M.app.setFilter('all'); });
      var pt = document.getElementById('photogToggle');
      pt.setAttribute('aria-pressed', 'true');
      pt.addEventListener('click', function () {
        M.state.photogOn = !M.state.photogOn;
        pt.setAttribute('aria-pressed', String(M.state.photogOn));
        M.map.applyFilter();
        M.map.redrawLegend();
      });
      document.getElementById('zoomBack').addEventListener('click', function () {
        M.app.resetAll();
      });
      document.getElementById('zoomIn').addEventListener('click', function () { M.map.zoomStep(1.45); });
      document.getElementById('zoomOut').addEventListener('click', function () { M.map.zoomStep(1 / 1.45); });
      document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        var qEl = document.getElementById('q');
        if (qEl.value) { qEl.value = ''; M.state.q = ''; M.panel.render(); return; }
        M.app.resetAll();
      });
      if (window.ResizeObserver) {
        new ResizeObserver(function () { M.map.redraw(); }).observe(document.getElementById('c5a-map'));
      }
      M.panel.render();
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', M.app.boot);
  else M.app.boot();
})(window.M5A = window.M5A || {});
