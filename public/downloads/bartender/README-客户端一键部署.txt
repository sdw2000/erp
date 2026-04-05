客户端一键部署（PS1 推荐版）

【最终成功配置（2026-03-26 验证）】
请在“管理员 PowerShell”执行以下单行命令：
$base='http://<服务器IP>:8080'; $tmp=Join-Path $env:TEMP 'mes-bt-bootstrap.ps1'; $wc=New-Object System.Net.WebClient; try { $wc.DownloadFile($base + '/downloads/bartender/bootstrap-install.ps1', $tmp) } finally { $wc.Dispose() }; powershell -NoProfile -ExecutionPolicy Bypass -File $tmp -BaseUrl $base

成功判定以安装末尾显示 `Gateway health check: OK` 为准。
说明：若安装中出现 `Manifest endpoint requires auth ... skip template auto-sync` 或 `Optional file download skipped`，属于可预期提示，不影响网关启动与打印。

当前模式：服务端集中管理 + 客户端最小配置
- 模板与脚本由服务端统一下发
- 客户端安装时会自动尝试模板同步
- 同步成功后会自动把模板本地路径回写到 config.json（formatPath）
- 每次在线安装默认执行“清残留重建”（旧目录/旧任务自动清理后重装）
- 已内置 watchdog 守护（登录后自动启动，网关异常会自动拉起）
- 正常情况下无需手工改脚本

方式A（推荐，在线安装）：
1) 在 ERP【基本资料 -> 打印配置】点击“复制在线安装命令”。
2) 在客户端电脑“管理员 PowerShell”粘贴执行（单行脚本）。
3) 脚本会下载并执行 bootstrap-install.ps1，然后自动部署网关。

方式A-0（推荐单行，避免粘贴换行问题）：
$base='http://<服务器IP>:8080'; $tmp=Join-Path $env:TEMP 'mes-bt-bootstrap.ps1'; $wc=New-Object System.Net.WebClient; try { $wc.DownloadFile($base + '/downloads/bartender/bootstrap-install.ps1', $tmp) } finally { $wc.Dispose() }; powershell -NoProfile -ExecutionPolicy Bypass -File $tmp -BaseUrl $base

方式A-1（最稳妥，手工下载再执行）：
1) 浏览器打开并下载：
   http://<服务器IP>:8080/downloads/bartender/bootstrap-install.ps1
2) 管理员 PowerShell 执行：
   powershell -NoProfile -ExecutionPolicy Bypass -File .\bootstrap-install.ps1 -BaseUrl http://<服务器IP>:8080

方式B（离线/手工）：
1) 下载本目录脚本到同一文件夹（至少包含 bootstrap-install.ps1、client-oneclick-setup.ps1、start-gateway.ps1）。
2) 管理员 PowerShell 执行：
   powershell -NoProfile -ExecutionPolicy Bypass -File .\client-oneclick-setup.ps1

Win7（PowerShell 2.0）建议：
- 优先使用方式A在线安装命令（已做 PS2 兼容）。
- 如缺少运行环境，先执行 win7-env-oneclick.ps1 补环境（KB3191566 可选）。

完成后：
- 网关地址使用：http://127.0.0.1:9123
- 在 ERP 打印配置中通常只需确认网关地址；模板优先走服务端同步
- 客户端需安装 BarTender 和本机打印机
- 若已开启模板同步，通常无需逐个手填 formatPath；系统会按 templateKey 自动关联本地模板文件
- 客户端守护进程会定时检查 /health，离线时自动重启网关并保持在线

如历史配置反复失败（推荐手工覆盖“最新通用配置”）：
1) 下载并打开：config.latest.generic.json
2) 按本机实际情况修改 3 项：
   - barTenderExe（bartend.exe 实际路径）
   - templates 下每个 printer（改成“刷新打印机”看到的名称）
   - templates 下 each formatPath（确认 coating.btw / rolling.btw 的实际绝对路径）
3) 将文件保存为：
   C:\Users\<Windows用户名>\AppData\Local\MES-BarTender-Gateway\config.json
4) 重新启动网关（重新执行 client-oneclick-setup.ps1，或重登系统触发自启动任务）
5) 浏览器验证：http://127.0.0.1:9123/health
   再在 ERP 页面点“读取本机配置/刷新打印机”

注意：
- 浏览器不能静默执行本机脚本，这是系统安全限制
- 不再推荐 CMD 方式，统一使用 PowerShell 脚本
