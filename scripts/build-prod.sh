#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

echo "🌐 Configurando Capacitor para Producción (https://xn--coruabus-g3a.inled.es)..."

node -e '
const fs = require("fs");
const file = "capacitor.config.json";
const cfg = JSON.parse(fs.readFileSync(file, "utf8"));
cfg.server = cfg.server || {};
cfg.server.url = "https://xn--coruabus-g3a.inled.es";
cfg.server.cleartext = true;
fs.writeFileSync(file, JSON.stringify(cfg, null, 2));
'

echo "🔄 Compilando y sincronizando con Capacitor Android..."
npm run build
npx cap sync android

echo "📦 Compilando APK de Producción..."
cd android
./gradlew assembleDebug
cd ..

cp -f android/app/build/outputs/apk/debug/app-debug.apk /home/jaime/Descargas/coruna-bus.apk || true
echo "📂 APK copiado a /home/jaime/Descargas/coruna-bus.apk"

if command -v adb >/dev/null 2>&1; then
  DEVICE=$(adb devices | grep -w "device" | head -n 1 | awk '{print $1}')
  if [ -n "$DEVICE" ]; then
    echo "📱 Dispositivo ADB detectado ($DEVICE). Instalando APK..."
    adb install -r android/app/build/outputs/apk/debug/app-debug.apk
    echo "🚀 Abriendo app en el dispositivo..."
    adb shell am start -n com.corunabus.app/.MainActivity || true
  fi
fi

echo "✅ App de Producción compilada e instalada correctamente."
