$ErrorActionPreference = "Continue"

$log = Join-Path $env:TEMP "recordly-phone-camera-firewall-fixed-script.log"
"Starting Recordly phone camera firewall fix at $(Get-Date -Format o)" | Out-File -LiteralPath $log -Encoding UTF8

try {
  Set-NetConnectionProfile -InterfaceAlias "WLAN" -NetworkCategory Private -ErrorAction Stop
  "Set WLAN profile to Private" | Add-Content -LiteralPath $log -Encoding UTF8
} catch {
  "Set-NetConnectionProfile failed: $($_.Exception.Message)" | Add-Content -LiteralPath $log -Encoding UTF8
}

& netsh advfirewall firewall delete rule "name=Recordly Phone Camera Current Port" 2>&1 | Add-Content -LiteralPath $log -Encoding UTF8
& netsh advfirewall firewall delete rule "name=Recordly Phone Camera TCP Ports" 2>&1 | Add-Content -LiteralPath $log -Encoding UTF8
& netsh advfirewall firewall add rule "name=Recordly Phone Camera Current Port" dir=in action=allow protocol=TCP localport=23534 profile=private enable=yes 2>&1 | Add-Content -LiteralPath $log -Encoding UTF8
& netsh advfirewall firewall add rule "name=Recordly Phone Camera TCP Ports" dir=in action=allow protocol=TCP localport=20000-26000 profile=private enable=yes 2>&1 | Add-Content -LiteralPath $log -Encoding UTF8

"Finished at $(Get-Date -Format o)" | Add-Content -LiteralPath $log -Encoding UTF8
