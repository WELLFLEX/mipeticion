import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { ENTIDADES } from '@/lib/entidades';
export default function Home() {
  return (
    <>
      <div className="container">
        <section className="hero">
          <div>
            <p className="eyebrow">Una herramienta ciudadana para Colombia</p>
            <h1>
              Tu voz cuenta.
              <br />
              Tu petición,
              <br />
              <span>paso a paso.</span>
            </h1>
            <p className="hero-copy">
              Te ayudamos a preparar tu solicitud, encontrar dónde enviarla y hacer seguimiento. En
              tus palabras, sin enredos.
            </p>
            <div className="hero-actions">
              <Link className="button" href="/crear">
                Crear mi petición <Icon size={18} />
              </Link>
              <Link className="button secondary" href="/entidades">
                Buscar una entidad
              </Link>
            </div>
            <div className="hero-assurance">
              <span>
                <Icon name="check" size={14} /> Gratis para la ciudadanía
              </span>
              <span>
                <Icon name="check" size={14} /> Sin cuenta para empezar
              </span>
            </div>
          </div>
          <div className="hero-art" aria-label="Ejemplo ilustrativo de una petición organizada">
            <div className="paper-demo">
              <div className="demo-top">
                <Icon name="document" size={27} />
                <span>MI PETICIÓN</span>
              </div>
              <h2>
                Una solicitud clara.
                <br />
                Un siguiente paso.
              </h2>
              <p>
                Tus hechos, tus preguntas y lo que necesitas.
                <br />
                Todo en un mismo lugar.
              </p>
              <div className="demo-lines" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className="demo-bottom">
                <Icon name="check" size={15} /> Lista para que la revises
              </div>
            </div>
            <div className="floating-note">
              <Icon name="shield" size={27} />
              <div>
                <strong>Tú tienes el control</strong>
                <p>Revisa, edita y envía cuando estés listo.</p>
              </div>
            </div>
            <p className="art-caption">Ejemplo ilustrativo. Descargar no significa radicar.</p>
          </div>
        </section>
        <div className="trust-strip">
          <p>Empezamos con 5 entidades</p>
          <div className="entity-names">
            {ENTIDADES.map((e) => (
              <Link key={e.slug} href={'/entidades/' + e.slug}>
                {e.nombreCorto}
              </Link>
            ))}
          </div>
        </div>
        <section className="section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Empecemos por lo que necesitas</p>
              <h2 style={{ marginTop: 14 }}>¿En qué te podemos ayudar?</h2>
              <p>No necesitas conocer el nombre del trámite ni escribir como un abogado.</p>
            </div>
            <Link href="/guias" className="text-link">
              Conoce tus opciones <Icon size={17} />
            </Link>
          </div>
          <div className="cards">
            {[
              {
                icon: 'document' as const,
                title: 'Pedir información o copias',
                text: 'Solicita un documento, una certificación o información que necesitas conocer.',
                path: 'informacion',
              },
              {
                icon: 'clock' as const,
                title: 'Saber cómo va tu trámite',
                text: 'Pregunta por el estado de una solicitud que ya presentaste ante una entidad.',
                path: 'estado',
              },
              {
                icon: 'people' as const,
                title: 'Reportar un problema de atención',
                text: 'Cuenta lo que pasó y pide una respuesta sobre la atención que recibiste.',
                path: 'atencion',
              },
            ].map((c) => (
              <article className="card" key={c.path}>
                <div className="card-icon">
                  <Icon name={c.icon} size={23} />
                </div>
                <h3>{c.title}</h3>
                <p>{c.text}</p>
                <Link className="text-link" href={'/crear?ruta=' + c.path}>
                  Empezar <Icon size={17} />
                </Link>
              </article>
            ))}
          </div>
        </section>
      </div>
      <section className="steps-section">
        <div className="container section">
          <p className="eyebrow">Del “no sé por dónde empezar” al siguiente paso</p>
          <div className="section-heading" style={{ marginTop: 14 }}>
            <h2>Más claridad. Menos vueltas.</h2>
          </div>
          <div className="steps">
            {[
              [
                '01',
                'Cuéntanos qué pasó',
                'Escribe como hablas. Te ayudamos a organizar lo importante.',
              ],
              [
                '02',
                'Prepara tu petición',
                'Confirma la entidad y revisa un borrador que puedes editar.',
              ],
              [
                '03',
                'Envíala por el canal oficial',
                'Te mostramos dónde radicarla y qué debes tener a mano.',
              ],
              [
                '04',
                'Lleva el seguimiento',
                'Guarda el radicado y registra lo que sucede con tu solicitud.',
              ],
            ].map(([n, t, d]) => (
              <div key={n}>
                <div className="step-number">PASO {n}</div>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="container section community">
        <div>
          <p className="eyebrow">Hecho para la gente. Abierto a todos.</p>
          <h2>
            Un proyecto que crece
            <br />
            con la comunidad.
          </h2>
          <p>
            El código y las guías son abiertos. Puedes ayudarnos a verificar una entidad, mejorar la
            experiencia o hacer que esta herramienta llegue a más personas.
          </p>
          <Link href="/contribuir" className="text-link" style={{ marginTop: 18 }}>
            Quiero contribuir <Icon size={18} />
          </Link>
        </div>
        <div className="community-note">
          <p>
            La información de las entidades es pública.
            <br />
            Tu petición es privada.
          </p>
          <Link href="/privacidad" className="text-link" style={{ marginTop: 14 }}>
            Cómo cuidamos tus datos <Icon name="shield" size={17} />
          </Link>
        </div>
      </section>
    </>
  );
}
