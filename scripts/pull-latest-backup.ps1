<#
Tarik backup database Waregos terbaru ke laptop (ADR 0007). Windows PowerShell 5.1.

  .\scripts\pull-latest-backup.ps1                  # R2 (default)
  .\scripts\pull-latest-backup.ps1 -Sumber GitHub   # artifact db-backup.yml (Supabase), sampai tahap 7

R2: rclone jalan di container (image di-pin, tidak perlu instal rclone). Kredensial diambil dari
variabel di sesi PowerShell ini, tidak pernah dari file di repo:

  R2_ENDPOINT            https://<account-id>.r2.cloudflarestorage.com
  R2_BUCKET              bucket produksi (drill) atau bucket uji
  R2_ACCESS_KEY_ID       token laptop: Object Read only
  R2_SECRET_ACCESS_KEY

File yang diunduh tetap terenkripsi (.dump.age). Dekripsi dan restore ada di docs/restore-drill.md.
#>
param(
  [ValidateSet('R2', 'GitHub')]
  [string]$Sumber = 'R2',
  [string]$Tujuan = 'D:\Waregos-Backup'
)

# Versi rclone di-pin supaya perilakunya sama di setiap drill.
$RcloneImage = 'rclone/rclone:1.68.2'
# Jadwal backup VPS 6 jam + grace healthchecks 2 jam.
$BatasUmurJamR2 = 8

function Get-GitHubBackup {
  $repo = "Raditxt/waregos"
  $dest = Join-Path $Tujuan 'cloud'
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
}

# Jalankan rclone di container. Rahasia diteruskan sebagai `-e NAMA` tanpa nilai, jadi
# docker mengambilnya dari environment proses ini dan nilainya tidak muncul di baris perintah.
function Invoke-Rclone {
  param([string[]]$Argumen, [string]$Mount)
  $dockerArgs = @('run', '--rm',
    '-e', 'RCLONE_CONFIG_R2_TYPE=s3',
    '-e', 'RCLONE_CONFIG_R2_PROVIDER=Cloudflare',
    '-e', 'RCLONE_CONFIG_R2_REGION=auto',
    '-e', 'RCLONE_CONFIG_R2_ENDPOINT',
    '-e', 'RCLONE_CONFIG_R2_ACCESS_KEY_ID',
    '-e', 'RCLONE_CONFIG_R2_SECRET_ACCESS_KEY')
  if ($Mount) { $dockerArgs += @('-v', "${Mount}:/data") }
  $dockerArgs += $RcloneImage
  $dockerArgs += $Argumen + '-q'
  & docker @dockerArgs
  if ($LASTEXITCODE -ne 0) { throw "rclone gagal (exit $LASTEXITCODE): $($Argumen -join ' ')" }
}

function Get-R2Backup {
  foreach ($v in 'R2_ENDPOINT', 'R2_BUCKET', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY') {
    if (-not [Environment]::GetEnvironmentVariable($v)) { throw "Variabel $v kosong. Isi di sesi ini dulu (lihat docs/restore-drill.md)." }
  }
  docker info --format '{{.ServerVersion}}' *> $null
  if ($LASTEXITCODE -ne 0) { throw "Docker belum jalan. Nyalakan Docker Desktop dulu." }

  $dest = Join-Path $Tujuan 'r2'
  New-Item -ItemType Directory -Force $dest | Out-Null
  $dest = (Resolve-Path $dest).Path

  $env:RCLONE_CONFIG_R2_ENDPOINT = $env:R2_ENDPOINT
  $env:RCLONE_CONFIG_R2_ACCESS_KEY_ID = $env:R2_ACCESS_KEY_ID
  $env:RCLONE_CONFIG_R2_SECRET_ACCESS_KEY = $env:R2_SECRET_ACCESS_KEY
  try {
    # Baris: <ukuran>;<nama>. Nama memuat waktu UTC, jadi urutan nama = urutan waktu.
    $baris = Invoke-Rclone -Argumen @('lsf', '--files-only', '--format', 'sp', "r2:$($env:R2_BUCKET)")
    $pola = '^waregos-(\d{8}-\d{6})Z\.dump\.age$'
    $objek = foreach ($b in $baris) {
      $ukuran, $nama = $b -split ';', 2
      if ($nama -match $pola) { [pscustomobject]@{ Nama = $nama; Ukuran = [long]$ukuran; Waktu = $Matches[1] } }
    }
    if (-not $objek) { throw "Tidak ada file waregos-*.dump.age di bucket." }
    $terbaru = $objek | Sort-Object Nama -Descending | Select-Object -First 1
    Write-Host ("Bucket berisi {0} backup. Terbaru: {1} ({2:N0} byte)" -f @($objek).Count, $terbaru.Nama, $terbaru.Ukuran)

    $waktu = [datetime]::ParseExact($terbaru.Waktu, 'yyyyMMdd-HHmmss', [Globalization.CultureInfo]::InvariantCulture,
      [Globalization.DateTimeStyles]'AssumeUniversal, AdjustToUniversal')
    $umurJam = ((Get-Date).ToUniversalTime() - $waktu).TotalHours
    if ($umurJam -gt $BatasUmurJamR2) {
      Write-Warning ("Backup terbaru berumur {0:N1} jam (> {1} jam). Periksa healthchecks dan timer di VPS." -f $umurJam, $BatasUmurJamR2)
    }

    $target = Join-Path $dest $terbaru.Nama
    if ((Test-Path $target) -and (Get-Item $target).Length -eq $terbaru.Ukuran) {
      Write-Host "Sudah ada: $target"
    } else {
      Invoke-Rclone -Mount $dest -Argumen @('copyto', '--retries', '3', "r2:$($env:R2_BUCKET)/$($terbaru.Nama)", "/data/$($terbaru.Nama)")
      $lokal = (Get-Item $target).Length
      if ($lokal -ne $terbaru.Ukuran) {
        Remove-Item $target
        throw "Ukuran unduhan ($lokal) beda dengan di R2 ($($terbaru.Ukuran)). File dihapus."
      }
      Write-Host "Diunduh: $target"
    }
    Get-Item $target | Select-Object FullName, Length, LastWriteTime | Format-List
  } finally {
    Remove-Item Env:RCLONE_CONFIG_R2_ENDPOINT, Env:RCLONE_CONFIG_R2_ACCESS_KEY_ID, Env:RCLONE_CONFIG_R2_SECRET_ACCESS_KEY -ErrorAction SilentlyContinue
  }
}

if ($Sumber -eq 'GitHub') { Get-GitHubBackup } else { Get-R2Backup }
