# 🚌 Coruña Bus PWA

![Coruña Bus Banner](https://raw.githubusercontent.com/AstroJS/astro/main/assets/astro-logo-light.svg)

> **Tu asistente inteligente para el transporte público en A Coruña.** 

Coruña Bus es una Progressive Web App (PWA) moderna diseñada para ofrecer la mejor experiencia de usuario al consultar tiempos de llegada, planear rutas y realizar el seguimiento de autobuses en tiempo real.

## ✨ Características Principales

- 📍 **Tiempos en Tiempo Real**: Consulta cuánto falta para que llegue tu bus con datos actualizados directamente de iTranvías.
- 🗺️ **Planificador de Rutas Inteligente**: Encuentra la mejor forma de ir de A a B, incluyendo caminatas a paradas cercanas y transbordos.
- 🛰️ **Seguimiento de Autobús (Track Bus)**: Sube a un bus y activa el seguimiento. La app te dirá cuántas paradas faltan y te avisará cuando estés llegando a tu destino.
- ⭐ **Favoritos Personalizados**: Guarda tus paradas y rutas habituales para un acceso instantáneo.
- 🌙 **Diseño Mobile-First**: Una interfaz limpia, rápida y optimizada para su uso en movimiento, con los colores corporativos de la ciudad.
- 📡 **Modo Offline**: Gracias al cacheo inteligente del catálogo, la búsqueda de paradas y líneas funciona incluso sin conexión.
- 🛡️ **Privacidad Total**: Sin anuncios, sin rastreadores y sin necesidad de crear una cuenta.

## 🚀 Tecnologías Utilizadas

- **[Astro](https://astro.build/)**: Framework web para una velocidad máxima.
- **TypeScript**: Robustez y seguridad en el código.
- **Leaflet**: Mapas interactivos para visualización de paradas y rutas.
- **Vanilla CSS**: Estilos personalizados sin frameworks pesados.
- **iTranvías API**: Integración con el sistema oficial de transporte de A Coruña.

## 🛠️ Instalación y Desarrollo

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/tu-usuario/corunabus.git
   cd corunabus
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Iniciar servidor de desarrollo**:
   ```bash
   npm run dev
   ```

4. **Construir para producción**:
   ```bash
   npm run build
   ```

## ☁️ Despliegue en Cloudflare Workers

Este proyecto está optimizado para ejecutarse en el edge de Cloudflare:

1. Conecta tu repositorio de GitHub a **Cloudflare Pages**.
2. Configura el comando de build como `npm run build`.
3. Establece el directorio de salida como `dist`.
4. ¡Listo! Cloudflare se encargará de desplegar cada commit automáticamente.

---

**Aviso Legal:** Coruña Bus es una aplicación independiente de carácter informativo. No tiene relación oficial con la Compañía de Tranvías de La Coruña ni con el Ayuntamiento de A Coruña. Los datos se ofrecen "tal cual" para facilitar la movilidad urbana.

Desarrollado con ❤️ para los ciudadanos de A Coruña.
