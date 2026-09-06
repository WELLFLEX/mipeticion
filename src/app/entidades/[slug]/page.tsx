import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ENTIDADES, getEntidad } from '@/lib/entidades';
import { FilingGuide } from '@/components/entities/FilingGuide';
export const revalidate = 86400;
export function generateStaticParams() {
  return ENTIDADES.map((e) => ({ slug: e.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const e = getEntidad((await params).slug);
  return { title: e ? e.nombreCorto + ' — guía y canales' : 'Entidad no encontrada' };
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const entity = getEntidad((await params).slug);
  if (!entity) notFound();
  return (
    <div className="container page narrow">
      <p className="breadcrumb">
        <Link href="/entidades">Entidades</Link> / {entity.nombreCorto}
      </p>
      <span className="badge">Entidad nacional · Guía ciudadana</span>
      <h1 className="page-title" style={{ marginTop: 18 }}>
        {entity.nombreCorto}
      </h1>
      <p className="page-intro">{entity.nombre}</p>
      <div className="panel">
        <h2>Antes de escribir una petición</h2>
        <p className="muted">{entity.tramiteDirecto.descripcion}</p>
        <a className="text-link" target="_blank" rel="noreferrer" href={entity.tramiteDirecto.url}>
          Consultar servicios de la entidad ↗
        </a>
      </div>
      <div className="panel">
        <h2>¿Qué necesitas?</h2>
        <div className="stack" style={{ marginTop: 22 }}>
          {entity.rutas.map((r) => (
            <div key={r.id}>
              <h3 style={{ fontWeight: 650 }}>{r.titulo}</h3>
              <p className="muted" style={{ fontSize: 14 }}>
                {r.orientacion}
              </p>
              <Link className="text-link" href={`/crear?entidad=${entity.slug}&ruta=${r.id}`}>
                Preparar esta solicitud →
              </Link>
            </div>
          ))}
        </div>
      </div>
      <section id="radicar" className="panel">
        <h2>Cómo radicar tu solicitud</h2>
        <FilingGuide entity={entity} />
      </section>
    </div>
  );
}
