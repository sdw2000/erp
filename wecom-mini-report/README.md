# MES 企业微信报工小程序（MVP）

本目录是一个可直接在微信开发者工具打开的原生小程序骨架，用于手机端快速报工。

## 已实现功能

- 账号登录（复用 MES `/user/login`）
- 提交工序报工（`/schedule/manual/report-work`）
- 查询报工记录（`/schedule/manual/report-work/list`）
- 兼容 `X-Token` / `token` 请求头

## 目录结构

- `app.js` / `app.json` / `app.wxss`
- `utils/`：请求与 token
- `api/`：登录、报工接口
- `pages/login`：登录页
- `pages/report`：报工提交页
- `pages/history`：报工记录查询页

## 使用方式

1. 用微信开发者工具打开目录：
   - `e:/vue/ERP/wecom-mini-report`
2. 修改 `project.config.json` 的 `appid`（企业微信小程序 AppID）。
3. 首次进入登录页，填写后端地址（如 `http://你的MES域名:8090`）。
4. 输入 MES 账号密码登录。
5. 在“工序报工”页面提交数据。

## 企业微信上线前注意

- 小程序后台需配置合法请求域名（不能直接用 localhost）。
- 建议网关统一成 HTTPS 域名（如 `https://mes-api.xxx.com`）。
- 建议后端补充“按当前登录人获取可报工任务列表”接口，减少手输 `scheduleId`。
- 建议接入企业微信 OAuth（`code` 换 token）替代账号密码。

## 当前报工接口参数（已对齐后端）

- `scheduleId` 或 `orderDetailId`（至少一个）
- `processType`：`COATING` / `REWINDING` / `SLITTING`
- `producedQty`
- `startTime` / `endTime`（`yyyy-MM-dd HH:mm:ss`）
- `operator`
- `remark`
- `proceedNextProcess`

## 下一步建议（我可继续帮你做）

- 扫码报工：扫描工单二维码自动带出 `scheduleId`
- 任务看板：我的待报工任务/进行中任务
- 离线暂存：无网缓存，联网后补传
- 工序专用页面：涂布支持母卷号批量录入
- 企业微信免登：OAuth + 组织架构映射用户
