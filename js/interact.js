/* 交互模块：悬浮提示、复制与提示条、点位信息卡 */
(function (M) {
  'use strict';
  var model = null;
  var tipEl, toastEl, pop, popSpot;
  var toastTimer = null;

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1600);
  }

  function copyText(t, label) {
    function ok() { toast('已复制' + (label ? '：' + t : '')); }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = t;
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); ok(); } catch (e) { toast('复制失败，请手动选择文字'); }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(ok, fallback);
    } else fallback();
  }

  function initTooltip() {
    tipEl = document.createElement('div');
    tipEl.className = 'c5a-tip';
    document.body.appendChild(tipEl);
    function tipPos(e) {
      var x = e.clientX + 14, y = e.clientY + 14;
      var r = tipEl.getBoundingClientRect();
      if (x + r.width > window.innerWidth - 8) x = e.clientX - r.width - 10;
      if (y + r.height > window.innerHeight - 8) y = e.clientY - r.height - 10;
      tipEl.style.left = Math.max(4, x) + 'px';
      tipEl.style.top = Math.max(4, y) + 'px';
    }
    document.body.addEventListener('pointerover', function (e) {
      var t = e.target.closest ? e.target.closest('[data-tooltip]') : null;
      if (!t) return;
      tipEl.innerHTML = t.getAttribute('data-tooltip').split('\n')
        .map(function (x) { return x ? '<b>' + x + '</b>' : ''; }).join('<br>') || t.getAttribute('data-tooltip');
      tipEl.classList.add('show');
      tipPos(e);
    });
    document.body.addEventListener('pointermove', function (e) { if (tipEl.classList.contains('show')) tipPos(e); });
    document.body.addEventListener('pointerout', function (e) {
      var t = e.target.closest ? e.target.closest('[data-tooltip]') : null;
      if (t) tipEl.classList.remove('show');
    });
  }

  function showPopup(s) {
    popSpot = s;
    var meta = model.CATC[s[5]] || model.CATC.N;
    document.getElementById('ipName').innerHTML =
      '<span class="cat-tag ' + (s[5] === 'C' ? 'c' : 'n') + '">' + meta.label + '景观</span>' + s[0];
    document.getElementById('ipMeta').textContent =
      s[1] + ' · ' + s[2] + '年 · ' + M.app.fmtCoord(s[3], s[4]);
    document.getElementById('ipAmap').href = 'https://uri.amap.com/search?keyword=' + encodeURIComponent(s[0]);
    pop.classList.add('show');
  }
  function hidePopup() { pop.classList.remove('show'); popSpot = null; }

  M.interact = {
    init: function () {
      model = M.model;
      toastEl = document.getElementById('toast');
      pop = document.getElementById('infoPop');
      initTooltip();
      document.getElementById('ipClose').addEventListener('click', hidePopup);
      document.getElementById('ipCopyCoord').addEventListener('click', function () {
        if (popSpot) copyText(popSpot[3] + ',' + popSpot[4], '坐标');
      });
      document.getElementById('ipCopyName').addEventListener('click', function () {
        if (popSpot) copyText(popSpot[0], '名称');
      });
    },
    copyText: copyText,
    toast: toast,
    showPopup: showPopup,
    hidePopup: hidePopup
  };
})(window.M5A = window.M5A || {});
