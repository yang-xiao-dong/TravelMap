# 视觉库与非视觉库 · 完整规划（持续进化路线）

> 配套黄河专题（yellow-river-map.html）与采风规划中心。日期：2026-10-24。

## 一、视觉库（Visual Library）——实景照片资产

### 定位
把「机位」升级为「机位 + 成片参照」：每个小景点挂真实实拍（含 EXIF），出发前即可看到
该机位在不同季节/时段/天气下的成片效果，与 DEM 人视模拟互为印证（模拟看地形，实拍看光线氛围）。

### 数据模型（photos.json，git 管理，静态可分发）
```json
{
  "id": "p20261024-001",
  "spot_id": "yellow-river:8:2",          // 页面:景区id:小景点序号
  "title": "壶口·龙洞仰观 桃花汛",
  "lon": 110.4700, "lat": 36.1360,
  "taken_at": "2024-04-02T11:20+08:00",
  "exif": { "camera": "Sony A7R V", "lens": "16-35GM", "focal": 16,
             "aperture": 11, "shutter": "1/8", "iso": 64, "filters": "ND64+CPL" },
  "weather": "晴·西北风3级", "flow": "约 1800 m³/s（桃花汛）",
  "file": "photos/yellow-river/hukou-2024-04.jpg",   // 大图不入库，缩略图入 lib
  "credit": "Thomas看看世界", "wx": "tokenxixi",     // 实片请求通道
  "status": "public | on_request"                     // 公开缩略图 / 仅授权原图
}
```

### 请求流程（微信 tokenxixi）
- 页面缩略图点击 → 弹「请求原图」卡（列出 spot_id/EXIF/用途勾选：个人收藏/商业授权/展览）
- 生成请求文本（自动复制）：`【成片请求】spot_id=… 用途=… 联系人=…` → 用户粘贴到微信 tokenxixi
- 后续若上服务端：该卡直接 POST 到 request log（见非视觉库），微信仅做兜底通道

### 页面集成（各专题图）
- 小景点弹窗新增「📷 成片 n」缩略横滑条；地图 z≥13 显示实拍点 ◼ 标记
- 筛选器新增「有实拍」开关；EXIF 全文可复制（沿用坐标复制交互）

### 供给管线（Phase 2）
Lightroom 导出 → `tools/ingest_photos.py`（读 EXIF 自动填 JSON，地名反查 spot_id，人工只确认）→ 缩略图入 `photos/`、JSON 提交 git → 页面 ?v++ 生效。

## 二、非视觉库（Non-Visual Library）——事件订阅与生命周期通知

### 定位
摄影窗口是事件驱动的（桃花汛洪峰、调水调沙开闸、天鹅首达、红叶变色率、晨雾预报、星空窗口）。
非视觉库 = 事件日历 + 订阅触达，让系统在窗口开启时主动找人，而不是人找窗口。

### 事件模型（events.json）
```json
{ "id":"yr-xld-2026", "spot":"小浪底调水调沙", "type":"flood_release",
  "trigger":"官方公告（黄河水利委员会）", "window":"2026-06-20~07-10",
  "lead_days":3, "severity":"annual_event",
  "sources":["黄委会官网","河南文旅","景区公众号"] }
```
事件类型：`flood_release`(调水调沙/桃花汛) · `bird_arrival`(天鹅首达) · `foliage`(红叶变色率%) ·
`mist_forecast`(大九湖晨雾,已有官方小程序) · `star_window`(银河季/新月窗口) · `flow_alert`(壶口流量).

### 触达通道（分层，先静态后服务化）
| 阶段 | 通道 | 实现 |
|---|---|---|
| P1 静态 | 站内看板 | 门户「当季看板」已上线；加倒计时与事件状态标签 |
| P2 本地 | 浏览器通知 | Notification API + Service Worker：开着页面即可弹（无服务器） |
| P3 推送 | Web Push (FCM/VAPID) | Serverless 一枚（Cloudflare Workers/阿里云FC）：events.json 变更 → 推送订阅者 |
| P4 短信 | 生命周期短信 | 高价值事件（调水调沙开闸、桃花汛洪峰）触发 SMS（阿里云短信/腾讯云），按用户设置的提前期与静默时段发送 |

### 订阅（subscriptions）
用户可订阅粒度：专题 / 景区 / 事件类型；每条订阅含 `lead_days`、`channels:[push,sms]`、`quiet_hours`。
生命周期：`订阅 → 确认(双 opted-in) → 提醒(lead) → 事件中(实况) → 复盘(成片征集，反哺视觉库)`。

### 数据获取（P3 起的关键）
官方公告类（黄委会/林草局/景区号）用定时抓取 + 关键词分类；自然窗口类（红叶/晨雾/流量）
接入公开 API（水文：黄河网水文站；红叶：各地文旅周报人工录入 events.json）。

## 三、演进路线

- **Phase 1（已完成）**：规划中心门户 + 四专题图 + 人视模拟（DEM+影像纹理）+ 当季看板。
- **Phase 2（下一步，纯静态可做）**：photos.json + 缩略图层 + 微信请求卡；events.json + 站内倒计时；
  各图加「事件」徽标（调水调沙/桃花汛/天鹅抵达日期表）。
- **Phase 3（服务化）**：Service Worker 本地通知 → FCM Web Push → 短信生命周期；成片请求工单化。
- **Phase 4（生态）**：EXIF 自动 ingest 管线常态化；订阅者成片回流构建「同机位四季库」。

## 四、合规注意
短信与推送必须用户主动订阅并可随时退订；航拍点位仅作提示，飞行须依属地空域与保护区规定报备；
实拍图入库需摄影师授权（credit 字段 + status=on_request 双轨）。
