import { publicConfig } from '@/lib/server/config';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Privacidad y tratamiento de datos' };
export default function Page() {
  const config = publicConfig();
  return (
    <div className="container page narrow">
      <p className="eyebrow">Tú decides qué guardar</p>
      <h1>Privacidad, en palabras claras</h1>
      <p className="lead">
        Vigente desde el 6 de septiembre de 2026. MiPetición es una iniciativa independiente, sin
        afiliación gubernamental.
      </p>
      <div className="stack prose-content">
        <section className="panel">
          <h2>Responsable y contacto</h2>
          {config.operator && config.privacyEmail ? (
            <>
              <p>
                Responsable del tratamiento: <strong>{config.operator}</strong>.
              </p>
              <p>
                Para consultar, corregir o solicitar la supresión de tus datos, escribe a{' '}
                <a className="text-link" href={'mailto:' + config.privacyEmail}>
                  {config.privacyEmail}
                </a>
                .
              </p>
            </>
          ) : (
            <p className="notice warning">
              Esta instalación todavía no tiene un responsable y un contacto de privacidad
              configurados. El almacenamiento con cuenta está deshabilitado. El operador debe
              completar esta información antes del piloto público.
            </p>
          )}
        </section>
        <section className="panel">
          <h2>Mientras preparas tu petición</h2>
          <p>
            Tu borrador se conserva en esta pestaña mediante almacenamiento de sesión. Si eliges
            «Recordarlo en este dispositivo», también se guarda en el navegador por hasta siete días
            sin editar. La aplicación descarta borradores vencidos al abrirse; un dispositivo
            apagado no puede borrarlos automáticamente. Puedes borrarlo desde el formulario.
          </p>
          <p>
            El nombre, documento, ciudad y dirección de notificación se incorporan al borrador en tu
            navegador. No incluimos esos campos en las solicitudes a la IA. El relato puede contener
            datos personales que tú hayas escrito: evita incluir información sensible o de otras
            personas.
          </p>
        </section>
        <section className="panel">
          <h2>Para qué usamos los datos</h2>
          <p>
            Usamos el relato y tus solicitudes para organizar el borrador, y los datos de
            identificación para completar el documento. Al descargar el PDF, el servidor recibe
            temporalmente el documento completo para convertirlo; la aplicación no lo conserva ni
            registra su contenido en logs.
          </p>
          <p>
            La plantilla sin IA no envía contenido a un proveedor de IA. Si autorizas ayuda de IA,
            Anthropic procesa el relato y la solicitud. Sus condiciones de retención y tratamiento
            también aplican; MiPetición no puede prometer eliminación instantánea en sistemas de un
            proveedor.
          </p>
          <a
            className="text-link"
            href="https://privacy.anthropic.com/"
            target="_blank"
            rel="noreferrer"
          >
            Privacidad de Anthropic ↗
          </a>
        </section>
        <section className="panel">
          <h2>Si eliges una cuenta</h2>
          <p>
            Supabase gestiona la autenticación por correo y almacena las solicitudes que
            expresamente elijas guardar. Se conservan el documento, el radicado y las novedades que
            registres. Resend transporta los correos de acceso y los avisos cuando está configurado
            como servicio de correo. Vercel aloja la aplicación en la configuración de producción
            prevista. Estos proveedores pueden procesar datos fuera de Colombia.
          </p>
          <p>
            Los recordatorios son opcionales y genéricos: no incluyen el relato, la entidad ni el
            radicado. Los avisos sobre eliminación de datos forman parte de la conservación de tu
            cuenta.
          </p>
          <p>
            Las solicitudes inactivas se eliminan después de 12 meses, con aviso de al menos 30
            días. Si el aviso no pudo enviarse, la eliminación se aplaza hasta cumplir ese plazo.
            Registrar una novedad renueva la actividad. Puedes exportar y eliminar una solicitud o
            tu cuenta desde «Mis solicitudes».
          </p>
          <p>
            La eliminación retira los registros de la base activa. Las copias de seguridad del
            proveedor caducan según la retención configurada; no se usan para atención ordinaria. La
            política operativa exige revisar esa configuración antes del lanzamiento.
          </p>
        </section>
        <section className="panel">
          <h2>Seguridad y medición</h2>
          <p>
            El equipo mantiene controles de acceso por persona. Los colaboradores comunitarios no
            tienen acceso a casos privados. No vendemos datos ni incluimos publicidad o seguimiento
            comercial.
          </p>
          <p>
            Para controlar costos y abuso conservamos contadores, identificadores técnicos
            derivados, versiones, uso de tokens, latencia y resultados de operaciones; nunca el
            contenido de las peticiones en los registros de uso de IA. Los registros técnicos de
            generación se eliminan después de 90 días. Las estadísticas públicas suprimen grupos de
            menos de diez y redondean a decenas.
          </p>
        </section>
        <section className="panel">
          <h2>Tus derechos</h2>
          <p>
            Puedes conocer, actualizar y rectificar los datos, solicitar prueba de la autorización,
            revocarla o pedir la supresión cuando corresponda. Usa el contacto del responsable o los
            controles de exportación y eliminación de tu cuenta. También puedes presentar una queja
            ante la Superintendencia de Industria y Comercio después de agotar el trámite que
            corresponda con el responsable.
          </p>
          <p>
            El tratamiento se enmarca en la Ley 1581 de 2012 y las instrucciones aplicables de la
            SIC, incluida su orientación sobre IA. No uses el servicio para compartir información de
            otra persona sin autorización.
          </p>
          <a
            className="text-link"
            href="https://sedeelectronica.sic.gov.co/transparencia/normativa/circular-externa-2-de-2024-de-la-superintendencia-de-industria-y-comercio-lineamientos-sobre-el-tratamiento-de-datos"
            target="_blank"
            rel="noreferrer"
          >
            Orientación de la SIC sobre IA ↗
          </a>
        </section>
      </div>
    </div>
  );
}
