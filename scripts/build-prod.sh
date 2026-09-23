#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

# Asegurar JAVA_HOME para Gradle (Arch Linux no lo exporta automáticamente)
if [ -z "${JAVA_HOME:-}" ]; then
  for CAND in /usr/lib/jvm/default /usr/lib/jvm/java-21-openjdk /usr/lib/jvm/java-17-openjdk /usr/lib/jvm/java-11-openjdk; do
    if [ -x "$CAND/bin/java" ]; then
      export JAVA_HOME="$CAND"
      break
    fi
  done
fi
if [ -z "${JAVA_HOME:-}" ] || [ ! -x "${JAVA_HOME:-}/bin/java" ]; then
  echo "❌ No se encontró un JDK. Instala uno (ej: sudo pacman -S jdk21-openjdk) y define JAVA_HOME." >&2
  exit 1
fi
echo "☕ JAVA_HOME=$JAVA_HOME ($("$JAVA_HOME/bin/java" -version 2>&1 | head -1))"

# Asegurar ANDROID_HOME (Android SDK) para Gradle
if [ -z "${ANDROID_HOME:-}" ] || [ ! -d "$ANDROID_HOME/platforms" ]; then
  for CAND in "$HOME/Android/Sdk" "$HOME/android-sdk" /opt/android-sdk /usr/lib/android-sdk; do
    if [ -d "$CAND/platforms" ]; then
      export ANDROID_HOME="$CAND"
      break
    fi
  done
fi
if [ -z "${ANDROID_HOME:-}" ] || [ ! -d "$ANDROID_HOME/platforms" ]; then
  echo "❌ No se encontró el Android SDK. Instálalo (sdkmanager) y define ANDROID_HOME." >&2
  exit 1
fi
echo "🤖 ANDROID_HOME=$ANDROID_HOME (plataformas: $(ls "$ANDROID_HOME/platforms" | tr '\n' ' '))"

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

# Alinear el versionName del APK con la versión de package.json (changelog
# in-app y versión de la app alineadas).
APK_VERSION=$(node -p "require('./package.json').version")
BUILD_GRADLE="$DIR/android/app/build.gradle"
if [ -f "$BUILD_GRADLE" ]; then
  sed -i "s/versionName \"[^\"]*\"/versionName \"${APK_VERSION}\"/" "$BUILD_GRADLE"
  echo "🎯 versionName del APK fijado a: $APK_VERSION"
fi

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
