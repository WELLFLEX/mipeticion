# Operar el piloto

## Entorno y responsabilidad

Esta implementación no crea proyectos cloud ni envía correos desde el entorno de desarrollo. Necesita un proyecto Supabase dedicado a MiPetición. No apliques las migraciones a proyectos de otras aplicaciones.

1. Define el nombre real del responsable del tratamiento, verifica el buzón de privacidad y completa `PRIVACY_OPERATOR` y `PRIVACY_EMAIL`. El ejemplo propone info@mipeticion.co; no certifica que el buzón esté activo.
2. Revisa proveedores, región, contratos, transferencias internacionales y retención de backups para que el aviso público describa la instalación real. La página declara la arquitectura prevista: Vercel, Supabase, Anthropic y Resend.
3. Configura `APP_URL` con el origen HTTPS de producción y dos secretos aleatorios independientes para `RATE_LIMIT_SECRET` y `CRON_SECRET`.
4. Mantén `TRACKING_ENABLED=false` hasta completar y probar autenticación, eliminación, aviso de caducidad y correo. Las claves son del servidor; nunca NEXT_PUBLIC ni incluidas en el repositorio.

## Supabase

Usa un proyecto dedicado. Guarda una copia de seguridad y revisa el diff antes de aplicar cambios. Las migraciones son aditivas y mantienen registros anteriores, filings y events.

```sh
npx supabase link --project-ref <referencia-confirmada-de-mipeticion>
npx supabase db push --dry-run
npx supabase db push
```

Configura URL, publishable key y service-role en el hosting. No expongas el esquema `private` a PostgREST. Las RPC de cuotas, presupuesto, guardado y jobs tienen EXECUTE solo para service_role y usan SECURITY INVOKER. Los clientes autenticados solo tienen SELECT con RLS; las escrituras pasan por APIs con getUser, validación, comprobación de origen y verificación de propiedad.

En Auth, configura el Site URL, desactiva proveedores no usados y habilita acceso por email. Configura SMTP de Resend con dominio remitente verificado. Reemplaza la plantilla de Magic Link por un código, por ejemplo:

```html
<h2>Tu código de MiPetición</h2>
<p>Usa este código para entrar:</p>
<p>{{ .Token }}</p>
<p>Si no lo solicitaste, puedes ignorar este correo.</p>
```

La aplicación verifica el OTP con tipo `email`. Prueba códigos incorrectos, vencidos, reenvío, cierre de sesión y recuperación. La inscripción de perfiles se serializa y tiene un máximo de 50 participantes. El proveedor Auth tiene sus propios límites: configura también sus límites de envío, CAPTCHA/protecciones disponibles y cuotas SMTP; las llamadas directas al endpoint público de Auth no pasan por los contadores de la aplicación.

Usuarios autenticados sin perfil inscrito no pueden guardar casos. Revisa y elimina altas de Auth no inscritas por abuso o piloto lleno con el panel, sin exportar contenido privado. Las cuentas inactivas sin casos se conservan hasta que la persona solicite eliminar su cuenta; la caducidad automática de 12 meses aplica a solicitudes guardadas.

## Hosting, AI y presupuesto

Producción usa una sola aplicación y un asiento de hosting. Presupuesto objetivo antes de impuestos: Vercel Pro ~US$20, Supabase Pro ~US$25, Anthropic como máximo US$25 y remanente para impuestos/uso inesperado. Revalida [Vercel](https://vercel.com/pricing), [Supabase](https://supabase.com/pricing), [Resend](https://resend.com/pricing) y el precio del modelo antes de contratar. Activa límites y avisos de gasto del proveedor.

Sin clave/modelo/precios válidos/reserva compartida, la ayuda de IA devuelve una plantilla rotulada. Configura un modelo disponible y sus precios vigentes por millón de tokens; no hay un ID de modelo inventado como valor por defecto. Las reservas previas a cada llamada cubren un máximo conservador de 32.000 tokens de entrada y 3.000 de salida (700 para análisis). La llamada no se reintenta automáticamente. Las respuestas desconocidas conservan la reserva completa.

Los montos en la base son microdólares (1 USD = 1.000.000). El límite mensual se aplica con UPDATE condicional atómico; no puede configurarse por encima de 25 USD desde la aplicación. El proveedor puede facturar condiciones no cubiertas si cambias modelo, herramienta o precios: actualiza la reserva y los tests al cambiar la integración.

El modo de desarrollo sin credenciales usa cuotas locales solo para operaciones gratuitas. En producción, la base compartida es necesaria para los límites de generación y PDF, incluso si no habilitas cuentas. Ante falla del contador, los endpoints limitados rechazan llamadas en lugar de arriesgar gasto ilimitado. Directorio, texto ya generado y edición siguen disponibles.

## Recordatorios y retención

`vercel.json` llama cada hora a `GET /api/jobs`. Vercel adjunta `Authorization: Bearer CRON_SECRET`; una llamada no autenticada devuelve 401. Configura RESEND_API_KEY y MAIL_FROM. No llames manualmente al worker de producción como una prueba: puede enviar avisos reales.

La cola Postgres:

- Tiene claves únicas por caso, tipo y versión de actividad.
- Reclama hasta cinco jobs con locks SKIP LOCKED, lease de cinco minutos y máximo cinco intentos.
- Usa la misma Idempotency-Key de Resend en cada reintento, con cuerpo estable. Los intentos se detienen antes de 23 horas porque Resend conserva claves 24 horas.
- Revalida la versión del caso y la preferencia antes de enviar. Un cambio de estado, eliminación o desactivación cancela jobs pendientes.
- Reserva atómicamente hasta 100 correos/día y 3.000/mes en la aplicación, con máximo 20 avisos/día para dejar capacidad de acceso. También limita los envíos en el proveedor, que puede recibir llamadas de Auth fuera de la aplicación.
- Solo incluye mensajes genéricos y un enlace a «Mis solicitudes». No registra correos ni cuerpos en logs.

No prometemos entrega exactamente una vez: el proveedor puede aceptar un envío durante una desconexión. El ID estable cubre reintentos dentro de su ventana. No cambies APP_URL, MAIL_FROM ni plantillas mientras haya reintentos de menos de 23 horas: Resend exige el mismo cuerpo. No reprogrames con una clave nueva un envío ambiguo sin verificar primero su resultado en el proveedor.

A los 11 meses de inactividad se agenda el aviso de caducidad. La eliminación requiere al menos 12 meses de inactividad y 30 días desde el aviso aceptado por el proveedor. Si el aviso falla, no se borra silenciosamente el caso. Registrar una novedad reinicia la actividad. Borrar cuenta o solicitud hace cascade de eventos, filings y jobs; revisa por separado el calendario de caducidad de backups.

Monitorea errores 503 del worker, jobs fallidos, saldo de cuotas y latencia sin capturar contenido. Un job que agota intentos necesita revisión operativa. Antes de reprocesarlo, confirma entrega con el proveedor; si fue aceptado, no lo reenvíes. Nunca desactives RLS para solucionar una incidencia.

## Métricas y crecimiento

Los contadores internos registran borradores de plantilla/IA/respaldo, radicaciones y respuestas informadas; las reservas registran modelo, versiones, tokens, latencia y éxito. `/api/impact` muestra totales mensuales con grupos de al menos diez y redondeo a decenas. No hay analítica de terceros ni almacenamiento de relatos para evaluar modelos.

Calcula costo por borrador completado a partir de los microdólares consumidos y los contadores de generación, señalando que las reservas de resultado desconocido sobreestiman el costo. La razón entre radicaciones registradas y borradores es un indicador parcial, no una tasa de éxito representativa: guardar y reportar son opcionales.

Evalúa errores de ruta con el corpus sintético y feedback voluntario sin datos personales. Revisa frescura de fuentes semanalmente y sus instrucciones mensualmente. No expandas cupos, entidades o presupuesto sin revisar demanda, correo disponible y capacidad del equipo.
