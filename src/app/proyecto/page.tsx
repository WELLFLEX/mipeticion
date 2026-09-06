import Link from 'next/link';
export const metadata = { title: 'Un proyecto abierto para la ciudadanía' };
export default function Page() {
  return (
    <div className="container page narrow">
      <p className="eyebrow">Hecho para ayudar</p>
      <h1>Que pedir una respuesta sea más sencillo.</h1>
      <p className="lead">
        MiPetición es un proyecto comunitario independiente. Creemos que entender dónde ir y cómo
        explicar una necesidad debe estar al alcance de cualquier persona.
      </p>
      <div className="stack prose-content">
        <section className="panel">
          <h2>Empezamos con un alcance concreto</h2>
          <p>
            DIAN, Colpensiones, Prosperidad Social, ICETEX y SENA. Tres caminos por entidad:
            información y copias, estado de trámites y atención administrativa.
          </p>
          <p>
            La preparación es gratuita, con o sin IA. Tú revisas y radicas el documento. No
            representamos a entidades públicas ni ofrecemos determinaciones legales.
          </p>
        </section>
        <section className="panel">
          <h2>Un piloto que aprende de las personas</h2>
          <p>
            La primera etapa prevé hasta 50 participantes. Antes de ampliar el servicio, necesitamos
            comprobar que las personas pueden preparar un borrador útil y encontrar dónde enviarlo.
          </p>
          <p>
            El código, las fuentes del directorio y los avances se revisan en público. Los casos
            privados nunca se comparten con colaboradores. Las estadísticas públicas agrupan al
            menos diez registros y redondean a decenas.
          </p>
          <a className="text-link" href="/api/impact">
            Consultar cifras agregadas disponibles →
          </a>
        </section>
        <section className="panel">
          <h2>Crezcamos con cuidado</h2>
          <p>
            La prioridad es mantener correctas las instrucciones y respetar la privacidad. Las
            siguientes entidades y funciones se elegirán según la demanda y la capacidad de
            mantenimiento.
          </p>
          <div className="row">
            <Link href="/contribuir" className="button">
              Quiero contribuir
            </Link>
            <a href="https://github.com/WELLFLEX/mipeticion" className="button secondary">
              Ver el repositorio
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
