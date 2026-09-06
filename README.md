# MiPetición

**Tu petición, paso a paso.** Servicio comunitario independiente y gratuito para preparar una solicitud, encontrar el canal oficial y registrar su seguimiento.

El piloto cubre DIAN, Colpensiones, Prosperidad Social, ICETEX y SENA. Cada entidad ofrece tres rutas: información/copias, estado de un trámite y problemas de atención administrativa. La persona confirma la entidad, revisa el documento y lo radica directamente. Descargar un PDF nunca equivale a radicar.

## Desarrollo local

Node.js 22 y npm. No necesitas credenciales pagas.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Abre http://localhost:3000. Sin servicios configurados funciona la plantilla, el directorio, la edición y el PDF. Las cuentas se muestran como no disponibles. No cambies a una base de producción para probar con datos sintéticos.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Las pruebas de base de datos ejecutan las migraciones completas sobre Postgres embebido (PGlite), con roles y RLS. No requieren Docker. La suite de navegador usa un servidor de desarrollo local; configura `PLAYWRIGHT_BASE_URL` si ya tienes uno. El conjunto de rutas contiene 100 casos sintéticos; no equivale a una evaluación con personas reales ni a una evaluación del modelo en producción.

## Arquitectura

Una aplicación Next.js con:

- Directorio JSON validado con Zod y guías públicas cacheadas.
- Análisis determinístico local y ayuda opcional de Anthropic con consentimiento, salida restringida, tiempo máximo y presupuesto compartido.
- Identificación añadida en el navegador; ninguna propiedad de identificación forma parte de los contratos de IA.
- Supabase Auth con código por correo, Postgres con RLS, APIs que verifican la identidad y RPCs exclusivas del servidor.
- Cola duradera de recordatorios y eliminación por inactividad, reservas atómicas de correo/IA y correos genéricos.
- Plantilla de respaldo explícita, exportación PDF/texto, JSON privado y controles de eliminación.

Los borradores invitados usan sessionStorage. Guardarlos en el dispositivo requiere consentimiento y caducan a los siete días sin editar. Solo una acción expresa guarda un documento en una cuenta. No hay radicación automática, tutelas, representación ni determinaciones legales.

## Datos públicos y mantenimiento

`GET /api/entidades/v1` publica el directorio reutilizable. Los archivos revisados están en `data/catalog`; el snapshot DANE está en `data/geography`. Las importaciones escriben candidatos en `data/staging`, nunca publican cambios automáticamente.

```sh
npm run data:registry
npm run data:geography
npm run data:check
```

Consulta [fuentes y revisión](docs/DATA.md), [licencias de datos](DATA_LICENSE.md) y [reglas de fechas](docs/DATE_FIXTURES.md).

## Preparar el piloto

[OPERATIONS.md](docs/OPERATIONS.md) explica Supabase, SMTP, cron, límites, privacidad y recuperación. [RELEASE.md](docs/RELEASE.md) separa las comprobaciones automatizadas de las validaciones que necesitan un entorno configurado o participantes.

No habilites cuentas sin identificar al responsable y verificar su contacto. `info@mipeticion.co` es el contacto propuesto en el ejemplo, no un buzón cuya operación haya sido confirmada por el repositorio.

## Contribuir / Contributing

Buscamos ayuda en desarrollo, diseño, accesibilidad y verificación de guías. Lee [CONTRIBUTING.md](CONTRIBUTING.md), el [código de conducta](CODE_OF_CONDUCT.md) y [SECURITY.md](SECURITY.md). Usa exclusivamente ejemplos sintéticos en pruebas e issues.

English: MiPetición is an independent Colombian civic service. It helps people prepare, submit through official channels, and privately track administrative requests. See the bilingual contributing guide. Local template development needs no paid credentials.

Código: [Apache-2.0](LICENSE). Datos: licencias y atribuciones separadas en [DATA_LICENSE.md](DATA_LICENSE.md). El proyecto no tiene afiliación gubernamental.
