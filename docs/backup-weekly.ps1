# Weekly Backup ke External Drive
# Jalankan setiap Senin pagi

$backupDir = "D:\Waregos-Backup"
$externalDir = "E:\Waregos-Backup-External" # Ganti E: dengan drive eksternal kamu

Write-Host "🔄 Weekly backup started..." -ForegroundColor Cyan

# Buat folder di external drive kalau belum ada
if (!(Test-Path $externalDir)) {
    New-Item -ItemType Directory -Force -Path $externalDir | Out-Null
}

# Copy semua backup ke external
$date = Get-Date -Format "yyyy-MM-dd"
$weeklyFile = "$externalDir\waregos_weekly_$date.sql"

# Buat backup fresh
$env:PGPASSWORD = "123456"
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" `
    -U postgres -d tokoqu_db -f $weeklyFile
Remove-Item Env:PGPASSWORD

if (Test-Path $weeklyFile) {
    Write-Host "✅ Weekly backup saved: $weeklyFile" -ForegroundColor Green
} else {
    Write-Host "❌ Weekly backup FAILED!" -ForegroundColor Red
}

# Hapus backup external lebih dari 4 minggu
Get-ChildItem "$externalDir\waregos_weekly_*.sql" |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-28) } |
    Remove-Item

Write-Host "✅ Weekly backup complete!" -ForegroundColor Green