import Link from 'next/link';
export const metadata = { title: 'Guías para hacer tu petición' };
export default function Page() {
  return (
    <div className="container page narrow">
      <p className="eyebrow">Con palabras claras</p>
      <h1>Tu petición, de principio a fin</h1>
      <div className="prose-content stack">
        <section className="panel">
          <h2>1. Explica lo que pasó</h2>
          <p>
            Organiza las fechas, los hechos y lo que necesitas que la entidad haga. Usa solo
            información que conoces. Si no recuerdas una fecha exacta, dilo así.
          </p>
          <p>
            Podemos ayudarte con información o copias, estado de trámites y problemas con la
            atención administrativa de las cinco entidades del piloto.
          </p>
          <Link className="text-link" href="/crear">
            Preparar mi petición →
          </Link>
        </section>
        <section className="panel">
          <h2>2. Revisa el camino oficial</h2>
          <p>
            Algunas necesidades tienen un trámite específico. Consulta primero el portal oficial.
            Una petición general no sustituye un recurso tributario, una solicitud de reconocimiento
            pensional ni otro procedimiento especializado.
          </p>
          <Link className="text-link" href="/entidades">
            Buscar una entidad →
          </Link>
        </section>
        <section className="panel">
          <h2>3. Radica y conserva la constancia</h2>
          <p>
            Descargar el documento no lo envía. Entra al canal oficial desde la guía de la entidad,
            sigue sus instrucciones y guarda el número de radicado y la fecha de recepción. Revisa
            allí los formatos y límites actuales de los anexos.
          </p>
        </section>
        <section className="panel">
          <h2>4. Haz seguimiento</h2>
          <p>
            Consulta el portal oficial usando tu radicado. Si creas una cuenta, puedes registrar la
            recepción, las respuestas y cualquier novedad. El estado en MiPetición describe lo que
            registras; no está conectado al expediente de la entidad.
          </p>
          <p>
            La regla general es de 10 días hábiles para información o documentos y 15 para
            peticiones generales. Una transferencia, ampliación o solicitud incompleta puede cambiar
            el cálculo. Solo mostramos estimaciones en las rutas compatibles y con recepción
            confirmada.
          </p>
          <a
            className="text-link"
            href="https://www1.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=65334"
            target="_blank"
            rel="noreferrer"
          >
            Consultar Ley 1755 de 2015 ↗
          </a>
          <p>
            Si necesitas orientación sobre una respuesta o un posible incumplimiento, consulta a la
            entidad, la Personería de tu municipio o la Defensoría del Pueblo. La ausencia de una
            respuesta registrada aquí no prueba un incumplimiento.
          </p>
          <Link className="text-link" href="/mis-solicitudes">
            Mis solicitudes →
          </Link>
        </section>
        <section className="panel">
          <h2>Si tu caso está fuera del piloto</h2>
          <p>
            No preparamos tutelas, denuncias, recursos ni solicitudes en representación de otras
            personas. Para salud, servicios públicos, decisiones pensionales, tributarias o de
            crédito, busca la orientación especializada en el canal oficial correspondiente.
          </p>
          <a
            className="text-link"
            href="https://www.defensoria.gov.co/"
            target="_blank"
            rel="noreferrer"
          >
            Defensoría del Pueblo ↗
          </a>
        </section>
      </div>
    </div>
  );
}
