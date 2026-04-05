模板同步脚本（sync-templates.ps1）说明

用途：
- 从服务器拉取模板 manifest
- 对比本地缓存版本/哈希
- 仅下载变更模板
- 校验 sha256 后原子替换

一、最小接口约定
1) GET manifest，例如：
   http://192.168.0.138:8080/api/print-template/manifest

2) manifest 返回支持两种：
   A. 数组直接返回
   B. 对象 { code, data: [...] }

每条记录字段：
- templateKey (必填)
- version (建议)
- sha256 (建议)
- downloadUrl (必填)
- fileName (可选，不传默认 templateKey.btw)

默认后端实现（本次已提供）：
- GET /api/print-template/manifest
- GET /api/print-template/file/{fileName}

服务端模板目录：
- 优先环境变量 MES_TEMPLATE_ROOT
- 其次 JVM 参数 mes.template.root
- 否则默认为：{MES启动目录}/print-templates

二、执行示例
powershell -ExecutionPolicy Bypass -File .\sync-templates.ps1 `
  -ManifestUrl "http://192.168.0.138:8080/api/print-template/manifest" `
  -TemplateDir "D:\MES\BarTender\templates" `
  -LocalManifestPath "D:\MES\BarTender\template-manifest.local.json"

三、可选鉴权参数
-ApiKey "xxx"
-AuthToken "token"

四、推荐运行方式
- 开机/登录后先执行一次同步
- 每天定时同步一次
- 打印时只读本地模板路径

已内置自动同步：
- 最新一键安装会注册 startup-with-sync.ps1 为登录启动脚本
- 登录后会先尝试同步模板，再启动网关

如果不执行同步，可能影响：
- 继续使用旧模板打印（字段布局、条码规则仍是旧版）
- 新增模板键在本地不存在，打印会报模板未配置/文件不存在
