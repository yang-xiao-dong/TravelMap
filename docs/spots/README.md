# 全国采风景点 · 深度索引总目

本目录是对项目全部采风景点的**独立格式化文档库**：不改动任何地图代码与数据文件，仅从数据源提炼、扩写，供人检索与后续工具化索引。

- **覆盖**：28 个省级自然采风主题 + 4 个跨省主题（秦岭北麓 / 黄河全线 / 河南 / 湖北），共 **32 份文档、472 个景区、1479 个机位**。
- **来源**：`data/<拼音>.json`（19→28 省陆续补齐）与 4 个内联 `SPOTS` 的主题 HTML（`henan/hubei/qinling/yellow-river-map.html`）。
- **生成**：2026-10-26；校验已全量通过（景区数、机位数、五板块计数、无 HTML 残留）。
- **页面化检索**：运行 `python tools/build_docs_index.py` 可把本目录全部 md 解析生成 **`spots-browser.html`**（单文件、零依赖、双击即用）：区域/主题/月份/5A 组合筛选 + 全文检索（含风土人情与机位拍法），详情页可跳转对应省份地图。md 是唯一事实源，更新文档后重跑一次脚本即可。

---

## 一、文档结构约定（全目录统一）

每份省份文档的骨架完全一致，便于跳转与程序化解析：

1. `# <省>自然采风 · 景点深度索引` —— 引言块（数据源、景区/机位数、用途）
2. `## 省域速览` —— 季节日历（列表）＋地方节庆表＋特色住宿表
3. `## 景区目录` —— 全部景区的锚链接表（#/景区/区域/类别/5A）
4. 每个景区一节：`## NN 景区名`（两位序号 = 源数据 id 补零，索引正则 `^## \d{2} `），内含固定板块：
   - `### 文化历史` —— 以源数据 `story` 为骨架扩写（沿革、得名、史实、遗产身份）
   - `### 唐宋诗词` —— 视关联收录（2026-10-27 增补，36 景区 50 首；仅收作者/朝代/标题/引文高度可考的唐宋名篇，宁缺毋滥，无关联则整节省略）
   - `### 风土人情` —— 新增：当地生活图景、可拍民俗与人物题材、拍摄礼俗分寸
   - `### 出片要点` —— 源 `tips` 全量 + **机位速查表**（机位 / 坐标 / 朝向 yaw / 拍法，坐标照抄源数据）
   - `### 地方特色` —— 新增：饮食、物产、工艺、节庆（同域节庆必点名并含时间）
   - `### 实用提示` —— 源 `note` 全量（票务/交通/限流）+ 季节安全提醒
5. `## 本页统计`

> 坐标为 WGS84 经纬度（与 Leaflet 地图一致）；`yaw` 为机位建议朝向（度，0=北、90=东）；`g5` = 国家5A级。

---

## 二、分省文档总表

| 文档 | 区域 | 景区 | 机位 | 5A | 数据源 |
|---|---|---:|---:|---:|---|
| [anhui.md](anhui.md) | 安徽 | 16 | 49 | 6 | data/anhui.json |
| [beijing.md](beijing.md) | 北京 | 11 | 23 | — | data/beijing.json |
| [chongqing.md](chongqing.md) | 重庆 | 15 | 47 | 10 | data/chongqing.json |
| [fujian.md](fujian.md) | 福建 | 16 | 54 | 10 | data/fujian.json |
| [gansu.md](gansu.md) | 甘肃 | 17 | 58 | 5 | data/gansu.json |
| [guangdong.md](guangdong.md) | 广东 | 15 | 50 | 8 | data/guangdong.json |
| [guangxi.md](guangxi.md) | 广西 | 16 | 52 | 5 | data/guangxi.json |
| [guizhou.md](guizhou.md) | 贵州 | 15 | 47 | 7 | data/guizhou.json |
| [hainan.md](hainan.md) | 海南 | 15 | 47 | 6 | data/hainan.json |
| [hebei.md](hebei.md) | 河北 | 15 | 49 | 5 | data/hebei.json |
| [heilongjiang.md](heilongjiang.md) | 黑龙江 | 13 | 48 | 6 | data/heilongjiang.json |
| [hunan.md](hunan.md) | 湖南 | 17 | 57 | 6 | data/hunan.json |
| [jiangsu.md](jiangsu.md) | 江苏 | 15 | 53 | 11 | data/jiangsu.json |
| [jiangxi.md](jiangxi.md) | 江西 | 17 | 58 | 10 | data/jiangxi.json |
| [jilin.md](jilin.md) | 吉林 | 13 | 41 | 3 | data/jilin.json |
| [liaoning.md](liaoning.md) | 辽宁 | 14 | 45 | 4 | data/liaoning.json |
| [neimenggu.md](neimenggu.md) | 内蒙古 | 17 | 58 | 6 | data/neimenggu.json |
| [ningxia.md](ningxia.md) | 宁夏 | 11 | 35 | 4 | data/ningxia.json |
| [qinghai.md](qinghai.md) | 青海 | 17 | 55 | 3 | data/qinghai.json |
| [shandong.md](shandong.md) | 山东 | 15 | 49 | 6 | data/shandong.json |
| [shanghai.md](shanghai.md) | 上海 | 7 | 13 | — | data/shanghai.json |
| [shanxi.md](shanxi.md) | 山西 | 17 | 51 | 4 | data/shanxi.json |
| [sichuan.md](sichuan.md) | 四川 | 17 | 58 | 5 | data/sichuan.json |
| [tianjin.md](tianjin.md) | 天津 | 8 | 28 | 1 | data/tianjin.json |
| [xinjiang.md](xinjiang.md) | 新疆 | 17 | 47 | 8 | data/xinjiang.json |
| [xizang.md](xizang.md) | 西藏 | 16 | 44 | 0 | data/xizang.json |
| [yunnan.md](yunnan.md) | 云南 | 16 | 47 | 3 | data/yunnan.json |
| [zhejiang.md](zhejiang.md) | 浙江 | 16 | 51 | 8 | data/zhejiang.json |
| [henan.md](henan.md) | 河南 | 17 | 46 | 11 | henan-map.html |
| [hubei.md](hubei.md) | 湖北 | 17 | 47 | 7 | hubei-map.html |
| [qinling.md](qinling.md) | 秦岭北麓 | 10 | 44 | 2 | qinling-map.html |
| [yellow-river.md](yellow-river.md) | 黄河全线 | 14 | 28 | 3 | yellow-river-map.html |

---

## 三、全国主题速查（跨省精选）

> 括号内为所在文档；点击文件名进入后用目录锚点直达景区。

**云海日出**：黄山（anhui）、牛背山、峨眉山（sichuan）、武功山、三清山（jiangxi）、扎尕那（gansu）、泰山（shandong）、庐山（jiangxi）、天门山（hunan）、神仙居（zhejiang）

**梯田光影**：元阳梯田（yunnan）、龙脊梯田（guangxi）、加榜梯田（guizhou）、紫鹊界（hunan）、云和梯田（zhejiang）、婺源江岭、篁岭晒秋（jiangxi）

**雾凇冰雪**：雾凇岛（jilin）、库尔滨雾凇（heilongjiang）、中国雪乡（heilongjiang）、长白山（jilin）、阿尔山（neimenggu）、漠河北极村（heilongjiang）、黄山雾凇（anhui）、呼中白桦林（heilongjiang）

**秋色彩林**：喀纳斯（xinjiang）、额济纳胡杨林（neimenggu）、奶子沟彩林（sichuan）、光雾山（sichuan）、塔川（anhui）、九寨沟（sichuan）、栖霞山（jiangsu）、南雄银杏（guangdong）、金塔胡杨（gansu）、蛟河红叶谷（jilin）

**候鸟湿地**：鄱阳湖吴城候鸟小镇（jiangxi）、扎龙湿地（heilongjiang）、盐城丹顶鹤湿地（jiangsu）、烟墩角大天鹅（shandong）、三门峡天鹅湖（henan / yellow-river）、东营入海口（yellow-river）、北戴河鸽子窝（hebei）、达里诺尔湖（neimenggu）

**瀑布**：壶口瀑布（yellow-river）、黄果树（guizhou）、德天跨国瀑布（guangxi）、雁荡山大龙湫（zhejiang）、赤水丹霞（guizhou）、官鹅沟（gansu）、四面山（chongqing）

**镜面盐湖**：茶卡盐湖、察尔汗盐湖、大柴旦翡翠湖（qinghai）、运城盐湖（shanxi）

**海岛渔耕**：霞浦滩涂（fujian）、涠洲岛（guangxi）、嵛山岛（fujian）、东极岛（zhejiang）、平潭岛蓝眼泪（fujian）、蜈支洲岛（hainan）、硇洲岛（guangdong）、养马岛（shandong）

**花季物候**：波密桃花沟（xizang）、吐尔根杏花沟（xinjiang）、鼋头渚樱花（jiangsu）、婺源油菜花（jiangxi）、门源油菜花海（qinghai）、罗平油菜花（yunnan）、百里杜鹃（guizhou）、华顶云锦杜鹃（zhejiang）、兴化千垛菜花（jiangsu）

**星空银河**：茶卡盐湖、俄博梁火星营地（qinghai）、牛背山（sichuan）、武功山（jiangxi）、漠河北极村（heilongjiang）、赛里木湖（xinjiang）、纳木错（xizang）

**石窟与人文世遗**：宏村·西递（anhui）、永定土楼（fujian）、开平碉楼（guangdong）、麦积山石窟（gansu）、须弥山石窟（ningxia）、大足石刻（chongqing）、西夏陵（ningxia）、贺兰山岩画（ningxia）、集安高句丽（jilin）

**边境与跨国**：德天瀑布（guangxi）、防川一眼望三国（jilin）、恩和·室韦卡线（neimenggu）、黑瞎子岛东极（heilongjiang）、东兴京族三岛（guangxi）

---

## 四、全国月历速查（按出发月）

| 月 | 代表题材（所在文档） |
|---|---|
| 1月 | 冰雪大世界（heilongjiang）、雾凇岛（jilin）、雪乡（heilongjiang）、黄山雪霁雾凇（anhui）、普莫雍错蓝冰（xizang）、九寨沟冰瀑（sichuan） |
| 2月 | 罗平油菜花初开（yunnan）、元阳梯田灌水期（yunnan）、梅里日照金山（yunnan）、台儿庄春节大庙会（shandong）、陕州地坑院里过大年（yellow-river）、漠河极寒收官（heilongjiang） |
| 3月 | 林芝波密桃花（xizang）、婺源江岭油菜花（jiangxi）、鼋头渚樱花（jiangsu）、毕节百里杜鹃初放（guizhou）、西湖苏堤春晓（zhejiang）、新安江山水画廊（anhui） |
| 4月 | 伊犁吐尔根杏花（xinjiang）、丹巴甲居梨花（sichuan）、兴化千垛菜花（jiangsu）、毕节百里杜鹃盛花（guizhou）、景宁畲族三月三（zhejiang）、云丘山春山冰洞（shanxi） |
| 5月 | 天台华顶云锦杜鹃（zhejiang）、牛背山杜鹃云海（sichuan）、神农架高山杜鹃（hubei）、龙脊梯田放水（guangxi）、武功山草甸返青（jiangxi）、雨后雁荡云瀑（zhejiang） |
| 6月 | 伊犁薰衣草/赛里木湖花海（xinjiang）、若尔盖花湖（sichuan）、呼伦贝尔草原初夏（neimenggu）、云和梯田芒种灌水（zhejiang）、喀拉峻五花草甸（xinjiang）、乌兰布统野花（neimenggu） |
| 7月 | 门源百里油菜花（qinghai）、青海湖畔花海（qinghai）、茶卡盐湖旺季（qinghai）、巴音布鲁克天鹅（xinjiang）、东极荧光海（zhejiang）、漓江丰水烟雨（guangxi） |
| 8月 | 呼伦贝尔打草季（neimenggu）、扎尕那青稞将熟（gansu）、普陀山香会（zhejiang）、象山开渔千帆（zhejiang）、那拉提草原金黄前奏（xinjiang） |
| 9月 | 喀纳斯秋色开局（xinjiang）、呼中白桦金叶（heilongjiang）、红海滩碱蓬最红（liaoning）、钱塘江八月十八大潮（zhejiang）、阿尔山秋叶（neimenggu） |
| 10月 | 额济纳胡杨金秋（neimenggu）、金塔胡杨（gansu）、奶子沟八十里彩林（sichuan）、光雾山红叶（sichuan）、塔川乌桕初染（anhui）、霞浦紫菜架下水（fujian） |
| 11月 | 妥乐古银杏（guizhou）、栖霞山红叶（jiangsu）、南雄银杏（guangdong）、四明湖水杉（zhejiang）、腾冲银杏村（yunnan）、武功山秋草（jiangxi） |
| 12月 | 三门峡/烟墩角大天鹅抵达（henan / shandong）、雾凇岛开季（jilin）、雪乡粉雪（heilongjiang）、库尔滨雾凇（heilongjiang）、黄山冬雪雾凇（anhui）、平潭蓝眼泪淡季收尾（fujian） |

> 逐月细节以各文档「省域速览 · 季节日历」为准；节庆多为农历或节气定档，出行前按当年历法换算（各文档已给 2026 年公历换算）。

---

## 五、范围说明与待补清单

- **未建独立文档的省级区域**：陕西（`qinling.md` 仅覆盖秦岭北麓西安段，关中/陕北/陕南待专题）、港澳台。北京、上海文档已于 2026-10-26 补齐。
- **非本体系的参考图层**：`china-5a-map.html` + `js/data-spots.js` 为全国 5A 名录图层（约 300 条，仅名称/坐标/类别），无采风五板块内容，故不并入本目录。
- **后续新增省份**：新 JSON 进 `data/` 后，按本 README 第一节的结构约定补写 `<拼音>.md`（并在 `tools/build_docs_index.py` 的 CN 映射里登记中文名）、更新本 README 总表，再重跑 `python tools/build_docs_index.py` 重建检索页。

## 六、校验记录

- 2026-10-26 全量校验：32 份文档、472 景区、1479 机位，逐文件核对源数据——景区节数=源 spots 数、五板块计数=景区数、机位名称零缺失、无 HTML 标签残留，全部通过（脚本比对 `data/*.json` 与 4 个 HTML 内联 `SPOTS`；北京 11/23、上海 7/13 同规则核验）。
- 2026-10-26 检索页构建校验：`tools/build_docs_index.py` 解析 32 文档 → `spots-browser.html`，回读页面内嵌 JSON 与 md 逐项对账（景区数/机位数/坐标/窗口零丢失），筛选逻辑仿真通过（仅5A=175、浙江=16、主题 cloud∩culture=89、搜索"雾凇"=46、"梯田"=36）。
