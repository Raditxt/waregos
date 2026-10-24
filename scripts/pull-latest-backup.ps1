$repo = "Raditxt/waregos"
$dest = "D:\Waregos-Backup\cloud"
New-Item -ItemType Directory -Force $dest | Out-Null

$runs = gh run list --repo $repo --workflow db-backup.yml --status success --limit 1 --json databaseId,createdAt | ConvertFrom-Json
if (-not $runs) { throw "Tidak ada run backup yang sukses." }
$run = $runs[0]

$ageHours = ((Get-Date).ToUniversalTime() - ([datetime]$run.createdAt).ToUniversalTime()).TotalHours
if ($ageHours -gt 36) { Write-Warning ("Backup terbaru berumur {0:N0} jam (> 36 jam). Periksa GitHub Actions." -f $ageHours) }

$target = Join-Path $dest $run.databaseId
if (Test-Path $target) { Write-Host "Run $($run.databaseId) sudah ada."; return }
gh run download $run.databaseId --repo $repo -D $target
Get-ChildItem $dest -Recurse -Filter *.age | Sort-Object LastWriteTime -Descending | Select-Object -First 3 Name, Length, LastWriteTime | Format-Table
