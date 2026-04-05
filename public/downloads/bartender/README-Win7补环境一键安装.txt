Win7 补环境一键安装说明

适用场景：
- Win7 机器执行 client-oneclick-setup.cmd 失败
- 缺少 .NET / WMF 运行环境

一、准备安装包（放到同目录 packages 文件夹）
1) NDP48-x86-x64-AllOS-CHS.exe（必需）
   或 NDP48-x86-x64-AllOS-ENU.exe（脚本已兼容）
2) Win7AndW2K8R2-KB3191566-x64.msu（可选）
   （若下载后不带 .msu 后缀，脚本也可识别）

目录示例：
win7-env-oneclick.ps1
packages\NDP48-x86-x64-AllOS-ENU.exe
packages\Win7AndW2K8R2-KB3191566-x64.msu

二、执行方式（管理员）
1) 右键 PowerShell -> 以管理员身份运行
2) 执行：
   powershell -ExecutionPolicy Bypass -File .\win7-env-oneclick.ps1

三、执行完成后
- 若提示需要重启，请先重启电脑
- 重启后再执行 client-oneclick-setup.cmd

注意：
- 本脚本不会自动联网下载补丁，只安装你本地 packages 目录中的文件
- 本脚本不会自动升级到 Win10/Win11
- 如果缺少 KB3191566，脚本会跳过 WMF 安装，不影响当前 PS2 兼容版网关运行
