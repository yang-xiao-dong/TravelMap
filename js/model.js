/* 数据模型模块：从 DATA5A 派生统计、索引与类别信息 */
(function (M) {
  'use strict';
  var D = window.DATA5A;
  var PROV_LIST = ['北京','天津','河北','山西','内蒙古','辽宁','吉林','黑龙江','上海','江苏','浙江','安徽','福建','江西','山东','河南','湖北','湖南','广东','广西','海南','重庆','四川','贵州','云南','西藏','陕西','甘肃','青海','宁夏','新疆'];

  var CATC = {
    N: { key: 'N', color: '#0e9f8f', label: '自然' },
    C: { key: 'C', color: '#e8912d', label: '人文' }
  };

  /* 兵团并入新疆统计；壶口两省各计 1 条 */
  var counts = {}, listByProv = {};
  PROV_LIST.forEach(function (p) { counts[p] = 0; listByProv[p] = []; });
  var seen = {}, seenCat = { N: {}, C: {} };
  D.spots.forEach(function (s) {
    var prov = s[1] === '兵团' ? '新疆' : s[1];
    counts[prov] += 1;
    listByProv[prov].push({ n: s[0], prov: s[1], y: s[2], lon: s[3], lat: s[4], cat: s[5] });
    seen[s[0]] = 1;
    seenCat[s[5]][s[0]] = 1;
  });
  var distinct = Object.keys(seen).length;
  var maxCount = 0;
  PROV_LIST.forEach(function (p) { maxCount = Math.max(maxCount, counts[p]); });

  var featIdx = {};
  D.china.features.forEach(function (f) { featIdx[f.properties.name] = f; });

  /* 筛选下的省份数量与全局最大值（用于排行条形归一化） */
  function catCountsFor(filter) {
    if (filter === 'all') return counts;
    var out = {};
    PROV_LIST.forEach(function (p) {
      out[p] = listByProv[p].filter(function (s) { return s.cat === filter; }).length;
    });
    return out;
  }
  function maxOf(countMap) {
    var m = 0;
    PROV_LIST.forEach(function (p) { m = Math.max(m, countMap[p]); });
    return m;
  }
  function newOf2024() {
    return D.spots.filter(function (s) { return s[2] === 2024; }).length;
  }

  M.model = {
    PROV_LIST: PROV_LIST,
    CATC: CATC,
    counts: counts,
    listByProv: listByProv,
    featIdx: featIdx,
    spots: D.spots,
    china: D.china,
    distinct: distinct,
    catDistinct: { N: Object.keys(seenCat.N).length, C: Object.keys(seenCat.C).length },
    maxCount: maxCount,
    catCountsFor: catCountsFor,
    maxOf: maxOf,
    newOf2024: newOf2024
  };
})(window.M5A = window.M5A || {});
