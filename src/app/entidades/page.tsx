import { Directory } from '@/components/entities/Directory';
export const metadata = { title: 'Buscar una entidad' };
export default function Page() {
  return (
    <div className="container page">
      <p className="eyebrow">Directorio ciudadano</p>
      <h1 className="page-title" style={{ marginTop: 16 }}>
        Encuentra a quién dirigirte.
      </h1>
      <p className="page-intro">
        Cinco entidades, canales oficiales y una guía para cada paso. La cobertura irá creciendo con
        las aportaciones de la comunidad.
      </p>
      <Directory />
    </div>
  );
}
