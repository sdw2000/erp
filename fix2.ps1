$path = "E:\vue\ERP\src\router\index.js"
$lines = Get-Content -Path $path
Write-Host "Before fix (lines 372-382):"
for ($i = 371; $i -lt [Math]::Min(382, $lines.Count); $i++) {
    Write-Host "$($i+1): $($lines[$i])"
}

# Line 373 (0-based: 372) should be "      }" -> "      },"
$lines[372] = "      },"

$lines | Set-Content -Path $path
Write-Host ""
Write-Host "After fix:"
$lines2 = Get-Content -Path $path
for ($i = 371; $i -lt [Math]::Min(382, $lines2.Count); $i++) {
    Write-Host "$($i+1): $($lines2[$i])"
}
