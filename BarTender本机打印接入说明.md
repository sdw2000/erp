# BarTender 本机打印接入说明（涂布报工）

## 最终一键配置（已验证可用）

请在客户端“管理员 PowerShell”执行以下单行命令（不要拆行，不要再套一层 `-Command`）：

```powershell
$base='http://192.168.0.138:8080'; $tmp=Join-Path $env:TEMP 'mes-bt-bootstrap.ps1'; $wc=New-Object System.Net.WebClient; try { $wc.DownloadFile($base + '/downloads/bartender/bootstrap-install.ps1', $tmp) } finally { $wc.Dispose() }; powershell -NoProfile -ExecutionPolicy Bypass -File $tmp -BaseUrl $base
```

安装成功验收标准：
- 安装输出包含：`Gateway health check: OK`
- 访问：`http://127.0.0.1:9123/health` 返回 200
- 计划任务：`MES-BarTender-Gateway` 已注册（登录触发）

安装中以下提示可忽略（不影响打印）：
- `Optional file download skipped ...`
- `Manifest endpoint requires auth ... skip template auto-sync ...`

> 若需要模板同步（manifest 受鉴权保护），请在登录 ERP 后由页面侧触发同步，或手工在本机更新模板路径。

## 0. 我代你配置：你只要提供这 8 项

请直接把下面 8 项发我（可复制本段回填）：

1) BarTender 版本（例如 2022 R8）
2) 操作系统（Windows 10/11）
3) 标签打印机名称（Windows“打印机和扫描仪”里的完整名称）
4) 入库单打印机名称（可与标签机相同）
5) 标签模板 `.btw` 完整路径（例：`D:\BarTender\Templates\COATING_ROLL_LABEL.btw`）
6) 入库单模板 `.btw` 完整路径（例：`D:\BarTender\Templates\COATING_INBOUND_SHEET.btw`）
7) 你本机监听地址（默认 `http://127.0.0.1:9123/print`，如改了请给实际地址）
8) 是否启用接口密钥（若启用，请给 `apiKey`）

### 回填模板（复制后直接改值）

```json
{
  "barTenderVersion": "",
  "os": "Windows 11",
  "labelPrinter": "",
  "inboundPrinter": "",
  "rollLabelTemplatePath": "",
  "inboundSheetTemplatePath": "",
  "endpoint": "http://127.0.0.1:9123/print",
  "apiKey": ""
}
```

---

## 0.1 你给完数据后，我会替你做什么

- 给你一份可直接导入的 Integration Builder 配置步骤（按你版本对应菜单）
- 给你最终浏览器配置（`localStorage` 一键命令）
- 给你 2 条“自检请求”用于验证标签/入库单是否真正从 BarTender 出纸
- 若你模板字段名和我默认不一致，我会按你模板字段重新生成映射表

## 0.2 当前你已确认的数据（可直接用）

已确认：

- BarTender：`10.1 SR3 (Build 2954), Enterprise Automation`
- 操作系统：`Windows 10 LTSC x64`
- 打印机：`Gprinter GP-1324D`
- 模板文件：`D:\360MoveData\Users\Administrator\Desktop\brandfile\coating.btw`

可直接先用这份配置（标签打印）：

```json
{
  "barTenderVersion": "10.1 SR3 (Build 2954), Enterprise Automation",
  "os": "Windows 10 LTSC x64",
  "labelPrinter": "Gprinter GP-1324D",
  "inboundPrinter": "Gprinter GP-1324D",
  "rollLabelTemplatePath": "D:\\360MoveData\\Users\\Administrator\\Desktop\\brandfile\\coating.btw",
  "inboundSheetTemplatePath": "",
  "endpoint": "http://127.0.0.1:9123/print",
  "apiKey": ""
}
```

> 说明：你当前只有一个模板文件，先用于“打印标签”。“打印入库单”先保持浏览器打印（前端已内置失败回退）。

## 0.3 我已帮你代建（无需你手工在 Integration Builder 新建）

我已在项目里生成本机网关脚本与配置：

- [tools/bartender/config.json](tools/bartender/config.json)
- [tools/bartender/start-gateway.ps1](tools/bartender/start-gateway.ps1)

### 启动方法（PowerShell）

1) 进入目录并启动：

```powershell
cd e:\vue\ERP\tools\bartender
powershell -ExecutionPolicy Bypass -File .\start-gateway.ps1
```

2) 看到这行表示成功：
- `BarTender 网关已启动: http://127.0.0.1:9123/`

3) 健康检查（新开一个 PowerShell）：

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:9123/health -Method Get
```

返回 `ok=true` 即可。

### 标签打印测试（可直接复制）

```powershell
$body = @{
  template = 'COATING_ROLL_LABEL'
  copies = 1
  data = @{
    rollCode = 'TEST-260311-A01'
    widthMm = 500
    lengthM = 4000
    areaM2 = 2000
    scheduleId = 30
    operator = '管理员-A班'
    printTime = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
  }
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Uri http://127.0.0.1:9123/print -Method Post -ContentType 'application/json' -Body $body
```

若返回 `code=200`，并且 `Gprinter GP-1324D` 出纸，说明联通完成。

## 1. 已完成的前端对接

涂布报工页面的以下按钮已支持优先调用本机 BarTender：
- 打印标签（母卷标签）
- 打印入库单（涂布母卷明细）

代码位置：
- `src/views/production/components/ProductionTasks.vue`
- 关键方法：`callBarTenderPrint`、`printRollLabel`、`printCoatingInboundSheet`

当前默认会向本机地址发起 POST 请求：
- `http://127.0.0.1:9123/print`

如果本机 BarTender 服务不可用，会自动回退到浏览器打印。

---

## 2. 你需要在本机做的事（一次性）

> 浏览器不能直接启动本机 EXE，所以需要一个“本机打印监听服务”（推荐用 BarTender Integration Builder 的 HTTP 接口）。

### 步骤 A：在 BarTender Designer 建两个模板

1) 模板1：母卷标签（建议名：`COATING_ROLL_LABEL`）
- 字段建议（命名数据源）：
  - `rollCode`
  - `materialCode`
  - `materialName`
  - `widthMm`
  - `lengthM`
  - `areaM2`
  - `scheduleId`
  - `operator`
  - `printTime`

2) 模板2：涂布入库单（建议名：`COATING_INBOUND_SHEET`）
- 表头字段：
  - `scheduleId`
  - `operator`
  - `startTime`
  - `endTime`
  - `totalAreaM2`
  - `printTime`
- 明细行字段（列表）：
  - `rows[].seq`
  - `rows[].rollCode`
  - `rows[].widthMm`
  - `rows[].lengthM`
  - `rows[].areaM2`

> 建议：条码内容使用 `rollCode`，二维码可放 `scheduleId + rollCode`。

### 步骤 B：在 Integration Builder 建 HTTP 接口

1. 新建 Integration，添加 HTTP Listener，监听：
- `http://127.0.0.1:9123/print`

2. 接收 JSON，并根据 `template` 字段路由到对应 .btw：
- `COATING_ROLL_LABEL` -> 母卷标签模板
- `COATING_INBOUND_SHEET` -> 涂布入库单模板

3. 字段映射：
- 将 JSON 的 `data` 下字段映射到模板命名数据源。

4. 启动 Integration Service 并保持常驻。

---

## 3. 前端可配置项（本机）

页面支持从浏览器 `localStorage` 读取配置键：`MES_BARTENDER_CONFIG`

示例（浏览器控制台执行一次）：

```js
localStorage.setItem('MES_BARTENDER_CONFIG', JSON.stringify({
  enabled: true,
  endpoint: 'http://127.0.0.1:9123/print',
  apiKey: '',
  templateRollLabel: 'COATING_ROLL_LABEL',
  templateInboundSheet: 'COATING_INBOUND_SHEET',
  timeoutMs: 8000
}))
```

设置后刷新页面即可生效。

---

## 4. 前端发送的数据结构

### 4.1 打印标签

```json
{
  "template": "COATING_ROLL_LABEL",
  "jobName": "ROLL_LABEL_2603111A01",
  "copies": 1,
  "data": {
    "rollCode": "2603111A01",
    "materialCode": "1011-R02-1204-G01-0300",
    "materialName": "16μm翠绿PET胶带",
    "widthMm": 500,
    "lengthM": 4000,
    "areaM2": 2000,
    "scheduleId": 30,
    "operator": "管理员-A班",
    "printTime": "2026-03-11 13:27"
  }
}
```

### 4.2 打印入库单

```json
{
  "template": "COATING_INBOUND_SHEET",
  "jobName": "COATING_INBOUND_30",
  "copies": 1,
  "data": {
    "scheduleId": 30,
    "operator": "管理员-A班",
    "startTime": "2026-03-11 13:27",
    "endTime": "2026-03-11 13:27",
    "totalAreaM2": 2000,
    "rows": [
      { "seq": 1, "rollCode": "2603111A01", "widthMm": 500, "lengthM": 4000, "areaM2": 2000 }
    ],
    "printTime": "2026-03-11 13:27"
  }
}
```

---

## 5. 常见问题

1) 点击打印没有反应
- 检查本机 `http://127.0.0.1:9123/print` 是否可访问
- 检查 Integration Service 是否启动

2) 提示“BarTender打印失败，已回退浏览器打印”
- 说明前端已自动降级；请检查接口 URL、模板名、字段映射

3) 字段打印为空
- 大多是模板命名数据源名称与 JSON 字段不一致

---

## 6. 推荐模板规范

- 标签模板纸张：80x50mm（按你实际标签纸调整）
- 入库单模板：A4 横向
- 字体：中文用微软雅黑/思源黑体
- 条码：Code128（`rollCode`）
- 二维码：QR（`scheduleId + '-' + rollCode`）

## 7. 你这张标签模板的“位置 -> 字段”直接对照

按你当前模板（图二）建议直接这样绑：

- 左上【母卷号】 -> `母卷号`（或 `rollCode`）
- 左中【数量】 -> `数量`（固定会传 `1`）
- 左中【规格】 -> `规格`（示例：`500mm × 4000m`）
- 左下【物料代码】 -> `物料代码`（或 `materialCode`）
- 左下【物料名称】 -> `物料名称`（或 `materialName`）
- 左下【日期】 -> `日期`（或 `printDate`）
- 右上二维码 -> `二维码`（或 `qrText`，当前默认等于母卷号）

> 已在前端加好以上字段；没有值的字段会先传空字符串，不会报错。
