param(
  [string]$Message = ""
)

$ErrorActionPreference = "Stop"

Write-Host "==> 1. Pemeriksaan Keamanan & Filter File (Pre-flight)..." -ForegroundColor Cyan

$statusLines = git status --porcelain
$forbiddenPattern = '(^|[/\\])(\.env(\..+)?|\.pem|\.key|\.p12|\.pfx|\.sql|\.sqlite|\.db|Maskot)$|service-account|credentials|client_secret|gdrive-token|\.pem$|\.key$|\.sql$'
$maxFileBytes = 5MB

foreach ($line in $statusLines) {
  if ([string]::IsNullOrWhiteSpace($line)) { continue }
  $pathPart = $line.Substring(3).Trim().Trim('"')
  if ($pathPart -match ' -> ') {
    $pathPart = ($pathPart -split ' -> ')[1].Trim('"')
  }
  if ($pathPart -match '\.env\.example$') { continue }

  if ($pathPart -match $forbiddenPattern) {
    Write-Host "DIBATALKAN: Terdeteksi file sensitif/terlarang yang tidak boleh masuk Git: $pathPart" -ForegroundColor Red
    exit 1
  }

  if (Test-Path $pathPart -PathType Leaf) {
    $size = (Get-Item $pathPart).Length
    if ($size -gt $maxFileBytes) {
      $sizeMb = [math]::Round($size / 1MB, 2)
      Write-Host "DIBATALKAN: File terlalu besar ($sizeMb MB > 5 MB): $pathPart" -ForegroundColor Red
      exit 1
    }
  }
}

# Scan diff untuk deteksi kunci rahasia / token yang tidak sengaja tertulis di kode
$diffContent = git diff
$secretPatterns = @(
  '-----BEGIN (RSA |EC |OPENSSH |PRIVATE )?KEY-----',
  'AIza[0-9A-Za-z_-]{35}',
  'ghp_[0-9A-Za-z]{36}',
  'sk-[0-9A-Za-z]{24,}'
)
foreach ($pat in $secretPatterns) {
  if ($diffContent -match $pat) {
    Write-Host "DIBATALKAN: Terdeteksi pola kunci rahasia / API token di dalam perubahan kode!" -ForegroundColor Red
    exit 1
  }
}

Write-Host "==> 2. Menjalankan Unit Test..." -ForegroundColor Cyan
npm test
if ($LASTEXITCODE -ne 0) {
  Write-Host "Unit test gagal! Push dibatalkan." -ForegroundColor Red
  exit 1
}

Write-Host "==> 3. Menjalankan Production Build..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
  Write-Host "Build gagal! Push dibatalkan." -ForegroundColor Red
  exit 1
}

if ($statusLines) {
  if ([string]::IsNullOrWhiteSpace($Message)) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
    $Message = "chore: update aplikasi ($timestamp)"
  }
  Write-Host "==> 4. Staging file aman & Commit: $Message" -ForegroundColor Cyan
  git add -u
  foreach ($safeDir in @("src", "server", "public", "scripts", "tests", "index.html", "package.json", ".gitignore")) {
    if (Test-Path $safeDir) {
      git add $safeDir
    }
  }

  $staged = git diff --cached --name-only
  if (-not $staged) {
    Write-Host "Tidak ada file aman yang siap di-commit." -ForegroundColor Yellow
  } else {
    Write-Host "Daftar file yang akan di-push:" -ForegroundColor DarkCyan
    $staged | ForEach-Object { Write-Host "  + $_" -ForegroundColor Gray }
    git commit -m "$Message"
  }
} else {
  Write-Host "==> 4. Tidak ada perubahan baru untuk di-commit." -ForegroundColor Yellow
}

Write-Host "==> 5. Push ke origin main..." -ForegroundColor Cyan
git push origin main
if ($LASTEXITCODE -ne 0) {
  Write-Host "Git push gagal!" -ForegroundColor Red
  exit 1
}

Write-Host "Selesai! Semua perubahan aman & sudah di-push ke origin/main." -ForegroundColor Green
