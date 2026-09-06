import { CrearFlow } from '@/components/crear/CrearFlow';
import { getEntidad } from '@/lib/entidades';
import { rutaIdSchema } from '@/lib/entidades/types';
export const metadata = { title: 'Crear una petición', robots: { index: false, follow: true } };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = await searchParams;
  const e = typeof p.entidad === 'string' ? getEntidad(p.entidad) : undefined;
  const r = rutaIdSchema.safeParse(p.ruta);
  return (
    <div className="container page narrow">
      <p className="eyebrow">Un paso a la vez</p>
      <h1 className="page-title" style={{ marginTop: 16 }}>
        Preparemos tu petición.
      </h1>
      <p className="page-intro">
        Cuéntanos qué necesitas. Te acompañamos hasta encontrar el canal donde enviarla.
      </p>
      <CrearFlow initialEntity={e?.slug} initialPathway={r.success ? r.data : 'informacion'} />
    </div>
  );
}
