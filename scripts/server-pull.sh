#!/usr/bin/env bash
set -e

echo "==> 1. Mengambil pembaruan dari GitHub (origin main)..."
git pull origin main

echo "==> 2. Sinkronisasi dependensi & build produksi..."
npm ci --omit=dev || npm install --omit=dev
npm run build

if command -v pm2 >/dev/null 2>&1; then
  echo "==> 3. Restart service PM2..."
  pm2 restart all || true
fi

echo "Selesai! Server sudah menggunakan versi terbaru."
