import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin'], display: 'swap' });
export const metadata: Metadata = {
  title: { default: 'MiPetición — Tu petición, paso a paso', template: '%s — MiPetición' },
  description:
    'Prepara tu solicitud, encuentra dónde enviarla y haz seguimiento. Una herramienta ciudadana gratuita para Colombia.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO" className={geist.variable}>
      <body style={{ fontFamily: 'var(--font-geist-sans), Arial, sans-serif' }}>
        <SiteHeader />
        <main id="contenido" tabIndex={-1} style={{ minHeight: '60vh' }}>
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
