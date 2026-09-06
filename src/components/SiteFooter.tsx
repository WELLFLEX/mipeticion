import Link from 'next/link';
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          <Link href="/" className="brand">
            MiPetición<span style={{ color: '#75936a' }}>.</span>
          </Link>
          <nav aria-label="Información del proyecto" className="footer-links">
            <Link href="/guias">Guías</Link>
            <Link href="/proyecto">El proyecto</Link>
            <Link href="/contribuir">Contribuir</Link>
            <Link href="/privacidad">Privacidad</Link>
            <a href="https://github.com/WELLFLEX/mipeticion" target="_blank" rel="noreferrer">
              GitHub ↗
            </a>
          </nav>
        </div>
        <p className="footer-note">
          Una iniciativa ciudadana, independiente de las entidades públicas. Te ayudamos a preparar
          tu solicitud; tú revisas el contenido y la radicas. La información es orientativa y no
          constituye asesoría legal.
        </p>
      </div>
    </footer>
  );
}
