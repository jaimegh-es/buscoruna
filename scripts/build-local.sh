#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

echo "🔧 Configurando Capacitor para pruebas en Localhost (http://localhost:4321)..."

# Actualizar capacitor.config.json para apuntar a localhost:4321
node -e '
const fs = require("fs");
const file = "capacitor.config.json";
const cfg = JSON.parse(fs.readFileSync(file, "utf8"));
cfg.server = cfg.server || {};
cfg.server.url = "http://localhost:4321";
cfg.server.cleartext = true;
if (!cfg.server.allowNavigation) cfg.server.allowNavigation = [];
["localhost", "10.0.2.2", "127.0.0.1", "*.local"].forEach(h => {
  if (!cfg.server.allowNavigation.includes(h)) cfg.server.allowNavigation.push(h);
});
fs.writeFileSync(file, JSON.stringify(cfg, null, 2));
'

echo "🔄 Sincronizando con Capacitor Android..."
npm run build
npx cap sync android

echo "📦 Compilando APK de desarrollo para Localhost..."
cd android
./gradlew assembleDebug
cd ..

# Si hay dispositivo ADB conectado, configurar reverse port forwarding e instalar
if command -v adb >/dev/null 2>&1; then
  DEVICE=$(adb devices | grep -w "device" | head -n 1 | awk '{print $1}')
  if [ -n "$DEVICE" ]; then
    echo "📱 Dispositivo ADB detectado ($DEVICE). Mapeando puerto 4321 con adb reverse..."
    adb reverse tcp:4321 tcp:4321 || true
    echo "📲 Instalando APK en el dispositivo..."
    adb install -r android/app/build/outputs/apk/debug/app-debug.apk
    echo "🚀 Abriendo app en el dispositivo..."
    adb shell am start -n com.corunabus.app/.MainActivity || true
  else
    echo "ℹ️ No se detectó dispositivo Android por ADB. El APK se ha generado en:"
    echo "   android/app/build/outputs/apk/debug/app-debug.apk"
  fi
fi

echo "✅ App lista y apuntando a http://localhost:4321!"
echo "💡 Asegúrate de tener 'npm run dev -- --host' ejecutándose en otra terminal."
