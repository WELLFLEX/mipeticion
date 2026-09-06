import Link from 'next/link';
import { Icon } from './Icon';
export function SiteHeader() {
  return (
    <header className="site-header">
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <div className="container header-inner">
        <Link href="/" className="brand" aria-label="MiPetición, inicio">
          <span className="brand-symbol">
            <Icon name="document" size={23} />
          </span>
          MiPetición
          <span className="badge" style={{ marginLeft: 3 }}>
            Beta
          </span>
        </Link>
        <nav className="nav" aria-label="Navegación principal">
          <Link href="/entidades">Buscar una entidad</Link>
          <Link href="/mis-solicitudes">Mis solicitudes</Link>
          <Link className="button small" href="/crear">
            Crear una petición <Icon size={16} />
          </Link>
        </nav>
      </div>
    </header>
  );
}
