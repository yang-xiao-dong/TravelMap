# 全国 5A 级旅游景区分布图

文旅部名录（截至 2024 年 12 月批次）全部 **358 家** 5A 景区的交互地图，
按**自然 / 人文**两类区分点位，支持省份缩放、搜索、类别筛选、坐标一键复制与高德地图直达。

## 使用

- 开发/模块版：直接打开 `index.html`（或本地静态服务，如 `python -m http.server`）。
- 单文件版：`python tools/build.py` 生成 `china-5a-map.html`，双击即用、零外部依赖，可分发。

## 结构

```
index.html              门户入口（全国总图 + 16 条国道走向线叠加 + 34 省区/公路/城市专题卡片导航）
maps/                   全部地图页（省区图 + 16 条国道专题 + 城市专题 city-*-map.html + 城市总览 cities-map.html + 秦岭/黄河专题 + 5A 总图）
browser/
  spots-browser.html    景点深度档案全文检索页（由 docs/spots/*.md 生成，单文件零依赖）
css/style.css           样式
data/                   各省数据源 json + 门户聚合数据 all.js/all.json/roads.js/cities.js + poetry 诗词
                        data/cities/ 城市专题数据（manifest.json 为 31 省 92 城全覆盖清单）
docs/                   深度档案（docs/spots/）、调研笔记与城市专题推进计划（docs/cities-plan.md）
js/
  data-china.js         省界 GeoJSON 数据（数据模块）
  data-spots.js         358 家景区数据：[名称, 省份, 年份, 经度, 纬度, 类别]
  geo.js                墨卡托投影与范围计算
  model.js              统计与索引派生
  map.js                地图渲染、缩放动画、点位形状
  panel.js              排行/清单/搜索面板
  interact.js           悬浮提示、复制、信息卡
  app.js                全局状态与装配
  qinling/              人视模拟模块（dem/sun/pano/texture，各地图页复用）
lib/                    Leaflet 本地副本
tools/
  build.py              单文件打包脚本
  gen_theme_map.py      主题采风图生成器：data/*.json -> maps/<拼音>-map.html（省区/国道/城市通用）
  build_docs_index.py   档案索引生成器：docs/spots/*.md -> browser/spots-browser.html
  gen_roads_js.py       国道走廊聚合：data/g*.json -> data/roads.js（首页走向线叠加）
  build_cities_index.py 城市索引：data/cities/* -> data/cities.js（总览图与进度）
  patch_labels.py       手写专题页（秦岭/湖北/河南/黄河）自动标注补丁
  validate_data.py      数据契约校验
```

模块通过 `window.M5A` / `window.DATA5A` 命名空间协作，使用普通 script 标签加载
（非 ES Module），保证 `file://` 协议双击可用；页面均用相对路径引用资产，
根目录、maps/、browser/ 下双击打开均可正常加载。

## 数据说明

- 来源：文化和旅游部数据服务栏目（sjfw.mct.gov.cn）官方名录；总数 358 家
  （黄河壶口瀑布为晋陕合评，两省名录各含 1 条，地图上为一个点）。
- 坐标：约半数知名景区按实际位置标注，其余按所在地市中心示意；
  悬停可查看坐标，「复制坐标」得到 `经度,纬度` 原始数值，可直接粘贴进巧摄/Planit 等规划工具。
- 自然/人文分类：按主要拍摄题材人工归类（如泰山、峨眉山计入自然，
  五台山、武当山计入人文），共自然 186 家、人文 172 家。
- 省界底图：公开地图数据简化绘制（解码自 ECharts 压缩 GeoJSON 格式）。

## 交互

- 点击省份 → 平滑缩放至该省；再次点击 / ESC / 「⟵ 返回全国」退出。
- 点击红点 → 该点脉冲定位 + 信息卡（复制坐标 / 复制名称 / 高德打开）。
- 顶部筛选：全部 / 自然 / 人文，联动地图点位、排行与清单。
- 搜索框：按景区名或省份过滤；点景区名定位，点「复制坐标」取原始经纬度。
