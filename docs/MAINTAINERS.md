# Revisión y mantenimiento

Equipo inicial pequeño: el propietario del repositorio y mantenedores explícitamente invitados. No se conceden accesos a producción por contribuir código.

Antes de abrir el piloto, configura protección de la rama principal: PR obligatorio, al menos una aprobación, checks de CI, cierre de conversaciones y bloqueo de force-push. CODEOWNERS propone al propietario; confirma sus permisos en GitHub. Este archivo no configura protecciones por sí mismo.

Pide una segunda revisión para destinos oficiales, reglas de fechas, permisos, autenticación, retención, presupuestos y correo. Nadie debe validar sus propios cambios de RLS sin ejecutar la prueba con otra identidad.

Revisión semanal: resultado del chequeo de fuentes, CI, errores sin contenido privado, costos, cuotas de correo y cola fallida. Revisión mensual: cada guía piloto, fuentes, dependencias, modelo y precios configurados, contacto de privacidad y demanda para ampliar.

No aceptar: datos privados en issues, fundamentos inventados por IA, un envío de prueba a una entidad real, exposición de service-role, catálogos sin fuente o un cambio de alcance especializado sin revisión adecuada.

Los secretos viven en variables del proveedor. Usa dos mantenedores para recuperación operativa cuando sea posible. Configura un canal privado para seguridad y un contacto para incidentes comunitarios antes de invitar participantes.
