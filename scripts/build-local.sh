#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

echo "🔧 Configurando Capacitor para pruebas en Localhost (http://localhost:4321)..."

# Obtener IPs locales para permitir navegación
LOCAL_IPS=$(ip -4 addr show 2>/dev/null | grep "inet " | awk '{print $2}' | cut -d/ -f1 | grep -v "127.0.0.1" | tr '\n' ' ' || echo "")

node -e "
const fs = require('fs');
const file = 'capacitor.config.json';
const cfg = JSON.parse(fs.readFileSync(file, 'utf8'));
cfg.server = cfg.server || {};
cfg.server.url = 'http://localhost:4321';
cfg.server.cleartext = true;
if (!cfg.server.allowNavigation) cfg.server.allowNavigation = [];
const hosts = ['localhost', '10.0.2.2', '127.0.0.1', '*.local', '172.16.*', '192.168.*', '10.*'];
'${LOCAL_IPS}'.trim().split(/\s+/).forEach(ip => { if (ip) hosts.push(ip); });
hosts.forEach(h => {
  if (!cfg.server.allowNavigation.includes(h)) cfg.server.allowNavigation.push(h);
});
fs.writeFileSync(file, JSON.stringify(cfg, null, 2));
"

echo "🔄 Sincronizando con Capacitor Android..."
npm run build
npx cap sync android

echo "📦 Compilando APK de desarrollo..."
cd android
./gradlew assembleDebug
cd ..

# Si hay dispositivo ADB conectado, configurar reverse port forwarding e instalar
if command -v adb >/dev/null 2>&1; then
  DEVICES=$(adb devices | grep -w "device" | awk '{print $1}')
  if [ -n "$DEVICES" ]; then
    for DEV in $DEVICES; do
      echo "📱 Configurando túnel ADB reverse (puerto 4321) en dispositivo $DEV..."
      adb -s "$DEV" reverse tcp:4321 tcp:4321 || true
      echo "📲 Instalando APK en $DEV..."
      adb -s "$DEV" install -r android/app/build/outputs/apk/debug/app-debug.apk
      echo "🚀 Abriendo app en $DEV..."
      adb -s "$DEV" shell am start -n com.corunabus.app/.MainActivity || true
    done
  else
    echo "ℹ️ No se detectó dispositivo Android conectado por ADB."
  fi
fi

echo ""
echo "==============================================================="
# Comprobar si el servidor local ya está levantado
if curl -s -m 2 http://localhost:4321 >/dev/null 2>&1; then
  echo "✅ Servidor local detectado en http://localhost:4321. ¡Todo listo!"
else
  echo "⚠️  EL SERVIDOR DE DESARROLLO NO ESTÁ CORRIENDO TODAVÍA"
  echo "👉  Para que la app cargue, abre OTRA terminal y ejecuta:"
  echo "    npm run dev"
fi
echo "==============================================================="
