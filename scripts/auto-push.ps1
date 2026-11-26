param(
  [string]$Message = ""
)

$ErrorActionPreference = "Stop"

Write-Host "==> 1. Menjalankan Unit Test..." -ForegroundColor Cyan
npm test
if ($LASTEXITCODE -ne 0) {
  Write-Host "Unit test gagal! Push dibatalkan." -ForegroundColor Red
  exit 1
}

Write-Host "==> 2. Menjalankan Production Build..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
  Write-Host "Build gagal! Push dibatalkan." -ForegroundColor Red
  exit 1
}

$status = git status --porcelain
if ($status) {
  if ([string]::IsNullOrWhiteSpace($Message)) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
    $Message = "chore: update aplikasi ($timestamp)"
  }
  Write-Host "==> 3. Commit perubahan: $Message" -ForegroundColor Cyan
  git add -A
  git commit -m "$Message"
} else {
  Write-Host "==> 3. Tidak ada perubahan baru untuk di-commit." -ForegroundColor Yellow
}

Write-Host "==> 4. Push ke origin main..." -ForegroundColor Cyan
git push origin main
if ($LASTEXITCODE -ne 0) {
  Write-Host "Git push gagal!" -ForegroundColor Red
  exit 1
}

Write-Host "Selesai! Semua perubahan sudah di-push ke origin/main." -ForegroundColor Green
