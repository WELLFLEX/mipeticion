# Entrega y aceptación del piloto

## Hitos implementados en el repositorio

1. **Fundación:** navegación, diseño cálido en español, directorio validado, documentación comunitaria y rutas sin dependencia de DIAN como entidad por defecto.
2. **Redacción:** cinco entidades/quince rutas, confirmación y fuentes, relato antes de identificación, análisis opcional de IA, borrador editable, PDF/texto, guías y migración de borradores anteriores.
3. **Seguimiento:** código por email, guardado voluntario, RLS, radicados/eventos, estimaciones, avisos durables, exportación/eliminación y controles atómicos de gasto/capacidad.
4. **Preparación de beta:** cupo máximo de 50, instrumentos de prueba, CI, revisión de fuentes y protocolo de usabilidad. La beta con participantes no se ha ejecutado.

## Verificación automatizada

`npm test` cubre 100 escenarios de ruta, las quince combinaciones de plantilla, fallbacks por IA no disponible/error, identidad excluida de prompts, rechazo de autoridades inventadas, validación de cuerpos, migración y expiración de borradores, fechas, permisos/RLS, presupuesto, cuotas, eventos, leases, reintentos, conservación y supresión de grupos pequeños.

`npm run test:e2e` recorre las quince rutas en un navegador móvil, combina modo plantilla con AI sin credenciales para comprobar el respaldo, edita hechos e identidad, descarga PDF, llega a la guía, comprueba referencias, navegación, teclado, axe, anchos reducidos, zoom, expiración, carga lenta y casos excluidos. No envía peticiones a una entidad.

PGlite ejecuta Postgres real embebido y las migraciones con roles de prueba. No sustituye una revisión del proyecto Supabase desplegado, su API PostgREST ni Auth/SMTP. La prueba de la UI de cuenta usa un contrato simulado; el aislamiento se prueba separadamente en la base.

## Antes de invitar participantes

- Responsable identificado, correo público verificado, aviso ajustado a proveedores/región/backups reales.
- Proyecto MiPetición confirmado, migraciones revisadas/aplicadas y dos cuentas sintéticas que no puedan ver/exportar/mutar casos ajenos por HTTP ni directamente por PostgREST.
- OTP real enviado, vencido e incorrecto; sign-out global y borrado de Auth probados; SMTP y protecciones de Auth configuradas.
- Recordatorio y aviso de caducidad reales dirigidos solo a mantenedores que consientan la prueba; recuperación de un envío ambiguo y expiración del lease comprobadas.
- Modelo real evaluado contra el corpus sintético, sin costo por encima del límite. Exigir ≥95% para soportados y ninguna asignación forzada de casos explícitamente excluidos. El resultado local determinístico no certifica un modelo.
- Verificación manual mensual de pasos, adjuntos y alternativas de cada portal. Las revisiones documentales actuales no equivalen a una radicación real comprobada.
- Lector de pantalla real (VoiceOver/NVDA), teclado, 200% zoom y móvil con personas. Axe no certifica por sí solo WCAG 2.2 AA.
- Habilitar reporte privado de seguridad, contacto de conducta, protecciones de rama, CI y alertas operativas.
- Revisar fuentes normativas y limitaciones de las estimaciones con especial cuidado; sin revisor especialista no ampliar decisiones jurídicas.

## Protocolo de usabilidad

Primero prueba con diez personas de distintas edades y experiencia digital. Obtén consentimiento; usa una situación sintética elegida por la persona, no recopiles documentos reales en notas o grabaciones.

Tareas sin coaching: explicar qué pasó; identificar y confirmar la entidad; preparar un borrador comprensible; corregir un hecho; identificar el canal correcto; explicar si ya fue enviado; registrar un radicado ficticio en el entorno de prueba; encontrar cómo eliminarlo.

Registra solo resultados agregados y barreras: completó/no completó, lugar de abandono, error de ruta, entendió la diferencia entre descargar y radicar, tiempo aproximado y observaciones sin contenido personal.

Criterio: al menos ocho de diez preparan un borrador usable e identifican dónde enviarlo. Corrige fallos, vuelve a probar y luego invita hasta 50 participantes. Ampliar depende de respuesta observada, frescura del directorio, costos y capacidad de atención. No publiques cortes con menos de diez personas.
