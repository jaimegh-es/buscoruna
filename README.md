# Coruña Bus

![Coruña Bus Banner](https://coruñabus.inled.es/logo.png)

> La web que te ayuda a moverte inteligentmente con los buses de A Coruña.

Coruña Bus es una Progressive Web App (PWA) y una app Android nativa diseñada para consultar tiempos de llegada, planear rutas y hacer el seguimiento de los autobuses de A Coruña en tiempo real, con los datos oficiales de iTranvías.

## Funciones

- **Tiempos en tiempo real**: consulta cuánto falta para que llegue tu bus, actualizado directamente con la API de iTranvías.
- **Planificador de rutas**: encuentra la mejor forma de ir de A a B, con tramos a pie hasta las paradas más cercanas y transbordos entre líneas.
- **Seguimiento de autobús (Track Bus)**: sube a un bus y activa el seguimiento. La app te dice cuántas paradas faltan y te avisa cuando estás llegando a tu destino.
- **Avisos de llegada en segundo plano**: elige los minutos de antelación y recibe una notificación cuando tu bus esté a punto de llegar.
- **Notificaciones nativas**: en la app Android se muestran en la bandeja del sistema incluso con la app en segundo plano; en la web, mediante el Service Worker.
- **Paradas cercanas por GPS**: detecta tu ubicación para mostrar las paradas más próximas y calcular los tiempos a pie.
- **Ubicación de casa y lugares**: guarda desde los ajustes tu casa y otros lugares por GPS para fijar de dónde partes.
- **Favoritos**: guarda tus paradas y rutas habituales con nombres personalizados para acceder a ellas al instante.
- **Búsqueda rápida**: busca paradas y líneas, también por número de bus, con el catálogo en caché para funcionar sin conexión.
- **Mapa interactivo**: visualización de paradas y recorridos sobre el mapa (Leaflet), con modo de pantalla completa.
- **Modo offline**: el catálogo de paradas y líneas queda cacheado, por lo que la búsqueda funciona incluso sin internet.
- **Multidioma**: interfaz en español (por defecto) e inglés, configurable desde los ajustes.
- **Actualización integrada**: la app Android se actualiza desde Ajustes y muestra el changelog de cada versión.
- **Privacidad total**: sin anuncios, sin rastreadores y sin necesidad de crear una cuenta.

## Especificaciones y análisis de la API

Para desarrollar esta aplicación se ha analizado de forma exhaustiva la API abierta de iTranvías. Toda la información se encuentra en [/research](/research).

## Tecnologías

- **Astro**: framework web orientado a rendimiento.
- **TypeScript**: robustez y seguridad en el código.
- **Leaflet**: mapas interactivos para visualizar paradas y rutas.
- **CSS**: estilos personalizados sin frameworks pesados.
- **iTranvías API**: integración con el sistema oficial de transporte de A Coruña.
- **Capacitor**: empaquetado de la app para Android.
- **Cloudflare Workers**: despliegue de la web en el edge.

## Instalación y desarrollo

1. Clonar el repositorio y entrar en el directorio:

   ```bash
   git clone <repositorio>/corunabus.git
   cd corunabus
   ```

2. Instalar dependencias:

   ```bash
   npm install
   ```

3. Iniciar el servidor de desarrollo:

   ```bash
   npm run dev
   ```

   La web queda disponible en `http://localhost:4321`.

4. Ejecutar los tests:

   ```bash
   npm test
   ```

5. Verificar tipos y construir:

   ```bash
   npm run astro check
   npm run build
   ```

## Despliegue

### Web (PWA) en Cloudflare Workers

El proyecto se despliega en el worker de Cloudflare llamado `buscoruna`:

```bash
npm run deploy:web
```

Este comando construye la web y la sube con Wrangler. La configuración de despliegue está en `wrangler.toml` y en `dist/server/wrangler.json`, donde se enlaza el namespace de KV `buscoruna-session` (binding `SESSION`) usado por las sesiones de Astro. El dominio de producción es `https://xn--coruabus-g3a.inled.es`.

### App Android (APK)

Con Capacitor se genera el APK de la app; el `server.url` de `capacitor.config.json` decide de dónde carga el contenido la app.

- **APK de producción** (apunta a `https://xn--coruabus-g3a.inled.es`):

  ```bash
  npm run app:prod
  ```

  Compila, sincroniza Android, genera `android/app/build/outputs/apk/debug/app-debug.apk`, lo copia a `~/Descargas/coruna-bus.apk` y, si hay un dispositivo conectado por ADB, lo instala y lo abre.

- **APK de desarrollo** (apunta a `http://localhost:4321`):

  ```bash
  npm run app:local
  ```

  Además configura el túnel ADB reverse del puerto `4321` para probar contra el servidor de desarrollo local.

## Aviso legal

Coruña Bus es una aplicación independiente de carácter informativo. No tiene relación oficial con la Compañía de Tranvías de La Coruña ni con el Ayuntamiento de A Coruña. Los datos se ofrecen "tal cual" para facilitar la movilidad urbana.

Desarrollado para los ciudadanos de A Coruña.

<!-- build counter bump -->