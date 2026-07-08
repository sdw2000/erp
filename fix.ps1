$path = "E:\vue\ERP\src\router\index.js"
$content = Get-Content -Path $path -Raw
$old = "      },`n      {`n      }`n      },`n      {"
$new = "      },`n      {"
if ($content -match [regex]::Escape($old)) {
    $content = $content -replace [regex]::Escape($old), $new
    Set-Content -Path $path -Value $content -NoNewline
    Write-Host "Fixed!"
} else {
    Write-Host "Pattern not found, trying CRLF..."
    $old2 = "      },`r`n      {`r`n      }`r`n      },`r`n      {"
    if ($content -match [regex]::Escape($old2)) {
        $content = $content -replace [regex]::Escape($old2), $new
        Set-Content -Path $path -Value $content -NoNewline
        Write-Host "Fixed with CRLF!"
    } else {
        Write-Host "Still not found"
    }
}
