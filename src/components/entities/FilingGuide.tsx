import Link from 'next/link';
import { fuenteDesactualizada, type Entidad } from '@/lib/entidades';
import { Icon } from '@/components/Icon';
export function FilingGuide({ entity }: { entity: Entidad }) {
  return (
    <div className="stack">
      <div className="notice">
        <strong>El envío lo haces tú.</strong> Descargar o guardar en MiPetición no radica tu
        solicitud. La entidad debe entregarte una constancia o número de radicado.
      </div>
      <ol
        className="stack"
        style={{ listStyle: 'decimal', paddingLeft: 22, fontSize: 14, lineHeight: 1.8 }}
      >
        <li>
          <strong>Revisa tu documento.</strong> Comprueba los hechos, lo que solicitas y tus datos
          de notificación.
        </li>
        <li>
          <strong>Abre el canal oficial.</strong> Sigue las instrucciones de la entidad y elige el
          tipo que corresponde a tu solicitud.
        </li>
        <li>
          <strong>Completa el formulario.</strong> Copia el texto o adjunta el PDF si el canal lo
          permite. Revisa allí los formatos, tamaños y requisitos actuales.
        </li>
        <li>
          <strong>Envía y guarda la constancia.</strong> Conserva el radicado y la fecha de
          recepción que informa la entidad.
        </li>
      </ol>
      <div className="row">
        {entity.canales.map((c, i) => (
          <a
            key={c.nombre}
            className={i === 0 ? 'button' : 'text-link'}
            href={c.url}
            target="_blank"
            rel="noreferrer"
          >
            {c.nombre}
            <Icon name="external" size={16} />
          </a>
        ))}
      </div>
      <p className="field-help">
        Los enlaces abren una pestaña nueva. Si el formulario no funciona, consulta los puntos de
        atención y alternativas en el portal oficial.
      </p>
      <div className="source-list">
        {entity.fuentes.map((f) => (
          <p key={f.id}>
            <a href={f.url} target="_blank" rel="noreferrer" className="text-link">
              {f.titulo} ↗
            </a>
            <br />
            Revisión documental: {f.verificadoEl}. {f.alcance}
            {fuenteDesactualizada(f.verificadoEl) && (
              <span className="notice warning" style={{ display: 'block', marginTop: 8 }}>
                Esta guía requiere una nueva revisión. Confirma los requisitos en el portal oficial
                antes de enviar.
              </span>
            )}
          </p>
        ))}
      </div>
      <Link className="text-link" href="/mis-solicitudes">
        Ya radiqué: llevar mi seguimiento <Icon name="clock" size={17} />
      </Link>
    </div>
  );
}
