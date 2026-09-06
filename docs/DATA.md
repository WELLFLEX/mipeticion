# Fuentes, revisión y publicación

El catálogo es un activo público versionado, independiente de los casos privados. Zod valida su forma al cargarlo; las pruebas comprueban rutas únicas, referencias existentes y dominios oficiales.

| Fuente                                                                                                                                                                | Uso y límites                                                                                                                                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Universo DAFP](https://www.datos.gov.co/resource/h7zv-k39x.json)                                                                                                     | Importación paginada por Socrata de identidades e identificadores. 6.404 registros en la extracción del 6-sep-2026; se publican solo los cinco revisados. Contactos son pistas, no canales verificados. |
| [SIGEP](https://www.funcionpublica.gov.co/VisualSIE/faces/reporte/publico.xhtml?externo=true&idConsulta=Pr&idReporte=61)                                              | Contrastar nombres e identidad en revisión humana. No asumir vigencia de contactos.                                                                                                                     |
| [DANE DIVIPOLA MGN 2024](https://portalgis.dane.gov.co/mparcgis/rest/services/Divipola/Serv_DIVIPOLA_MGN_2024/FeatureServer)                                          | Snapshot de 1.121 unidades territoriales, 33 grupos de departamento/distrito. Los códigos se validan con campos explícitos. No se pide ubicación para las rutas nacionales del piloto.                  |
| [SUIT](https://www.funcionpublica.gov.co/suit/)                                                                                                                       | Revisión manual de procedimientos aplicables. La integración masiva no es dependencia del piloto.                                                                                                       |
| Páginas oficiales de cada entidad                                                                                                                                     | Instrucciones, portales y alternativas. Cada entrada guarda fuente, fecha y alcance de revisión documental. No se ha probado una radicación real.                                                       |
| [Ley 1755](https://www1.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=65334), [SUIN](https://www.suin-juriscol.gov.co/viewDocument.asp?ruta=Leyes%2F30043679) | Reglas y referencias separadas de prompts. Cambiar una regla requiere fixtures y una versión nueva.                                                                                                     |
| [Informes PQR ICETEX](https://web.icetex.gov.co/transparencia/informes-pqrsd)                                                                                         | Futuras prioridades a partir de resultados agregados. No importar casos identificables.                                                                                                                 |

## Flujo de actualización

1. El chequeo semanal consulta enlaces públicos y crea un reporte de disponibilidad/redirección. No modifica fechas de verificación.
2. Mensualmente un mantenedor abre cada guía, revisa los pasos, los requisitos, anexos y alternativas, contrasta el trámite directo y consulta cambios normativos.
3. Las importaciones se guardan en `data/staging`. Revisa los cambios; no pases registros enteros automáticamente al catálogo.
4. Una corrección incluye fuente oficial y evidencia sin datos personales. Otro mantenedor revisa cambios de rutas, reglas o destinos.
5. Incrementa la versión del catálogo y fecha de publicación para cualquier cambio publicado. Actualiza la fecha de cada fuente solo si revisaste sus instrucciones. Conserva el historial en Git.

Las fuentes con más de 30 días de revisión se marcan como desactualizadas. Ante una caída se conserva la versión anterior y se recomienda comprobar el portal oficial. Un HTTP 200 puede ser un login, error o portal cambiado: no equivale a verificación funcional.

Las rutas especializadas tienen orientación y referencias, no una plantilla que prometa resolverlas. La IA solo propone slugs del directorio. En caso ambiguo se pide confirmación y jamás se marca una radicación automáticamente.

## Reutilización

`GET /api/entidades/v1` tiene CORS público, caché y versión en el cuerpo. No contiene cuentas, relatos ni radicados. Conserva licencias y atribución al reutilizarlo. El endpoint de impacto muestra únicamente totales mensuales con umbral y redondeo; no ofrece cortes por entidad/persona.
