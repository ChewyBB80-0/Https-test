param(
    [string]$BaseUrl = 'https://your-site.example',
    [string]$SearchTerm = 'synthetic traffic',
    [string]$TaskName = 'SyntheticWebTraffic'
)

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$scriptPath = Join-Path $repoRoot 'synthetic-transaction-playwright.js'

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host 'Installing Node.js LTS...'
    winget install --id OpenJS.NodeJS.LTS --source winget --accept-source-agreements --accept-package-agreements --silent
    $env:Path = [System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path', 'User')
}

Write-Host 'Installing app dependencies...'
& npm install --prefix $repoRoot
if ($LASTEXITCODE -ne 0) { throw 'npm install failed' }

Write-Host 'Installing Playwright Chromium...'
& npx playwright install chromium --prefix $repoRoot
if ($LASTEXITCODE -ne 0) { throw 'Playwright install failed' }

$command = @"
`$env:BASE_URL = '$BaseUrl'
`$env:SEARCH_TERM = '$SearchTerm'
node '$scriptPath'
"@

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -Command \"$command\""
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration ([TimeSpan]::MaxValue)
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingToSleep -StartWhenAvailable

$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null

Write-Host "Scheduled task '$TaskName' created. It will run every 5 minutes."
Write-Host "Repo root: $repoRoot"
Write-Host "Script path: $scriptPath"
